import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import Org from '@/models/Org'
import Team from '@/models/Team'

export const { handlers, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Credentials({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        await dbConnect()
        const user = await User.findOne({ email: creds?.email })
        if (!user || !user.passwordHash) return null
        const ok = await bcrypt.compare(String(creds?.password ?? ''), user.passwordHash)
        return ok ? { id: user._id.toString(), email: user.email, name: user.name } : null
      },
    }),
  ],
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, profile }) {
      await dbConnect()
      const email = user?.email || (profile as any)?.email
      if (!email) return false
      let dbUser = await User.findOne({ email })
      if (!dbUser) {
        const org = await Org.create({ name: `${user?.name || 'My'} Org` })
        const team = await Team.create({ name: `${user.name || 'My'} Team`, ownerId: org.ownerId })
        dbUser = await User.create({
          name: user?.name, email, image: (user as any).image, teamId: team._id,
          role: 'member', orgId: org._id
        })
        org.ownerId = dbUser._id
        // Trial users default to member; ownerId is set for internal reference
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
