import { Schema, model, models } from 'mongoose'
const TemplateSchema = new Schema({ 
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', index: true }, 
    name: String, 
    module: { type: String, enum: ['post','clip','blog','ad','lead','mail','brand'] }, 
    version: { type: Number, default: 1 }, 
    schema: Schema.Types.Mixed, prompt: String, 
    abSlot: { type: String, enum: ['A','B','C'], default: 'A' }, 
    active: { type: Boolean, default: true } }, { timestamps: true })
export default models.Template || model('Template', TemplateSchema)
