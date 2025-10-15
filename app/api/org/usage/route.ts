// app/api/org/usage/route.ts (NEW, simple)
import { NextResponse } from 'next/server'
import Org from '@/models/Org'
import { PLAN_LIMITS } from '@/lib/limits'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orgId = url.searchParams.get('orgId')!
  const org = await Org.findById(orgId).lean()
  if (!org) return NextResponse.json({ ok:false, error:'org_not_found' }, { status:404 })

  const planName = String((org as any).plan ?? 'Starter') as keyof typeof PLAN_LIMITS
  const plan = PLAN_LIMITS[planName]

  return NextResponse.json({
    ok: true,
    plan: planName,
    usage: org.usage || {},
    limits: plan,
    kpi: org.kpi || {}
  })
}
