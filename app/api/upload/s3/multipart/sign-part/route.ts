export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { s3 } from '@/lib/s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { UploadPartCommand } from '@aws-sdk/client-s3'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { key, uploadId, partNumber } = await req.json()
  const cmd = new UploadPartCommand({ Bucket: process.env.S3_BUCKET!, Key: key, UploadId: uploadId, PartNumber: Number(partNumber) })
  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 })
  return Response.json({ url })
}
