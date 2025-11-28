export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import Stripe from 'stripe'

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return Response.json({ ok: false, error: 'build' }, { status: 503 })
  const sk = process.env.STRIPE_SECRET_KEY
  if (!sk) return Response.json({ ok: false, error: 'missing_key' }, { status: 400 })
  const s = new Stripe(sk as any)
  const list = await s.prices.list({ active: true, limit: 20, expand: ['data.product'] })
  const simplified = list.data
    .filter(p => p.recurring)
    .map(p => ({
      id: p.id,
      nickname: p.nickname,
      lookup_key: p.lookup_key,
      interval: p.recurring?.interval,
      usage_type: p.recurring?.usage_type,
      amount: p.unit_amount,
      product: typeof p.product === 'string' ? p.product : ((p.product as any)?.name || ''),
    }))
  return Response.json(simplified)
}
