// lib/http.ts
export async function retryFetch(url: string, init: RequestInit = {}, opts: { retries?: number; backoffMs?: number } = {}) {
  const max = Math.max(0, opts.retries ?? 2);
  const backoff = Math.max(0, opts.backoffMs ?? 400);
  let lastErr: any;
  for (let i = 0; i <= max; i++) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      lastErr = e;
      if (i === max) break;
      await new Promise(res => setTimeout(res, backoff * (i + 1)));
    }
  }
  throw lastErr;
}

