// app/api/blog/publish/route.ts (NEW)
import { NextResponse } from 'next/server'
import BlogPost from '@/models/BlogPost'
import Org from '@/models/Org'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const { orgId, postId } = await req.json()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 })

  const post = await BlogPost.findOne({ _id: postId, orgId })
  if (!post) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 })

  if (post.status !== 'published') {
    post.status = 'published'
    await post.save()
    await Org.updateOne({ _id: orgId }, { $inc: { 'kpi.contentsProduced': 1 } }) // you already aggregate contentsProduced
  }

  return NextResponse.json({ ok:true })
}
