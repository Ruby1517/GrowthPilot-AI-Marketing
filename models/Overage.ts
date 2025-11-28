import mongoose from 'mongoose';
import type { ObjectId, Model } from 'mongoose';
const { Schema, models, model } = mongoose;

export interface OverageDoc extends mongoose.Document {
  orgId: ObjectId;
  at: Date;
  key: string;
  units: number;
  unitPrice: number;
  amount: number;
  eventId?: ObjectId | null;
  invoiced: boolean;
  invoiceId?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface OverageModel extends Model<OverageDoc> {
  pendingForOrg(orgId: ObjectId): Promise<OverageDoc[]>;
  markInvoiced(ids: ObjectId[], invoiceId: string): Promise<void>;
}

const OverageSchema = new Schema<OverageDoc, OverageModel>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    at: { type: Date, required: true, default: () => new Date(), index: true },
    key: { type: String, required: true },
    units: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    invoiced: { type: Boolean, required: true, default: false, index: true },
    invoiceId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

OverageSchema.pre('validate', function (next) {
  const computed = (this.units ?? 0) * (this.unitPrice ?? 0);
  if (this.amount !== computed) this.amount = computed;
  next();
});

OverageSchema.index({ orgId: 1, invoiced: 1, at: 1 });

OverageSchema.statics.pendingForOrg = function (orgId: ObjectId) {
  return this.find({ orgId, invoiced: false }).sort({ at: 1 }).exec();
};

OverageSchema.statics.markInvoiced = async function (ids: ObjectId[], invoiceId: string) {
  if (!ids.length) return;
  await this.updateMany({ _id: { $in: ids } }, { $set: { invoiced: true, invoiceId } });
};

export const Overage: OverageModel =
  (models.Overage as OverageModel) || model<OverageDoc, OverageModel>('Overage', OverageSchema);
export default Overage;
