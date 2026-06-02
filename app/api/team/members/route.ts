export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Org from '@/models/Org'
import User from '@/models/User'
import { Invite } from '@/models/Invite'
import { PLAN_LIMITS } from '@/lib/limits'
import mongoose from 'mongoose'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const me = await User.findOne({ email: session.user.email })
    .lean<{ _id: mongoose.Types.ObjectId; orgId?: mongoose.Types.ObjectId | string }>()
  if (!me?.orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const org = await Org.findById(me.orgId).lean<{
    _id: mongoose.Types.ObjectId; name: string; plan: string;
    members?: Array<{ userId: mongoose.Types.ObjectId; role: string; joinedAt?: Date }>
  }>()
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const myId = String(me._id)
  const myRole = org.members?.find(m => String(m.userId) === myId)?.role || 'editor'
  const plan   = (org.plan || 'Trial') as keyof typeof PLAN_LIMITS
  const seatLimit = (PLAN_LIMITS[plan] as any)?.team_seats ?? 1

  // Fetch user details for all members
  const userIds = (org.members || []).map(m => m.userId).filter(Boolean)
  const userDocs = userIds.length
    ? await User.find({ _id: { $in: userIds } }).lean<Array<{ _id: mongoose.Types.ObjectId; name?: string; email?: string; image?: string }>>()
    : []
  const byId = new Map(userDocs.map(u => [String(u._id), u]))

  const members = (org.members || []).map(m => {
    const u = byId.get(String(m.userId))
    return {
      userId:   String(m.userId),
      role:     m.role,
      name:     u?.name  || null,
      email:    u?.email || null,
      image:    u?.image || null,
      isMe:     String(m.userId) === myId,
      joinedAt: m.joinedAt || null,
    }
  })

  const pendingInvites = await Invite.find({ orgId: org._id, status: 'pending' })
    .sort({ createdAt: -1 }).lean()

  return NextResponse.json({
    orgName:    org.name,
    plan,
    seatLimit,
    myRole,
    members,
    pendingInvites: pendingInvites.map((i: any) => ({
      id:        String(i._id),
      email:     i.email,
      role:      i.role,
      token:     i.token,
      expiresAt: i.expiresAt,
    })),
  })
}
