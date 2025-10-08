import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI as string
if (!uri) throw new Error('MONGODB_URI not set')

let cached = (global as any)._mongoose
if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null }

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      // force DB even if the URI path is missing
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 10000,
    }).then(m => m)
  }
  cached.conn = await cached.promise
  return cached.conn
}
