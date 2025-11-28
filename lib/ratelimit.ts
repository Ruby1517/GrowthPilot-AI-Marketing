import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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
          remaining: 9999,
          reset: Date.now() + 60_000,
          pending: 0,
        };
      },
    } as unknown as Ratelimit
  }
  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:org',
  })
}

/** 20 requests / 1 minute per org (or per user if no org) */
export const limiterPerOrg = buildLimiter()
