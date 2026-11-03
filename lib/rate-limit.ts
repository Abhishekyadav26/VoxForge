/**
 * Tiny in-memory sliding-window rate limiter for auth endpoints.
 *
 * Scope: this lives in the Node process, so it protects a single instance.
 * Serverless deployments scale out to multiple instances — pair this with a
 * shared store (Upstash/Redis) or an edge/WAF rule for production-grade
 * limits. It still stops the common cases (scripted resets, bcrypt DoS).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/** Best-effort client IP from the usual proxy headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function prune(now: number) {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}

/**
 * Consume one hit for `key`. Returns ok:false with the seconds to wait once
 * the limit is exhausted within the window.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}

/** Wait until at least `ms` has elapsed since `startedAt` (timing-oracle pad). */
export async function padToMinDuration(startedAt: number, ms: number): Promise<void> {
  const remaining = ms - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}
