import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue: Queue | null | undefined; // undefined = not initialized yet

export function getClipQueue(): Queue | null {
  if (queue !== undefined) return queue; // return cached (Queue or null)

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[clip-queue] REDIS_URL not set; queue disabled");
    queue = null;
    return queue;
  }

  const connection = new IORedis(url, {
    lazyConnect: true,
    retryStrategy: (attempt) => Math.min(2000 * attempt, 10_000),
    maxRetriesPerRequest: 1,
  });

  // connect in background; if it fails we still keep a Queue instance that will error on use
  connection.connect().catch((e) => {
    console.warn("[clip-queue] connect failed:", e?.message || e);
  });

  queue = new Queue("clip-queue", { connection });
  return queue;
}


