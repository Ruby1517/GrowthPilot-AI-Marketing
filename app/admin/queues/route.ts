export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import type { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import fastify from 'fastify'
import { Queue } from 'bullmq'

function buildConnection() {
  const REDIS_URL = process.env.REDIS_URL
  if (REDIS_URL) return { connection: { url: REDIS_URL, maxRetriesPerRequest: null as any } }
  return {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null as any,
      enableReadyCheck: false,
    },
  }
}

let appInstance: ReturnType<typeof fastify> | null = null
let initialized = false

export async function GET() {
  try {
    // Lazy-init a Fastify instance in-process and mount Bull Board onto it.
    if (!initialized) {
      const { connection } = buildConnection()
      const queues = [
        new Queue('postpilot-schedule', { connection }),
        new Queue('viralp-assemble', { connection }),
      ]

      // BullMQAdapter implements BaseAdapter but its bundled types lag behind BullMQ's latest JobProgress signature
      const adapters: BaseAdapter[] = queues.map((q) => new BullMQAdapter(q)) as unknown as BaseAdapter[]
      const serverAdapter = new FastifyAdapter()
      serverAdapter.setBasePath('/admin/queues')

      // Create a fastify app and register Bull Board's plugin on it.
      appInstance = fastify({ logger: false })
      createBullBoard({ queues: adapters, serverAdapter })
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
