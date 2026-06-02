import mongoose from 'mongoose'
import type { Model } from 'mongoose'
const { Schema } = mongoose

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface AutopilotDoc extends mongoose.Document {
  orgId:      mongoose.Types.ObjectId
  userId:     mongoose.Types.ObjectId
  name:       string
  brief:      string
  company?:   string
  audience?:  string
  cadence:    Cadence
  hour:       number          // 0–23, UTC hour to run
  status:     'active' | 'paused'
  nextRunAt:  Date
  lastRunAt?: Date
  lastJobId?: string
  runCount:   number
  createdAt:  Date
  updatedAt:  Date
}

const AutopilotSchema = new Schema<AutopilotDoc>(
  {
    orgId:      { type: Schema.Types.ObjectId, ref: 'Org',  required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:       { type: String, required: true, maxlength: 120 },
    brief:      { type: String, required: true, maxlength: 2000 },
    company:    { type: String, maxlength: 200 },
    audience:   { type: String, maxlength: 500 },
    cadence:    { type: String, enum: ['daily','weekly','biweekly','monthly'], default: 'weekly' },
    hour:       { type: Number, default: 9, min: 0, max: 23 },
    status:     { type: String, enum: ['active','paused'], default: 'active', index: true },
    nextRunAt:  { type: Date, required: true, index: true },
    lastRunAt:  { type: Date },
    lastJobId:  { type: String },
    runCount:   { type: Number, default: 0 },
  },
  { timestamps: true }
)

AutopilotSchema.index({ orgId: 1, createdAt: -1 })
AutopilotSchema.index({ status: 1, nextRunAt: 1 })   // for the checker query

export const Autopilot: Model<AutopilotDoc> =
  (mongoose.models.Autopilot as Model<AutopilotDoc>) || mongoose.model<AutopilotDoc>('Autopilot', AutopilotSchema)
export default Autopilot
