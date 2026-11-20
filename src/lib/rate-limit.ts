export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const PRUNE_MAP_THRESHOLD = 500;

const requestLog = new Map<string, number[]>();

function pruneStaleKeys(now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  for (const [key, timestamps] of requestLog.entries()) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, active);
    }
  }
}

/**
 * Lightweight in-memory sliding-window rate limiter per client key.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (requestLog.size > PRUNE_MAP_THRESHOLD) {
    pruneStaleKeys(now, windowMs);
  }

  const existing = requestLog.get(key) ?? [];
  const active = existing.filter((t) => t > cutoff);

  if (active.length >= maxRequests) {
    requestLog.set(key, active);
    const oldest = active[0] ?? now;
    const retryAfterMs = Math.max(1_000, oldest + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
    };
  }

  active.push(now);
  requestLog.set(key, active);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}
