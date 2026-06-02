import mongoose from 'mongoose'
import { validateEnv } from '@/lib/env'

let cached = (global as any)._mongoose
if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null }

export async function dbConnect() {
  validateEnv()  // runs once per process; no-op on subsequent calls
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 10000,
    }).then(m => m)
  }
  cached.conn = await cached.promise
  return cached.conn
}
