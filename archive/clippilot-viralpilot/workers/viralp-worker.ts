import { Worker } from 'bullmq'
import { viralpQueue } from '@/lib/viralp-queues'

function getConnectionFromQueue(q: any) {
  // @ts-ignore internal
  return (q as any).client || (q as any).opts?.connection
}

const connection = getConnectionFromQueue(viralpQueue)

// Minimal worker that simulates assemble work with progress updates
const worker = new Worker(
  'viralp-assemble',
  async (job) => {
    // Simulate stages
    const stages = ['probe', 'transcribe', 'analyze', 'render', 'upload']
    for (let i = 0; i < stages.length; i++) {
      await job.updateProgress(Math.round(((i) / stages.length) * 100))
      await new Promise(res => setTimeout(res, 500))
    }
    await job.updateProgress(100)
    return { ok: true }
  },
  { connection }
)

worker.on('completed', (job) => {
  console.log(`[viralp] completed`, job.id)
})
worker.on('failed', (job, err) => {
  console.error(`[viralp] failed`, job?.id, err?.message)
})

console.log('ViralPilot worker started')

