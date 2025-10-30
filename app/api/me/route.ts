import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean()
  if (!me) return new Response('Not found', { status: 404 })
  return NextResponse.json({
    id: String(me._id),
    name: me.name || '',
    email: me.email || '',
    image: me.image || '',
    role: me.role || 'member',
    orgId: me.orgId ? String(me.orgId) : null,
  })
}

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  const body = await req.json().catch(()=> ({}))
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 })

  await dbConnect()
  const updates: any = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.image !== undefined) updates.image = parsed.data.image

  await User.updateOne({ email: session.user.email }, { $set: updates })
  return NextResponse.json({ ok: true })
}

