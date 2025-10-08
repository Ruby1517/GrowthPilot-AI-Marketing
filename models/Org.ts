// models/Org.ts
import mongoose, { Schema, Model, models, model } from 'mongoose';

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export const PLANS = ['Starter', 'Pro', 'Business'] as const;
export type Plan = typeof PLANS[number];

function toCanonicalPlan(v: any): Plan {
  const s = String(v ?? '').toLowerCase();
  if (s === 'starter') return 'Starter';
  if (s === 'pro') return 'Pro';
  if (s === 'business') return 'Business';
  return 'Starter';
}

export interface OrgDoc extends mongoose.Document {
  name: string;
  plan: Plan;
  subscription?: { id?: string } | null;
  billingCustomerId?: string | null;
  stripeTokensItemId?: string | null;
  stripeMinutesItemId?: string | null;
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
      default: 'Starter',
      index: true,
      set: toCanonicalPlan, // normalize on doc assignment AND (with option below) on update queries
    },
    subscription: { id: { type: String } },
    billingCustomerId: { type: String },
    stripeTokensItemId: { type: String },
    stripeMinutesItemId: { type: String },
    overageEnabled: { type: Boolean, default: false },
    usagePeriodStart: { type: Date },
    usagePeriodEnd: { type: Date },
    usage: { type: Schema.Types.Mixed, default: {} },
    kpi: { type: Schema.Types.Mixed, default: {} },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Important: apply setters on update queries too
OrgSchema.set('runSettersOnQuery', true);

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

export const Org: Model<OrgDoc> = (models.Org as Model<OrgDoc>) || model<OrgDoc>('Org', OrgSchema);
export default Org;
