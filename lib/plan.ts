import { dbConnect } from '@/lib/db'
import Org from '@/models/Org'
import type { Plan as OrgPlan } from '@/models/Org'

export type PlanName = OrgPlan

const PLAN_RANK: Record<OrgPlan, number> = { Trial: 0, Starter: 1, Pro: 2, Business: 3 }

function normalizePlan(value: string | OrgPlan | null | undefined): OrgPlan {
  const s = String(value ?? '').toLowerCase()
  if (s === 'starter') return 'Starter'
  if (s === 'pro') return 'Pro'
  if (s === 'business') return 'Business'
  return 'Trial'
}

interface PlanErrorOptions {
  code: 'org_not_found' | 'plan_restricted'
  message: string
  status?: number
  plan?: OrgPlan
  required?: OrgPlan
}

export class PlanError extends Error {
  code: PlanErrorOptions['code']
  status: number
  plan?: OrgPlan
  required?: OrgPlan

  constructor(opts: PlanErrorOptions) {
    super(opts.message)
    this.code = opts.code
    this.status = opts.status ?? 400
    this.plan = opts.plan
    this.required = opts.required
    Object.setPrototypeOf(this, PlanError.prototype)
  }
}

export async function assertPlan(orgId: string | undefined | null, minPlan: OrgPlan | string = 'Starter') {
  if (!orgId) {
    throw new PlanError({ code: 'org_not_found', message: 'Organization not found', status: 404 })
  }

  await dbConnect()

  const org = await Org.findById(orgId).select('plan').lean()
  if (!org) {
    throw new PlanError({ code: 'org_not_found', message: 'Organization not found', status: 404 })
  }

  const current = normalizePlan((org as any).plan)
  const required = normalizePlan(minPlan as OrgPlan)

  if (PLAN_RANK[current] < PLAN_RANK[required]) {
    throw new PlanError({
      code: 'plan_restricted',
      message: `Requires ${required} plan`,
      status: 402,
      plan: current,
      required,
    })
  }

  return current
}
