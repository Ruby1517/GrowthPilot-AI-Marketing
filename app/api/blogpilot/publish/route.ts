import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import BlogDoc from '@/models/BlogDoc'
import Org from '@/models/Org'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const postId = body?.postId as string | undefined
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ ok: false, error: 'invalid_post_id' }, { status: 400 })
  }

  await dbConnect()

  const post = await BlogDoc.findOne({
    _id: new mongoose.Types.ObjectId(postId),
    userId: new mongoose.Types.ObjectId(String((session.user as any).id)),
  })

  if (!post) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  if (post.status !== 'published') {
    post.status = 'published'
    post.publishedAt = new Date()
    await post.save()

    const orgId = post.orgId ?? (session.user as any).orgId ?? body?.orgId
    if (orgId) {
      await Org.updateOne({ _id: orgId }, { $inc: { 'kpi.contentsProduced': 1 } })
    }
  }

  return NextResponse.json({ ok: true, status: post.status })
}
