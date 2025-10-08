import Stripe from 'stripe'
export const runtime = 'nodejs'
export async function GET() {
  const sk = process.env.STRIPE_SECRET_KEY || ''
  const s = new Stripe(sk, { apiVersion: '2024-06-20' })
  const acct = await s.accounts.retrieve()
  return Response.json({ keyPrefix: sk.slice(0,4), account: acct.id, livemode: acct.livemode })
}