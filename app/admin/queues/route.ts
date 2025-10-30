export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
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

let server: any
let started = false

export async function GET() {
  try {
    if (!server) {
      const { connection } = buildConnection()
      const queues = [
        new Queue('postpilot-schedule', { connection }),
        new Queue('viralp-assemble', { connection }),
      ]

      const adapters = queues.map((q) => new BullMQAdapter(q))
      const fastify = new FastifyAdapter()
      fastify.setBasePath('/admin/queues')
      createBullBoard({ queues: adapters, serverAdapter: fastify })
      await fastify.registerPlugin()
      server = fastify
    }
    const html = await server.render('/admin/queues')
    return new NextResponse(html, { headers: { 'content-type': 'text/html' } })
  } catch (e: any) {
    return new Response(`Queue UI error: ${e?.message || e}`, { status: 500 })
  }
}

