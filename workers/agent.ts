import 'dotenv/config'
import IORedis from 'ioredis'
import { Worker } from 'bullmq'
import mongoose from 'mongoose'

async function main() {
  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) throw new Error('REDIS_URL is required')

  const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!MONGO_URI) throw new Error('MONGODB_URI is required')

  await mongoose.connect(MONGO_URI)
  console.log('[agent-worker] MongoDB connected')

  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

  const worker = new Worker(
    'agent-campaign',
    async (job) => {
      const { jobId } = job.data as { jobId: string }
      console.log('[agent-worker] processing job', jobId)

      // Lazy import to avoid circular deps at module load time
      const { default: AgentJob } = await import('@/models/AgentJob')
      const { runAgentLoop }      = await import('@/lib/agent/loop')

      await AgentJob.findByIdAndUpdate(jobId, { status: 'running' })

      const jobDoc = await AgentJob.findById(jobId).lean()
      if (!jobDoc) throw new Error(`AgentJob ${jobId} not found`)

      try {
        const result = await runAgentLoop(jobDoc.brief, {
          company:  jobDoc.company,
          audience: jobDoc.audience,
          onStep: async (step) => {
            if (step.status === 'running') {
              await AgentJob.findByIdAndUpdate(jobId, {
                $push: {
                  steps: {
                    tool:      step.tool,
                    label:     step.label,
                    status:    'running',
                    input:     step.input,
                    startedAt: step.startedAt,
                  },
                },
              })
            } else {
              // Update the existing step in-place by tool name
              await AgentJob.updateOne(
                { _id: jobId, 'steps.tool': step.tool },
                {
                  $set: {
                    'steps.$.status':      step.status,
                    'steps.$.output':      step.output,
                    'steps.$.error':       step.error,
                    'steps.$.completedAt': step.completedAt ?? new Date(),
                  },
                }
              )
            }
          },
        })

        await AgentJob.findByIdAndUpdate(jobId, {
          status:  'done',
          summary: result.summary,
        })
        console.log('[agent-worker] done', jobId)
      } catch (e: any) {
        console.error('[agent-worker] failed', jobId, e?.message)
        await AgentJob.findByIdAndUpdate(jobId, {
          status: 'failed',
          error:  e?.message || 'Unknown error',
        })
        throw e
      }
    },
    {
      connection,
      concurrency: 3,
    }
  )

  worker.on('completed', (job) => console.log('[agent-worker] completed', job.id))
  worker.on('failed', (job, err) => console.error('[agent-worker] failed', job?.id, err.message))

  console.log('[agent-worker] listening for jobs on agent-campaign queue')
}

main().catch((e) => {
  console.error('[agent-worker] fatal', e)
  process.exit(1)
})
