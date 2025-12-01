import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Job from '@/models/Job'

type QueueJob = {
  _id: string
  type: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  stage?: string
  progress?: number
  createdAt: string
  key?: string
}

function toQueueShape(doc: any): QueueJob {
  const steps = Array.isArray(doc.steps) ? doc.steps : []
  const total = steps.length || 1
  const done = steps.filter((s: any) => s.status === 'done').length
  const running = steps.find((s: any) => s.status === 'running')
  const stage = running?.name || (steps[done]?.name) || undefined
  const status = doc.status === 'running' ? 'processing' : (doc.status as any)
  const progress = Math.round((done / total) * 100)
  return {
    _id: String(doc._id),
    type: doc.type || 'Job',
    status,
    stage,
    progress,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
  }
}

async function getBullQueues() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) return null
  const { Queue } = await import('bullmq')
  const Redis = (await import('ioredis')).default
  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true, enableReadyCheck: false, retryStrategy: () => null })
  const queues = [
    new Queue('postpilot-schedule', { connection }),
  ]
  return queues
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  // Try BullMQ first
  try {
    const queues = await getBullQueues()
    if (queues) {
      const all: any[] = []
      for (const q of queues) {
        const jobs = await q.getJobs(['waiting','delayed','active','completed','failed'], 0, 50, false)
        for (const j of jobs) {
          const state = await j.getState().catch(()=> 'waiting' as const)
          const status = state === 'active' ? 'processing' : state === 'completed' ? 'done' : state === 'failed' ? 'failed' : 'queued'
          all.push({
            _id: String(j.id),
            type: j.name || q.name,
            status,
            stage: (state === 'active' ? (j.name || 'active') : undefined),
            progress: typeof j.progress === 'number' ? j.progress : undefined,
            createdAt: new Date(j.timestamp || Date.now()).toISOString(),
            key: (j.data && (j.data.key || j.data.filename)) || undefined,
          })
        }
      }
      all.sort((a,b)=> b.createdAt.localeCompare(a.createdAt))
      return NextResponse.json(all.slice(0, 100))
    }
  } catch {
    // fall through to DB-based stub
  }

  // Fallback: Mongo-backed jobs
  await dbConnect()
  const items = await Job.find({}).sort({ createdAt: -1 }).limit(50).lean()
  return NextResponse.json(items.map(toQueueShape))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const body = await req.json().catch(()=> ({} as any))
  const type = (body?.type && String(body.type)) || 'job'
  const payload = (body?.payload || {})

  // Try BullMQ enqueue into postpilot-schedule
  try {
    const queues = await getBullQueues()
    if (queues) {
      const postpilot = queues.find(q => q.name === 'postpilot-schedule')!
      const job = await postpilot.add(type, { ...payload, createdBy: (session.user as any).email }, { removeOnComplete: 100, removeOnFail: 100 })
      return NextResponse.json({ ok: true, jobId: String(job.id) })
    }
  } catch {}

  // Fallback: create a Mongo-backed placeholder job for UI
  await dbConnect()
  const steps = [
    { name: 'queued', status: 'done' },
    { name: 'probe', status: 'running' },
    { name: 'process', status: 'queued' },
    { name: 'upload', status: 'queued' },
  ]
  const doc = await Job.create({ type, status: 'running', steps })
  return NextResponse.json({ ok: true, jobId: String(doc._id), fallback: true })
}
