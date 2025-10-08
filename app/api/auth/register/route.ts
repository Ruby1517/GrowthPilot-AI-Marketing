import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import Org from '@/models/Org'
import Team from '@/models/Team'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) return new Response('Missing email or password', { status: 400 })
  if (typeof password !== 'string' || password.length < 8) {
    return new Response('Password must be at least 8 characters', { status: 400 })
  }

  await dbConnect()
  const exists = await User.findOne({ email })
  if (exists) return new Response('User already exists', { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)

  // Create Org + Team + User (same structure used in OAuth first login)
  const displayName = email.split('@')[0]
  const org = await Org.create({ name: `${displayName}'s Org` })
  const team = await Team.create({ name: `${displayName}'s Team`, ownerId: org.ownerId })
  const user = await User.create({
    name: displayName,
    email,
    passwordHash,
    teamId: team._id,
    role: 'owner',
    orgId: org._id,
  })
  org.ownerId = user._id
  org.members = [{ userId: user._id, role: 'owner' }]
  await org.save()

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  })
}
