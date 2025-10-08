import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Post from '@/models/Post'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { postId } = await req.json()
  await dbConnect()
  await Post.findOneAndUpdate({ _id: postId, userId: (session.user as any).id }, { $inc: { 'metrics.copied': 1 } })
  return new Response('ok')
}
