// scripts/checkStripeCustomer.ts
import 'dotenv/config'
import Stripe from 'stripe'
const s = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
const id = process.argv[2]
if (!id) throw new Error('Usage: pnpm tsx scripts/checkStripeCustomer.ts cus_...')
s.customers.retrieve(id)
  .then(c => console.log('✅ exists:', (c as any).id))
  .catch(e => console.error('❌ not found:', e.code || e.message))
