import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL
const connection = redisUrl ? new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true }) : null

export const postpilotQueue = connection ? new Queue('postpilot-schedule', { connection }) : null
export const postpilotEvents = connection ? new QueueEvents('postpilot-schedule', { connection }) : null

export function startPostpilotWorker() {
  if (!connection || !postpilotQueue || !postpilotEvents) {
    console.warn('[postpilot] REDIS_URL missing; worker not started');
    return;
  }
  const worker = new Worker('postpilot-schedule', async job => {
    console.log('[postpilot] running job', job.id, job.data)
    // TODO: call your webhook or posting logic here
  }, { connection })

  worker.on('completed', job => console.log('[postpilot] done', job.id))
  worker.on('failed', (job, err) => console.error('[postpilot] failed', job?.id, err))
}
