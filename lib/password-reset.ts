import crypto from "crypto";

/**
 * Password-reset token helpers.
 *
 * Flow: POST /api/auth/forgot-password creates a random token, stores only
 * its SHA-256 hash + 1h expiry on the user row, and emails a link
 * ({NEXTAUTH_URL}/login?reset=<token>). POST /api/auth/reset-password hashes
 * the presented token and compares — the raw token never touches storage.
 *
 * Delivery: Resend HTTP API when RESEND_API_KEY is set (no new dependency,
 * just fetch). Otherwise the link is logged server-side so local dev can
 * complete the flow without a mail provider.
 */

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** 64-char hex token (256 bits) for the URL. */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** SHA-256 hex of the token — what gets stored and compared. */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resetLink(token: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/login?reset=${token}`;
}

/**
 * Deliver the reset link. Returns the link in dev (no mailer configured) so
 * the flow stays testable; in prod with RESEND_API_KEY it sends an email.
 * Never throws — email failure must not reveal whether the account exists
 * (the API always returns the same generic message either way).
 */
export async function deliverResetLink(email: string, token: string): Promise<{ emailed: boolean; devLink?: string }> {
  const link = resetLink(token);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // Never print a live reset token in production logs — it is a
      // credential. Without a mailer, password resets cannot complete.
      console.error(
        "[password-reset] RESEND_API_KEY not set — no reset email was sent. Configure a mailer."
      );
      return { emailed: false };
    }
    console.log(`[password-reset] RESEND_API_KEY not set — dev reset link for ${email}: ${link}`);
    return { emailed: false, devLink: link };
  }
  try {
    const from = process.env.PASSWORD_RESET_FROM ?? "VoxForge <no-reply@voxforge.app>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from,
        to: email,
        subject: "Reset your VoxForge password",
        html: `<p>Someone requested a password reset for your VoxForge account.</p><p><a href="${link}">Reset your password</a> — this link expires in 1 hour and can only be used once.</p><p>If you didn't request this, you can ignore this email.</p>`,
      }),
    });
    if (!res.ok) {
      console.error("[password-reset] resend failed:", res.status, (await res.text()).slice(0, 200));
      return { emailed: false };
    }
    return { emailed: true };
  } catch (e) {
    console.error("[password-reset] resend error:", (e as Error).message);
    return { emailed: false };
  }
}
