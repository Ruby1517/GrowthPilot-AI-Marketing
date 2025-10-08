export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { s3 } from '@/lib/s3'
import { CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { key, uploadId, parts } = await req.json() // parts: [{ ETag, PartNumber }]
  try {
    const out = await s3.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }))
    return Response.json({ ok: true, location: out.Location })
  } catch (e) {
    await s3.send(new AbortMultipartUploadCommand({ Bucket: process.env.S3_BUCKET!, Key: key, UploadId: uploadId }))
    return new Response('Multipart complete failed', { status: 500 })
  }
}
