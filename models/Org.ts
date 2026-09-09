// models/Org.ts
import mongoose from 'mongoose';
import type { Model } from 'mongoose';
const { Schema } = mongoose

// Org-level roles (team membership within an org)
// owner   — full access + billing, one per org
// manager — team management + all modules, no billing
// editor  — content generation only, no team management
// viewer  — read-only access
export type Role = 'owner' | 'manager' | 'editor' | 'viewer';
export const PLANS = ['Trial', 'Starter', 'Pro', 'Business'] as const;
export type Plan = typeof PLANS[number];

function toCanonicalPlan(v: any): Plan {
  const s = String(v ?? '').toLowerCase();
  if (s === 'trial' || s === 'free' || s === 'freemonth' || s === 'free_trial') return 'Trial';
  if (s === 'starter') return 'Starter';
  if (s === 'pro') return 'Pro';
  if (s === 'business') return 'Business';
  return 'Trial';
}

export interface BrandVoice {
  companyName?: string;
  productDescription?: string;
  targetAudience?: string;
  toneOfVoice?: string;
  brandKeywords?: string[];
  bannedWords?: string[];
  contentGoals?: string[];
  writingStyle?: string;
  competitors?: string[];
}

export interface OrgDoc extends mongoose.Document {
  name: string;
  plan: Plan;
  subscription?: { id?: string } | null;
  billingCustomerId?: string | null;
  stripeTokensItemId?: string | null;
  stripeMinutesItemId?: string | null;
  stripePlanItemId?: string | null;
  overageEnabled: boolean;
  usagePeriodStart?: Date | null;
  usagePeriodEnd?: Date | null;
  usage: Record<string, number>;
  kpi: {
    contentsProduced?: number;
    watchTimeMinutes?: number;
    leadsCaptured?: number;
    adVariants?: number;
    emailsDrafted?: number;
  };
  brandVoice?: BrandVoice;
  onboarded?: boolean;
  members: Array<{ userId: mongoose.Types.ObjectId; role: Role; joinedAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrgSchema = new Schema<OrgDoc>(
  {
    name: { type: String, required: true },
    plan: {
      type: String,
      enum: PLANS,
      default: 'Trial',
      index: true,
      set: toCanonicalPlan, // normalize on doc assignment AND (with option below) on update queries
    },
    subscription: { id: { type: String } },
    billingCustomerId: { type: String },
    stripeTokensItemId: { type: String },
    stripeMinutesItemId: { type: String },
    stripePlanItemId: { type: String },
    overageEnabled: { type: Boolean, default: false },
    usagePeriodStart: { type: Date },
    usagePeriodEnd: { type: Date },
    usage: { type: Schema.Types.Mixed, default: {} },
    kpi: { type: Schema.Types.Mixed, default: {} },
    brandVoice: { type: Schema.Types.Mixed, default: {} },
    onboarded: { type: Boolean, default: false },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'manager', 'editor', 'viewer'], default: 'editor' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Important: apply setters on update queries too
(OrgSchema as any).set('runSettersOnQuery', true);

// Secondary index
OrgSchema.index({ usagePeriodEnd: 1 });

// Extra safety: normalize in update middlewares (covers $set & replacement)
function normalizePlanInUpdate(this: any) {
  const update = this.getUpdate?.();
  if (!update) return;
  const tgt = update.$set ?? update;
  if (tgt && Object.prototype.hasOwnProperty.call(tgt, 'plan')) {
    tgt.plan = toCanonicalPlan(tgt.plan);
  }
}
OrgSchema.pre('updateOne', normalizePlanInUpdate);
OrgSchema.pre('updateMany', normalizePlanInUpdate);
OrgSchema.pre('findOneAndUpdate', normalizePlanInUpdate);

export const Org: Model<OrgDoc> = (mongoose.models.Org as Model<OrgDoc>) || mongoose.model<OrgDoc>('Org', OrgSchema);
export default Org;
