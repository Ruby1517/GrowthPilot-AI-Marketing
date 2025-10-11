import { Schema, model, models } from 'mongoose'
const InvoiceSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Org', index: true },
  stripeInvoiceId: String,
  amountDue: Number,
  amountPaid: Number,
  currency: { type: String, default: 'usd' },
  periodStart: Date,
  periodEnd: Date,
  status: String,
}, { timestamps: true })
export default models.Invoice || model('Invoice', InvoiceSchema)
