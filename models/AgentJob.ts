import mongoose from 'mongoose'
import type { Model } from 'mongoose'
const { Schema } = mongoose

export type AgentStep = {
  tool: string
  label: string
  status: 'running' | 'done' | 'failed'
  input: Record<string, any>
  output?: any
  error?: string
  startedAt: Date
  completedAt?: Date
}

export interface AgentJobDoc extends mongoose.Document {
  orgId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  brief: string
  company?: string
  audience?: string
  status: 'queued' | 'running' | 'done' | 'failed'
  steps: AgentStep[]
  summary?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

const StepSchema = new Schema<AgentStep>({
  tool:         { type: String, required: true },
  label:        { type: String, required: true },
  status:       { type: String, enum: ['running','done','failed'], required: true },
  input:        { type: Schema.Types.Mixed, default: {} },
  output:       { type: Schema.Types.Mixed },
  error:        { type: String },
  startedAt:    { type: Date, default: () => new Date() },
  completedAt:  { type: Date },
}, { _id: false })

const AgentJobSchema = new Schema<AgentJobDoc>(
  {
    orgId:    { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    brief:    { type: String, required: true },
    company:  { type: String },
    audience: { type: String },
    status:   { type: String, enum: ['queued','running','done','failed'], default: 'queued', index: true },
    steps:    { type: [StepSchema], default: [] },
    summary:  { type: String },
    error:    { type: String },
  },
  { timestamps: true }
)

AgentJobSchema.index({ orgId: 1, createdAt: -1 })

export const AgentJob: Model<AgentJobDoc> =
  (mongoose.models.AgentJob as Model<AgentJobDoc>) || mongoose.model<AgentJobDoc>('AgentJob', AgentJobSchema)
export default AgentJob
