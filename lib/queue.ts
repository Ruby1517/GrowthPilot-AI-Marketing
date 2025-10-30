import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

export const postpilotQueue = new Queue('postpilot-schedule', { connection })
export const postpilotEvents = new QueueEvents('postpilot-schedule', { connection })

export function startPostpilotWorker() {
  const worker = new Worker('postpilot-schedule', async job => {
    console.log('[postpilot] running job', job.id, job.data)
    // TODO: call your webhook or posting logic here
  }, { connection })

  worker.on('completed', job => console.log('[postpilot] done', job.id))
  worker.on('failed', (job, err) => console.error('[postpilot] failed', job?.id, err))
}
