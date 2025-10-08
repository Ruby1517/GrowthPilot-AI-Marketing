export const runtime = 'nodejs'
import Stripe from 'stripe'

export async function GET() {
  const s = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
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
      product: typeof p.product === 'string' ? p.product : p.product.name,
    }))
  return Response.json(simplified)
}
