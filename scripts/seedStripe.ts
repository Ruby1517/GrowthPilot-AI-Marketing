import Stripe from 'stripe'

// Node tip: run with `pnpm tsx scripts/seedStripe.ts`
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

async function main() {
  // 3 plan prices (monthly)
  const starter = await stripe.prices.create({
    currency: 'usd',
    unit_amount: 1900, // $19
    recurring: { interval: 'month' },
    product_data: { name: 'GrowthPilot Starter' },
    nickname: 'Starter',
  })
  const pro = await stripe.prices.create({
    currency: 'usd',
    unit_amount: 4900, // $49
    recurring: { interval: 'month' },
    product_data: { name: 'GrowthPilot Pro' },
    nickname: 'Pro',
  })
  const business = await stripe.prices.create({
    currency: 'usd',
    unit_amount: 14900, // $149
    recurring: { interval: 'month' },
    product_data: { name: 'GrowthPilot Business' },
    nickname: 'Business',
  })

  // 2 metered prices (shared across plans)
  // Tokens billed per 1,000 (example: $0.002 per token => $2 per 1k)
  const tokens = await stripe.prices.create({
    currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered', aggregate_usage: 'sum' },
    unit_amount: 200, // $2 per unit
    product_data: { name: 'AI Tokens (per 1,000)' },
    nickname: 'Tokens',
    transform_quantity: { divide_by: 1000, round: 'up' }, // report raw tokens; Stripe bills per 1k
  })

  // Minutes billed per minute ($0.03/min)
  const minutes = await stripe.prices.create({
    currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered', aggregate_usage: 'sum' },
    unit_amount: 3, // $0.03 per unit (Stripe amounts are cents)
    product_data: { name: 'Video Minutes (per minute)' },
    nickname: 'Minutes',
  })

  console.log('Plan price IDs:')
  console.log('STARTER_PRICE_ID=', starter.id)
  console.log('PRO_PRICE_ID=', pro.id)
  console.log('BUSINESS_PRICE_ID=', business.id)
  console.log('TOKENS_PRICE_ID=', tokens.id)
  console.log('MINUTES_PRICE_ID=', minutes.id)
}

main().catch(e => { console.error(e); process.exit(1) })
