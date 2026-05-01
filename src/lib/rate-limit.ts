import "server-only";

interface Bucket {
  count: number;
  /** Unix timestamp ms when this bucket resets. */
  resetAt: number;
}

export interface RateLimitOptions {
  /** Maximum requests in the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Unix timestamp ms when the bucket resets. */
  resetAt: number;
  /** When `ok === false`, seconds until the user can retry. */
  retryAfterSeconds?: number;
}

/**
 * Per-instance in-memory rate limiter using a fixed-window counter. Keyed
 * by an arbitrary string (uid, IP, etc.) so callers can pick the granularity.
 *
 * **Caveats:**
 *   - State lives only in this Cloud Run instance — if the service has
 *     5 instances, a user gets effectively 5× the configured limit. This
 *     is acceptable for MVP throttling against accidental spam; for hard
 *     bill protection, swap to Upstash Redis or Memorystore.
 *   - Buckets are cleaned lazily during `check()` calls and aggressively
 *     when the map exceeds 10k entries to bound memory.
 */
const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

function gc(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) gc(now);

  const bucket = buckets.get(key);

  // Fresh window — either no bucket yet or the previous one expired.
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.max - 1, resetAt };
  }

  if (bucket.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: opts.max - bucket.count, resetAt: bucket.resetAt };
}

/** Test-only helper. Not exported from the package barrel. */
export function __resetRateLimitBuckets(): void {
  buckets.clear();
}
