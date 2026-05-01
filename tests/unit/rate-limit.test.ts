import { __resetRateLimitBuckets, checkRateLimit } from "@/lib/rate-limit";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  __resetRateLimitBuckets();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request and decrements remaining", () => {
    const r = checkRateLimit("user-1", { max: 3, windowMs: 1000 });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("blocks once max is reached and returns retryAfter", () => {
    const opts = { max: 2, windowMs: 60_000 };
    expect(checkRateLimit("user-2", opts).ok).toBe(true);
    expect(checkRateLimit("user-2", opts).ok).toBe(true);
    const blocked = checkRateLimit("user-2", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("isolates buckets per key", () => {
    const opts = { max: 1, windowMs: 60_000 };
    expect(checkRateLimit("alice", opts).ok).toBe(true);
    expect(checkRateLimit("bob", opts).ok).toBe(true);
    expect(checkRateLimit("alice", opts).ok).toBe(false);
    expect(checkRateLimit("bob", opts).ok).toBe(false);
  });

  it("opens a fresh window after the previous one expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const opts = { max: 1, windowMs: 1000 };
    expect(checkRateLimit("user-3", opts).ok).toBe(true);
    expect(checkRateLimit("user-3", opts).ok).toBe(false);

    // Advance past the window
    vi.setSystemTime(1500);

    const refreshed = checkRateLimit("user-3", opts);
    expect(refreshed.ok).toBe(true);
    expect(refreshed.remaining).toBe(0);
  });

  it("retryAfterSeconds is at least 1 even right at the boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const opts = { max: 1, windowMs: 100 };
    checkRateLimit("user-4", opts);
    // Less than 1 second remaining → still rounds up to at least 1
    vi.setSystemTime(99);
    const r = checkRateLimit("user-4", opts);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
