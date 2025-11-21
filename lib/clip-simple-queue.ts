import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let cachedQueue: Queue | null | undefined;
let initPromise: Promise<Queue | null> | null = null;

export async function getSimpleClipQueue(): Promise<Queue | null> {
  if (cachedQueue !== undefined) return cachedQueue;
  if (initPromise) return initPromise;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    console.warn('[clip-simple-queue] REDIS_URL not set; queue disabled');
    cachedQueue = null;
    return cachedQueue;
  }

  initPromise = (async () => {
    const connection = new IORedis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    connection.on('error', (err) => {
      console.warn('[clip-simple-queue] redis error:', err?.message || err);
    });

    try {
      await connection.connect();
      cachedQueue = new Queue('clip-simple', { connection });
    } catch (err: any) {
      console.warn('[clip-simple-queue] connect failed:', err?.message || err);
      try {
        connection.disconnect();
      } catch {}
      cachedQueue = null;
    } finally {
      initPromise = null;
    }

    return cachedQueue;
  })();

  return initPromise;
}
