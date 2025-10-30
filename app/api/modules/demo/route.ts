import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import Org from '@/models/Org'
import ModuleDemo from '@/models/ModuleDemo'

export async function GET(req: Request) {
  await dbConnect()
  const url = new URL(req.url)
  const mod = url.searchParams.get('module')
  const q: any = {}
  if (mod) q.module = mod
  const rows = await ModuleDemo.find(q).sort({ updatedAt: -1 }).lean()
  return NextResponse.json({ ok: true, items: rows.map(r => ({ module: r.module, key: r.key, url: r.url, updatedAt: r.updatedAt })) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })
  await dbConnect()
  const me = await User.findOne({ email: session.user.email }).lean()
  if (!me?.orgId) return new Response('Forbidden', { status: 403 })
  const org = await Org.findById(me.orgId).lean()
  const myRole = org?.members?.find((m: any) => String(m.userId) === String(me._id))?.role || 'member'
  if (!['owner','admin'].includes(String(myRole))) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const moduleKey = String(body.module || '')
  const key = String(body.key || '')
  const url = body.url ? String(body.url) : undefined
  if (!moduleKey || !key) return new Response('module and key are required', { status: 400 })

  await ModuleDemo.findOneAndUpdate(
    { module: moduleKey },
    { $set: { key, url } },
    { upsert: true }
  )

  return NextResponse.json({ ok: true })
}

