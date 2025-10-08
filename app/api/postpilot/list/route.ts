import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Post from '@/models/Post'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  await dbConnect()
  const q: any = { userId: (session.user as any).id }
  if (from && to) q.scheduledAt = { $gte: new Date(from), $lte: new Date(to) }

  const items = await Post.find(q).sort({ scheduledAt: 1, createdAt: -1 }).limit(500).lean()
  return Response.json({ items })
}
