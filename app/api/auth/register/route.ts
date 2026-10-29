import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, findByEmail } from "@/lib/db";

const Body = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(60).optional(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const { email, name, password } = Body.parse(await req.json());
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
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}