import "server-only";
import { RateLimitError } from "@/lib/errors";

type Bucket = { count: number; resetAt: number };

/**
 * In-memory fixed-window limiter, kept on `globalThis` so it survives hot
 * reloads. Sufficient for a single-instance deployment; swap the store for
 * Redis if the app is scaled horizontally.
 */
const globalForLimiter = globalThis as typeof globalThis & {
  __rateLimitBuckets?: Map<string, Bucket>;
};

const buckets = (globalForLimiter.__rateLimitBuckets ??= new Map<string, Bucket>());

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export function consumeRateLimit({ key, limit, windowSeconds }: RateLimitOptions): void {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
