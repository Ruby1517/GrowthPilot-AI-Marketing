import 'dotenv/config'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { s3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import mongoose from 'mongoose'
import Asset from '@/models/Asset'
import { dbConnect } from '@/lib/db'
// Optional: import { reportUsageForOrg } from '@/lib/billing/usage'

const connection = new IORedis(process.env.REDIS_URL!)
const TMP = path.join(process.cwd(), '.tmp')

new Worker('video-processor', async job => {
  await dbConnect()
  const asset = await Asset.findById(job.data.assetId)
  if (!asset) return
  asset.status = 'processing'; await asset.save()

  // 1) Download from S3 to tmp
  fs.mkdirSync(TMP, { recursive: true })
  const input = path.join(TMP, `${asset._id}.source`)
  const obj = await s3.send(new GetObjectCommand({ Bucket: asset.bucket, Key: asset.key }))
  await new Promise<void>((resolve,reject)=>obj.Body!.pipe(fs.createWriteStream(input)).on('finish',resolve).on('error',reject))

  // 2) Run ffmpeg (example: normalize to mp4 1080p)
  const output = path.join(TMP, `${asset._id}.mp4`)
  await new Promise<void>((resolve,reject)=>{
    const ff = spawn('ffmpeg', ['-y','-i',input,'-vf','scale=-2:1080','-c:v','libx264','-preset','veryfast','-c:a','aac',output], { stdio: 'inherit' })
    ff.on('close', code => code===0?resolve():reject(new Error(`ffmpeg exit ${code}`)))
  })

  // 3) Upload processed file back to S3 (e.g., put under /processed/)
  const processedKey = asset.key.replace('/video/','/video/processed/')
  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const data = fs.readFileSync(output)
  await s3.send(new PutObjectCommand({ Bucket: asset.bucket, Key: processedKey, Body: data, ContentType: 'video/mp4' }))

  // 4) Update asset → ready
  asset.status = 'ready'
  asset.url = (process.env.CDN_URL || `https://${asset.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`) + '/' + processedKey
  await asset.save()

  // 5) (Optional) report minutes usage to Stripe
  // const seconds = await probeDurationSeconds(output) // implement with ffprobe
  // const minutes = Math.max(1, Math.ceil(seconds/60))
  // await reportUsageForOrg(asset.userId.toString(), { minutes, sourceId: `video_${asset._id}` })

}, { connection })
