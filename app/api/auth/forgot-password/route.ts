import { NextResponse } from "next/server";
import { z } from "zod";
import { findByEmail, setPasswordReset } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp, padToMinDuration, rateLimit } from "@/lib/rate-limit";
import {
  generateResetToken,
  hashResetToken,
  deliverResetLink,
  RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset";

const Body = z.object({
  email: z.string().email(),
  turnstileToken: z.string().max(2048).nullish(),
});

// 10 reset requests per IP per 15 minutes. Turnstile is the primary defence;
// this also covers deployments where TURNSTILE_SECRET is accidentally unset.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Request a password reset. Always returns the same generic message whether
 * or not the account exists (no enumeration oracle). When the account exists
 * and has a password, a single-use 1h token is stored (hash only) and a
 * reset link is emailed. In dev without a mailer the link is logged instead;
 * in production a missing mailer returns 503 rather than pretending to send.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const { email, turnstileToken } = Body.parse(await req.json());
    const ip = getClientIp(req);

    const limited = rateLimit(`forgot:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "Too many reset requests. Please try again later." },
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

    // Fail loudly in production when no mailer is configured instead of
    // silently creating a token the user can never receive.
    if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
      console.error("[forgot-password] RESEND_API_KEY is not set — cannot send reset email");
      return NextResponse.json(
        {
          success: false,
          error: "Password reset email is temporarily unavailable. Please contact support.",
        },
        { status: 503 }
      );
    }

    const user = await findByEmail(email.toLowerCase());
    // Only password accounts can reset; OAuth-only accounts have no password
    // (and unknown emails get the same response — no oracle).
    if (user && user.passwordHash) {
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      try {
        await setPasswordReset(user.id, hashResetToken(token), expiresAt);
        await deliverResetLink(user.email, token);
      } catch (e) {
        console.error("[forgot-password] failed:", (e as Error).message);
      }
    }

    // Pad the success path so an existing account (DB write + email send)
    // and an unknown email (no-op) don't differ by response time.
    await padToMinDuration(startedAt, 500);

    return NextResponse.json({
      success: true,
      data: {
        message:
          "If an email/password account exists for that email, a reset link is on its way (valid 1 hour). Signed up with Google? Use “Continue with Google”.",
      },
    });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        {
          success: false,
          error: "Check the highlighted fields",
          fields: { email: "Enter a valid email address" },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
