import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Org from '@/models/Org'
import User from '@/models/User'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'

async function getOrgForUser(email: string) {
  await dbConnect()
  const me = await User.findOne({ email }).lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId | string }>()
  if (!me?.orgId) return null
  const org = await Org.findById(me.orgId)
  return org
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId | string }>()
  if (!me) return new Response('User not found', { status: 404 })

  // Settings is scoped strictly to the user's primary org (me.orgId).
  // Do not auto-create or auto-switch here to avoid leaking other orgs.
  const toId = (v: any) => (v && typeof (v as any).toString === 'function') ? (v as any).toString() : String(v)
  const org = me.orgId ? await Org.findById(me.orgId) : null
  if (!org) return new Response('Org not found', { status: 404 })
  const meRole = org.members?.find((m: { userId: unknown; role?: string }) => toId(m.userId) === toId(me._id))?.role || 'member'
  return NextResponse.json({
    id: String(org._id),
    name: org.name,
    plan: org.plan,
    overageEnabled: !!org.overageEnabled,
    billingCustomerId: org.billingCustomerId || null,
    subscription: org.subscription || null,
    usagePeriodStart: org.usagePeriodStart || null,
    usagePeriodEnd: org.usagePeriodEnd || null,
    createdAt: org.createdAt || null,
    myRole: meRole,
    effectivePlan: (!org.billingCustomerId && !(org as any).subscription?.id && org.plan !== 'Trial') ? 'Trial' : org.plan,
  })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  overageEnabled: z.boolean().optional(),
  plan: z.enum(['Starter','Pro','Business']).optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const body = await req.json().catch(()=> ({}))
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 })

  const org = await getOrgForUser(session.user.email)
  if (!org) return new Response('Org not found', { status: 404 })

  // Only owner/admin can update org settings (name/overage)
  const me = await User.findOne({ email: session.user.email }).lean<{ _id: mongoose.Types.ObjectId }>()
  const myRole = org.members?.find((m:any) => String(m.userId) === String(me?._id))?.role || 'member'
  if (!['owner','admin'].includes(myRole)) return new Response('Forbidden', { status: 403 })

  if (parsed.data.name !== undefined) org.name = parsed.data.name
  if (parsed.data.overageEnabled !== undefined) org.overageEnabled = parsed.data.overageEnabled

  // Dev-only plan override: allowed when not production and either env flag enabled or admin/owner
  const allowByRole = myRole === 'admin' || myRole === 'owner'
  const allowByEnv = process.env.DEV_ALLOW_PLAN_OVERRIDE === 'true'
  const canOverridePlan = process.env.NODE_ENV !== 'production' && (allowByEnv || allowByRole)
  if (parsed.data.plan !== undefined) {
    if (!canOverridePlan) return new Response('Plan override not allowed', { status: 403 })
    org.plan = parsed.data.plan
  }
  await org.save()

  return NextResponse.json({ ok: true })
}
