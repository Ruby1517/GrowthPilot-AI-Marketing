import 'dotenv/config'
import IORedis from 'ioredis'
import { Worker, Queue } from 'bullmq'
import mongoose from 'mongoose'

const QUEUE_NAME = 'autopilot-checker'
const CHECK_INTERVAL_MS = 15 * 60 * 1000   // 15 minutes

async function main() {
  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) throw new Error('REDIS_URL is required')

  const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!MONGO_URI) throw new Error('MONGODB_URI is required')

  await mongoose.connect(MONGO_URI)
  console.log('[autopilot-worker] MongoDB connected')

  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

  // Schedule the checker to run every 15 minutes
  const queue = new Queue(QUEUE_NAME, { connection })
  await queue.add('check', {}, {
    repeat: { every: CHECK_INTERVAL_MS },
    removeOnComplete: 10,
    removeOnFail: 10,
  })
  console.log(`[autopilot-worker] scheduled checker every ${CHECK_INTERVAL_MS / 60_000} min`)

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      console.log('[autopilot-worker] checking for due autopilots…')
      const { runDueAutopilots } = await import('@/lib/agent/autopilot')
      const { ran, errors } = await runDueAutopilots()
      console.log(`[autopilot-worker] ran ${ran} autopilots, ${errors} errors`)
    },
    { connection, concurrency: 1 }
  )

  worker.on('completed', () => console.log('[autopilot-worker] check complete'))
  worker.on('failed', (job, err) => console.error('[autopilot-worker] check failed:', err.message))

  console.log('[autopilot-worker] listening on', QUEUE_NAME)
}

main().catch(e => {
  console.error('[autopilot-worker] fatal:', e)
  process.exit(1)
})
