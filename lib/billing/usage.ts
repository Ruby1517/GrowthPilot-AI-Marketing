import { stripe } from '@/lib/stripe';
import { dbConnect } from '@/lib/db';
import Org from '@/models/Org';

type ReportArgs = { tokens?: number; minutes?: number; at?: number; sourceId?: string };

export async function reportUsageForOrg(orgId: string, {
  tokens = 0,
  minutes = 0,
  at = Math.floor(Date.now() / 1000), // Stripe expects seconds
  sourceId,
}: ReportArgs) {
  await dbConnect();
  const org = await Org.findById(orgId).lean();
  // If there's no active subscription, quietly skip reporting.
  if (!org?.subscription?.id) return [];

  const tokensItemId  = (org as any).stripeTokensItemId;
  const minutesItemId = (org as any).stripeMinutesItemId;

  const key = (s: string) => (sourceId ? `usage_${orgId}_${s}_${sourceId}` : undefined);
  const out: Array<{ kind: 'tokens' | 'minutes'; qty: number }> = [];

  if (tokens > 0 && tokensItemId) {
    await stripe.subscriptionItems.createUsageRecord(
      tokensItemId,
      { quantity: Math.floor(tokens), timestamp: at, action: 'increment' },
      key('tokens') ? { idempotencyKey: key('tokens') } : undefined
    );
    out.push({ kind: 'tokens', qty: tokens });
  }
  if (minutes > 0 && minutesItemId) {
    await stripe.subscriptionItems.createUsageRecord(
      minutesItemId,
      { quantity: Math.floor(minutes), timestamp: at, action: 'increment' },
      key('minutes') ? { idempotencyKey: key('minutes') } : undefined
    );
    out.push({ kind: 'minutes', qty: minutes });
  }

  return out;
}
