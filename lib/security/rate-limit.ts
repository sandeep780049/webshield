/**
 * Minimal in-memory fixed-window rate limiter for scan creation endpoints.
 * Vercel may run several instances, so this is a best-effort abuse control in
 * addition to URL validation and the domain allowlist.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit = Number(process.env.SCAN_RATE_LIMIT_PER_MINUTE ?? 6),
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: Math.max(limit - bucket.count, 0), retryAfterSeconds: 0 };
}

export function clientKeyFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `scan:${ip}`;
}

export function resetRateLimits() {
  buckets.clear();
}
