export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { dbConnect } from '@/lib/db'
import Org from '@/models/Org'
import { stripe } from '@/lib/stripe' // ✅ reuse configured Stripe client

type Body = {
  tokens?: number
  minutes?: number
  /** optional seconds-epoch; defaults to now */
  at?: number
  /** optional unique job/run id for idempotency */
  sourceId?: string
  /** if true, don’t send to Stripe; just echo what would happen */
  dryRun?: boolean
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  await dbConnect()
  const org = await Org.findById((session.user as any).orgId)
  if (!org?.subscription?.id) {
    return new Response('No active subscription', { status: 400 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const tokens = Number(body.tokens || 0)
  const minutes = Number(body.minutes || 0)
  const at = Number.isFinite(body.at) ? Math.floor(Number(body.at)) : Math.floor(Date.now() / 1000)
  const dryRun = !!body.dryRun
  const sourceId = (body.sourceId || '').toString().slice(0, 80) || undefined

  // Basic validation
  if (![tokens, minutes].some(v => v > 0)) {
    return new Response('Nothing to report (tokens or minutes must be > 0)', { status: 400 })
  }
  if (tokens < 0 || minutes < 0) {
    return new Response('Negative usage is not allowed', { status: 400 })
  }
  // Subscription item ids saved by your webhook
  const tokensItemId = (org as any).stripeTokensItemId as string | undefined
  const minutesItemId = (org as any).stripeMinutesItemId as string | undefined
  if ((tokens > 0 && !tokensItemId) || (minutes > 0 && !minutesItemId)) {
    return new Response('Missing subscription item IDs (complete checkout & webhook first)', { status: 400 })
  }

  // Prepare results
  const results: Array<{ kind: 'tokens' | 'minutes'; itemId: string; quantity: number; timestamp: number; idempotencyKey?: string }> = []

  // Helper to generate idempotency keys (prevents double-billing the same job)
  const makeKey = (suffix: string) =>
    sourceId ? `usage_${org._id.toString()}_${suffix}_${sourceId}` : undefined

  try {
    if (dryRun) {
      if (tokens > 0 && tokensItemId) {
        results.push({ kind: 'tokens', itemId: tokensItemId, quantity: Math.floor(tokens), timestamp: at })
      }
      if (minutes > 0 && minutesItemId) {
        results.push({ kind: 'minutes', itemId: minutesItemId, quantity: Math.floor(minutes), timestamp: at })
      }
      return Response.json({ ok: true, dryRun: true, reported: results })
    }

    // Report tokens (raw count; your price uses transform /1000 to bill per 1k)
    if (tokens > 0 && tokensItemId) {
      const idempotencyKey = makeKey('tokens')
      await stripe.subscriptionItems.createUsageRecord(
        tokensItemId,
        { quantity: Math.floor(tokens), timestamp: at, action: 'increment' },
        idempotencyKey ? { idempotencyKey } : undefined
      )
      results.push({ kind: 'tokens', itemId: tokensItemId, quantity: Math.floor(tokens), timestamp: at, idempotencyKey })
    }

    // Report minutes (1 unit = 1 minute)
    if (minutes > 0 && minutesItemId) {
      const idempotencyKey = makeKey('minutes')
      await stripe.subscriptionItems.createUsageRecord(
        minutesItemId,
        { quantity: Math.floor(minutes), timestamp: at, action: 'increment' },
        idempotencyKey ? { idempotencyKey } : undefined
      )
      results.push({ kind: 'minutes', itemId: minutesItemId, quantity: Math.floor(minutes), timestamp: at, idempotencyKey })
    }

    return Response.json({ ok: true, reported: results })
  } catch (err: any) {
    console.error('[report-usage] error', err)
    // Don’t leak internals; return minimal info
    return new Response('Failed to report usage', { status: 500 })
  }
}
