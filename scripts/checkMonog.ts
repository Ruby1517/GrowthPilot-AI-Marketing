// scripts/checkMongo.ts
import 'dotenv/config'
import mongoose from 'mongoose'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set in .env')

  console.log('Connecting to MongoDB...')
  await mongoose.connect(uri)

  const conn = mongoose.connection
  const admin = conn.db.admin()
  const ping = await admin.command({ ping: 1 })
  const collections = await conn.db.listCollections().toArray()

  console.log('✅ Connected')
  console.log('Host:', (conn as any).host, 'DB:', conn.name)
  console.log('Ping ok:', ping.ok === 1)
  console.log('Collections:', collections.map(c => c.name))

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('❌ MongoDB connection failed')
  console.error(err)
  process.exit(1)
})
