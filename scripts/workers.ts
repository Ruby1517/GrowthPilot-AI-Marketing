// scripts/worker.ts
import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import Asset from "@/models/Asset";

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

async function ensureDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
}
ensureDb();

new Worker(
  "verify-queue",
  async (job) => {
    const { key, bucket, region } = job.data as { key: string; bucket: string; region: string };
    const s3 = new S3Client({ region });
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      await Asset.updateOne(
        { key },
        {
          $set: {
            status: "ready",
            contentType: head.ContentType || undefined,
            size: typeof head.ContentLength === "number" ? head.ContentLength : undefined,
            etag: (head.ETag as string) || undefined,
          },
        }
      );
    } catch (e: any) {
      await Asset.updateOne(
        { key },
        { $set: { status: "failed", error: String(e?.name || e) } }
      );
      throw e;
    }
  },
  { connection: redis }
);
