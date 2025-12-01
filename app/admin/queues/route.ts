export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import fastify from 'fastify'
import { Queue } from 'bullmq'

function buildConnection() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  const REDIS_URL = process.env.REDIS_URL
  if (!REDIS_URL) return null
  return { connection: { url: REDIS_URL, maxRetriesPerRequest: null as any, lazyConnect: true } }
}

let appInstance: ReturnType<typeof fastify> | null = null
let initialized = false

export async function GET() {
  try {
    const built = buildConnection()
    if (!built) return new Response('Redis not configured', { status: 503 })
    // Lazy-init a Fastify instance in-process and mount Bull Board onto it.
    if (!initialized) {
      const { connection } = built
      const queues = [
        new Queue('postpilot-schedule', { connection }),
      ]

      const adapters = queues.map((q) => new BullMQAdapter(q))
      const serverAdapter = new FastifyAdapter()
      serverAdapter.setBasePath('/admin/queues')

      // Create a fastify app and register Bull Board's plugin on it.
      appInstance = fastify({ logger: false })
      createBullBoard({ queues: adapters as any, serverAdapter })
      // Mount Bull Board under the desired base path
      appInstance.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' })
      await appInstance.ready()
      initialized = true
    }

    // Render the Bull Board HTML via Fastify's inject (no external server).
    const res = await appInstance!.inject({ method: 'GET', url: '/admin/queues' })
    const body = res.payload
    const status = res.statusCode
    const ctype = res.headers['content-type'] || 'text/html'
    return new NextResponse(body, { status, headers: { 'content-type': String(ctype) } })
  } catch (e: any) {
    return new Response(`Queue UI error: ${e?.message || e}`, { status: 500 })
  }
}
