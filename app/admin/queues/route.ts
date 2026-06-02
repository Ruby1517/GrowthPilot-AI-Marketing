export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Queue } from 'bullmq'

export async function GET() {
  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }

  try {
    const connection = { url: REDIS_URL, maxRetriesPerRequest: null as any, lazyConnect: true }
    const queue = new Queue('postpilot-schedule', { connection })
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])
    await queue.close()

    return NextResponse.json({
      queues: {
        'postpilot-schedule': { waiting, active, completed, failed },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Queue error' }, { status: 500 })
  }
}
