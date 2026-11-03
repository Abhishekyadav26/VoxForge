import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, findByEmail } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";

const Body = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60).optional(),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().max(2048).nullish(),
});

export async function POST(req: Request) {
  try {
    const { email, name, password, turnstileToken } = Body.parse(await req.json());

    // Human check first (fail fast, before the user lookup) so automated
    // enumeration/credential-stuffing can't cheaply probe the endpoint.
    const human = await verifyTurnstile(turnstileToken);
    if (!human.ok) {
      return NextResponse.json(
        { success: false, error: human.error, fields: { turnstile: human.error } },
        { status: 403 }
      );
    }

    const norm = email.toLowerCase();

    const existing = await findByEmail(norm);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email: norm, name, passwordHash });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e: any) {
    // ux-visual C3: map Zod field errors to human per-field messages.
    if (e?.issues) {
      const fields: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = String(issue.path?.[0] ?? "form");
        if (key === "name") fields.name = "Please enter your name";
        else if (key === "email") fields.email = "Enter a valid email address";
        else if (key === "password") fields.password = "Password must be at least 8 characters";
        else fields[key] = "Check this field";
      }
      return NextResponse.json({ success: false, error: "Check the highlighted fields", fields }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}