// app/api/blog/preflight/route.ts
import { NextResponse } from 'next/server'
import { safetyCheck } from '@/lib/safety'
import { checkUsageAndConsume } from '@/lib/usage'
import { USAGE_KEYS } from '@/lib/limits'

export async function POST(req: Request) {
  const { orgId, renderedPrompt, predictedWords = 1200 } = await req.json()

  // Safety on inputs
  const safe = safetyCheck(String(renderedPrompt || ''))
  if (!safe.ok) return NextResponse.json({ ok:false, error:'safety_failed', safety:safe })

  // DRY RUN: only check limits (no mutation)
  const chk = await checkUsageAndConsume({
    orgId,
    key: USAGE_KEYS.BLOGPILOT_WORDS,
    incBy: predictedWords,
    allowOverage: true,
    dryRun: true,
  })

  return NextResponse.json({ ok: chk.ok, result: chk })
}
