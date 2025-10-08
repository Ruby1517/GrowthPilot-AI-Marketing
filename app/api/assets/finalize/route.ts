export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Asset from '@/models/Asset'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_S3_REGION })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json().catch(()=> ({}))
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await dbConnect()
  const bucket = process.env.AWS_S3_BUCKET!
  // HEAD the object to get size, type, etag
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }).catch(()=>null))
  if (!head) {
    await Asset.updateOne({ key, userId: (session.user as any).id }, { $set: { status: 'failed' } })
    return NextResponse.json({ error: 'S3 object not found' }, { status: 404 })
  }

  await Asset.updateOne(
    { key, userId: (session.user as any).id },
    {
      $set: {
        bytes: head.ContentLength || 0,
        contentType: head.ContentType || undefined,
        etag: (head.ETag || '').replaceAll('"',''),
        status: 'ready',
      }
    }
  )

  return NextResponse.json({ ok: true })
}
