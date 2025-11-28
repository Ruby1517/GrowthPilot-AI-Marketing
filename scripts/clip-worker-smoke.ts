import "dotenv/config";
import { Worker as BullWorker } from "bullmq";
import IORedis from "ioredis";
import mongoose from "mongoose";
import ClipJob from "@/models/ClipJob";

const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
}

new BullWorker("clip-queue", async (job) => {
  await connectDb();
  const j = await (ClipJob as any).findById(job.data.jobId);
  if (!j) return;
  j.status = "processing"; j.stage = "probe"; j.progress = 10; await j.save();
  await new Promise(r => setTimeout(r, 800));
  j.stage = "done"; j.status = "done"; j.progress = 100; await j.save();
  console.log("[smoke] finished job", String(j._id));
}, { connection: redis, concurrency: 1 });
