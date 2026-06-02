export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { runResearch } from '@/lib/agent/research'

const Body = z.object({
  topic:          z.string().min(3).max(500),
  url:            z.string().url().optional(),
  targetAudience: z.string().max(300).optional(),
  module:         z.enum(['postpilot','blogpilot','adpilot','mailpilot','leadpilot','any']).optional(),
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

  try {
    const result = await runResearch(parsed.data)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Research failed' }, { status: 500 })
  }
}
