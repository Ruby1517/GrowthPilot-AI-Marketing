export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Asset from '@/models/Asset'
import { s3, buildObjectKey, guessContentType } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

const Body = z.object({
  filename: z.string().min(1).max(200),
  projectId: z.string().optional(),
  kind: z.enum(['image','video','audio','doc']).optional(),
  size: z.number().int().positive(),
  contentType: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 })

  const { filename, projectId, kind = 'doc', size } = parsed.data
  const contentType = parsed.data.contentType || guessContentType(filename)

  const bucket = process.env.S3_BUCKET!
  const region = process.env.AWS_REGION || 'us-west-1' // ✅ pick your region
  const key = buildObjectKey({
    userId: (session.user as any).id,
    projectId,
    filename,
    kind
  })

  const requireSSE = process.env.S3_REQUIRE_SSE === '1'
  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(requireSSE ? { ServerSideEncryption: 'AES256' } : {})
  })

  const url = await getSignedUrl(s3, put, { expiresIn: 300 })

  await dbConnect()
  const baseUrl = process.env.CDN_URL || process.env.S3_PUBLIC_BASE // optional
  await Asset.create({
    userId: (session.user as any).id,
    projectId,
    key,
    bucket,
    region,                        // ✅ SAVE REGION
    url: baseUrl ? `${baseUrl.replace(/\/$/,'')}/${key}` : undefined,
    contentType,
    size,
    status: 'pending',
    type: kind,
  })

  return Response.json({
    url,
    key,
    requiredHeaders: {
      'Content-Type': contentType,
      ...(requireSSE ? { 'x-amz-server-side-encryption': 'AES256' } : {})
    }
  })
}
