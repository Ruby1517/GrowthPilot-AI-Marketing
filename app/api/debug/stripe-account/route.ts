import Stripe from 'stripe'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return Response.json({ ok: false, error: 'build' }, { status: 503 })
  const sk = process.env.STRIPE_SECRET_KEY || ''
  if (!sk) return Response.json({ ok: false, error: 'missing_key' }, { status: 400 })
  const s = new Stripe(sk as any)
  const acct = await s.accounts.retrieve() as any;
  return Response.json({ keyPrefix: sk.slice(0,4), account: acct.id, livemode: !!acct.livemode })
}
