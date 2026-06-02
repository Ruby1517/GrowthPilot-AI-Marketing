export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { iterateContent, type IterateModule } from '@/lib/agent/iterate'

const Body = z.object({
  module:   z.enum(['postpilot', 'blogpilot', 'adpilot', 'mailpilot', 'leadpilot']),
  content:  z.any(),
  feedback: z.string().min(2).max(1000),
  brief:    z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { module, content, feedback, brief } = parsed.data

  try {
    const result = await iterateContent({
      module: module as IterateModule,
      content,
      feedback,
      brief,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Iteration failed' }, { status: 500 })
  }
}
