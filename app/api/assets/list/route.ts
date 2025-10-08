export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Asset from '@/models/Asset'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import mongoose from 'mongoose'

const REGION = process.env.S3_REGION || process.env.S3_REGION || 'us-west-1'
const BUCKET = process.env.S3_BUCKET!
const CDN_BASE = (process.env.CDN_URL || process.env.S3_PUBLIC_BASE || '').replace(/\/$/, '') || ''

const s3 = new S3Client({ region: REGION })

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as any).id

  await dbConnect()

  // query params
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId') || undefined
  const includePending = searchParams.get('includePending') === '1'   // useful for debugging
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

  // Build query
  const q: any = {
    userId: new mongoose.Types.ObjectId(userId),
  }
  if (!includePending) q.status = 'ready'
  if (projectId) q.projectId = new mongoose.Types.ObjectId(projectId)

  const docs = await Asset.find(q).sort({ createdAt: -1 }).limit(limit).lean()

  // Map to response with URL
  const items = await Promise.all(
    docs.map(async (d: any) => {
      let url: string
      if (CDN_BASE) {
        // If you serve public objects through a CDN or public bucket
        url = `${CDN_BASE}/${d.key}`
      } else {
        // Private bucket → signed GET URL
        url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: d.bucket || BUCKET, Key: d.key }),
          { expiresIn: 60 * 10 } // 10 minutes
        )
      }

      return {
        id: String(d._id),
        key: d.key,
        bucket: d.bucket,
        region: d.region,
        type: d.type,
        contentType: d.contentType,
        bytes: d.size ?? d.bytes,           // support either field name
        etag: d.etag,
        status: d.status,
        createdAt: d.createdAt,
        url,
      }
    })
  )

  // Optional: quick counts to help debug why nothing shows
  const [totalReady, totalPending] = await Promise.all([
    Asset.countDocuments({ userId, status: 'ready' }),
    Asset.countDocuments({ userId, status: 'pending' })
  ])

  return NextResponse.json({ items, meta: { totalReady, totalPending } })
}
