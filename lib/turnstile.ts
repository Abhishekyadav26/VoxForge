/**
 * Cloudflare Turnstile server-side verification.
 * Tokens are single-use, 5-min expiry; verified via siteverify.
 * When TURNSTILE_SECRET is unset (local dev), verification is skipped so
 * the app keeps working without keys — production must set both keys.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET;
}

export async function verifyTurnstile(
  token: unknown,
  remoteip?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!turnstileConfigured()) {
    console.warn("[turnstile] TURNSTILE_SECRET not set — skipping verification (dev only)");
    return { ok: true };
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, error: "Human verification is required. Please complete the challenge." };
  }
  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET!,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    const result = await res.json();
    if (!result.success) {
      return { ok: false, error: "Human verification failed. Please try again." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[turnstile] siteverify error:", (e as Error).message);
    return { ok: false, error: "Could not verify you are human. Please try again." };
  }
}
