import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const RATE_LIMIT = 20;
const RATE_WINDOW = '1 m';
const RATE_WINDOW_MS = 60_000;

// Legacy helper used by some modules; falls back to allow if not configured.
export async function checkRateLimit(orgId: string, module: string, limit: number, windowSeconds: number) {
  void module;
  void windowSeconds;
  if (!orgId) return { ok: true, remaining: limit };
  try {
    const { success, remaining } = await limiterPerOrg.limit(`org:${orgId}`);
    return { ok: success, remaining };
  } catch {
    return { ok: true, remaining: limit };
  }
}

function buildLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // No-op limiter for local/dev or when not configured.
    return {
      limit: async (key: string) => {
        void key;
        return {
          success: true,
          limit: RATE_LIMIT,
          remaining: RATE_LIMIT,
          reset: Date.now() + RATE_WINDOW_MS,
          pending: 0,
        };
      },
    } as unknown as Ratelimit
  }
  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT, RATE_WINDOW),
    prefix: 'rl:org',
  })
}

/** 20 requests / 1 minute per org (or per user if no org) */
export const limiterPerOrg = buildLimiter()

function fallbackLimit() {
  return {
    success: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT,
    reset: Date.now() + RATE_WINDOW_MS,
    pending: 0,
  };
}

export async function safeLimitPerOrg(orgId: string) {
  if (!orgId) return fallbackLimit();
  try {
    return await limiterPerOrg.limit(orgId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Rate limit lookup failed; allowing request: ${message}`);
    return fallbackLimit();
  }
}
