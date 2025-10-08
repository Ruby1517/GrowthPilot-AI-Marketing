// lib/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
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
    async signIn({ user }) {
      await dbConnect()
      if (!user?.email) return true
      let dbUser = await User.findOne({ email: user.email })
      if (!dbUser) {
        const org = await Org.create({ name: `${user.name || 'My'} Org` })
        const team = await Team.create({ name: `${user.name || 'My'} Team`, ownerId: org.ownerId })
        dbUser = await User.create({
          name: user.name, email: user.email, image: (user as any).image, teamId: team._id,
          role: 'owner', orgId: org._id
        })
        org.ownerId = dbUser._id
        org.members = [{ userId: dbUser._id, role: 'owner' }]
        await org.save()
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
        ;(session.user as any).role = dbUser.role || 'member'
      }
      return session
    },
  },
})
