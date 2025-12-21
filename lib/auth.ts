import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import type { Provider } from 'next-auth/providers'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db'
import { trackEvent } from '@/lib/events'
import User from '@/models/User'
import Org from '@/models/Org'
import Team from '@/models/Team'

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
if (!authSecret) {
  // Avoid hard crashes if envs are missing; warn in logs instead.
  console.warn('[auth] AUTH_SECRET/NEXTAUTH_SECRET not set. Using a fallback dev secret.');
}

const providers: Provider[] = []
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
} else {
  console.warn('Google OAuth is disabled because GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.')
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }))
} else {
  console.warn('GitHub OAuth is disabled because GITHUB_ID/GITHUB_SECRET are not set.')
}

providers.push(Credentials({
  name: 'Credentials',
  credentials: { email: {}, password: {} },
  async authorize(creds) {
    await dbConnect()
    const user = await User.findOne({ email: creds?.email })
    if (!user || !user.passwordHash) return null
    const ok = await bcrypt.compare(String(creds?.password ?? ''), user.passwordHash)
    return ok ? { id: user._id.toString(), email: user.email, name: user.name } : null
  },
}))

export const { handlers, auth } = NextAuth({
  // Allow local development host (http://localhost:3000) and any host defined in env
  trustHost: true,
  secret: authSecret || 'dev-secret',
  providers,
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, profile, account }) {
      await dbConnect()
      const email = user?.email || (profile as any)?.email
      if (!email) return false
      let dbUser = await User.findOne({ email })
      if (!dbUser) {
        const org = await Org.create({ name: `${user?.name || 'My'} Org` })
        dbUser = await User.create({
          name: user?.name, email, image: (user as any).image,
          role: 'member', orgId: org._id
        })
        const team = await Team.create({ name: `${user.name || 'My'} Team`, ownerId: dbUser._id })
        dbUser.teamId = team._id
        await dbUser.save()
        // Trial users default to member
        org.members = [{ userId: dbUser._id, role: 'member', joinedAt: new Date() as any } as any]
        await org.save()
      }

      // Auto-join pending invites for this email (quality-of-life)
      try {
        const { Invite } = await import('@/models/Invite')
        const invites = await Invite.find({ email, status: 'pending', expiresAt: { $gte: new Date() } }).lean()
        for (const inv of invites) {
          try {
            const org = await Org.findById(inv.orgId).lean()
            if (!org) continue
            const isMember = Array.isArray(org.members) && org.members.some((m:any) => String(m.userId) === String(dbUser._id))
            if (!isMember) {
              await Org.updateOne(
                { _id: inv.orgId, 'members.userId': { $ne: dbUser._id } },
                { $push: { members: { userId: dbUser._id, role: inv.role, joinedAt: new Date() } } }
              )
              // If user has no org yet (e.g., created via OAuth without default org), set orgId
              if (!dbUser.orgId) {
                await User.updateOne({ _id: dbUser._id }, { $set: { orgId: inv.orgId } })
              }
            }
            await Invite.updateOne({ _id: (inv as any)._id }, { $set: { status: 'accepted', acceptedBy: dbUser._id } })
          } catch {}
        }
      } catch {}
      try {
        if (dbUser?.orgId) {
          await trackEvent({
            orgId: String(dbUser.orgId),
            userId: String(dbUser._id),
            module: 'auth',
            type: 'auth.login',
            meta: { provider: account?.provider },
          })
        }
      } catch (err) {
        console.warn('[auth] failed to track login event', err)
      }
      return true
    },
    async session({ session }) {
      await dbConnect()
      const dbUser = await User.findOne({ email: session.user?.email })
      if (dbUser) {
        ;(session.user as any).id = dbUser._id.toString()
        ;(session.user as any).teamId = dbUser.teamId?.toString()
        ;(session.user as any).orgId = dbUser.orgId?.toString()
        // Derive role from org membership, not from User document (prevents self-escalation)
        let effectiveRole = dbUser.role || 'member'
        if (dbUser.orgId) {
          try {
            const org = await Org.findById(dbUser.orgId).lean()
            const inOrg = org?.members?.find((m: any) => String(m.userId) === String(dbUser._id))
            if (inOrg?.role) effectiveRole = inOrg.role
          } catch {}
        }
        ;(session.user as any).role = effectiveRole
      }
      return session
    },
  },
})
