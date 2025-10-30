export async function retryFetch(
  url: string,
  init: RequestInit = {},
  opts: { retries?: number; backoffMs?: number; throwOnHttpError?: boolean } = {}
) {
  const max = Math.max(0, opts.retries ?? 2);
  const backoff = Math.max(0, opts.backoffMs ?? 400);
  const throwOnHttpError = opts.throwOnHttpError !== false; // default true
  let lastErr: any;
  for (let i = 0; i <= max; i++) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) {
        if (throwOnHttpError) throw new Error(`HTTP ${r.status}`);
        return r;
      }
      return r;
    } catch (e) {
      lastErr = e;
      if (i === max) break;
      await new Promise(res => setTimeout(res, backoff * (i + 1)));
    }
  }
  throw lastErr;
}
