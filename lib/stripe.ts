
import Stripe from 'stripe'
import Org from '@/models/Org'
import { dbConnect } from '@/lib/db'

const sk = process.env.STRIPE_SECRET_KEY!
if (!sk || !sk.startsWith('sk_')) {
  throw new Error('STRIPE_SECRET_KEY must be set and start with sk_')
}

export const stripe = new Stripe(sk, { apiVersion: '2024-06-20' })

export async function getOrCreateStripeCustomer(orgId: string, email?: string | null) {
  await dbConnect()
  const org = await Org.findById(orgId)
  if (!org) throw new Error('Org not found')

  // If we have a stored customer, verify it still exists
  if (org.billingCustomerId) {
    try {
      await stripe.customers.retrieve(org.billingCustomerId)
      return org.billingCustomerId
    } catch (e: any) {
      if (e?.code === 'resource_missing') {
        // stale ID from another account/mode or deleted in dashboard
        org.billingCustomerId = undefined as any
        await org.save()
      } else {
        throw e
      }
    }
  }

  // Try to reuse an existing customer by email (helps when switching keys)
  if (email) {
    const list = await stripe.customers.list({ email, limit: 1 })
    if (list.data[0]) {
      org.billingCustomerId = list.data[0].id
      await org.save()
      return org.billingCustomerId
    }
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { orgId },
  })
  org.billingCustomerId = customer.id
  await org.save()
  return customer.id
}
