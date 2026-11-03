import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { findUserByResetTokenHash, updateUserPassword } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hashResetToken } from "@/lib/password-reset";
import { PASSWORD_RESET_ENABLED } from "@/lib/features";

const Body = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().max(2048).nullish(),
});

// Tokens are 256-bit and single-use, so brute force isn't realistic — this
// mainly limits bcrypt work and scripted abuse.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Set a new password with a reset token. The token is single-use (cleared on
 * success) and expires after 1 hour. Error messages stay generic so tokens
 * can't be probed for validity beyond the success/failure signal inherent
 * to the flow.
 */
export async function POST(req: Request) {
  if (!PASSWORD_RESET_ENABLED) {
    return NextResponse.json(
      { success: false, error: "Password reset is currently unavailable." },
      { status: 503 }
    );
  }

  try {
    const { token, password, turnstileToken } = Body.parse(await req.json());
    const ip = getClientIp(req);

    const limited = rateLimit(`reset:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "Too many reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter ?? 900) } }
      );
    }

    const human = await verifyTurnstile(turnstileToken, ip);
    if (!human.ok) {
      return NextResponse.json(
        { success: false, error: human.error, fields: { turnstile: human.error } },
        { status: 403 }
      );
    }

    const user = await findUserByResetTokenHash(hashResetToken(token));
    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      new Date(user.passwordResetExpiresAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({
      success: true,
      data: { message: "Password updated — sign in with your new password." },
    });
  } catch (e: any) {
    if (e?.issues) {
      const fields: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = String(issue.path?.[0] ?? "form");
        if (key === "password") fields.password = "Password must be at least 8 characters";
        else if (key === "token") fields.form = "This reset link is invalid or has expired.";
        else fields[key] = "Check this field";
      }
      return NextResponse.json(
        { success: false, error: "Check the highlighted fields", fields },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
