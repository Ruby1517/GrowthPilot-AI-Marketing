export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { s3, buildObjectKey, guessContentType } from '@/lib/s3'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { filename, projectId, kind='video' } = await req.json()
  const key = buildObjectKey({ userId: (session.user as any).id, projectId, filename, kind })
  const bucket = process.env.S3_BUCKET!
  const contentType = guessContentType(filename, 'application/octet-stream')
  const cmd = new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType })
  const out = await s3.send(cmd)
  return Response.json({ uploadId: out.UploadId, key, bucket })
}
