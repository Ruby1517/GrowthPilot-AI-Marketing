import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let q: Queue | null | undefined;

export function getSimpleClipQueue(): Queue | null {
  if (q !== undefined) return q;
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[clip-simple-queue] REDIS_URL not set; queue disabled');
    q = null;
    return q;
  }
  const connection = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  connection.connect().catch((e) => console.warn('[clip-simple-queue] connect failed:', e?.message || e));
  q = new Queue('clip-simple', { connection });
  return q;
}

