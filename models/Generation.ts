import { Schema, model, models } from 'mongoose'
const GenerationSchema = new Schema({ 
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', index: true }, 
    userId: { type: Schema.Types.ObjectId, ref: 'User' }, 
    module: { type: String, enum: ['post','clip','blog','ad','lead','mail','brand'] }, 
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' }, input: Schema.Types.Mixed, output: Schema.Types.Mixed, 
    cost: { tokens: Number, minutes: Number }, 
    status: { type: String, enum: ['running','done','failed'], default: 'running' }, 
    events: [{ type: String, at: Date, meta: Schema.Types.Mixed }], 
    safety: { ok: Boolean, reasons: [String] } }, { timestamps: true })
export default models.Generation || model('Generation', GenerationSchema)
