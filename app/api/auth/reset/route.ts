import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { email, token, password } = await req.json()
  if (!email || !token || !password) return new Response('Missing fields', { status: 400 })
  if (typeof password !== 'string' || password.length < 8)
    return new Response('Password must be at least 8 characters', { status: 400 })

  await dbConnect()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const now = new Date()

  const user = await User.findOne({
    email,
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: now }
  })
  if (!user) return new Response('Invalid or expired token', { status: 400 })

  user.passwordHash = await bcrypt.hash(password, 10)
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'content-type': 'application/json' }
  })
}
