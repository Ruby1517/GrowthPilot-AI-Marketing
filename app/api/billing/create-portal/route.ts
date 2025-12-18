import Stripe from 'stripe'
import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Org from '@/models/Org'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  await dbConnect()

  const org = await Org.findById((session.user as any).orgId)
  if (!org?.billingCustomerId) return new Response('No Stripe customer', { status: 400 })

  const portal = await stripe.billingPortal.sessions.create({
    customer: org.billingCustomerId,
    return_url: `${process.env.AUTH_URL || process.env.NEXTAUTH_URL}/billing`,
  })
  return Response.json({ url: portal.url })
}
