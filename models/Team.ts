// models/Team.ts (simple)
import { Schema, model, models } from 'mongoose'
const TeamSchema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true })
export default models.Team || model('Team', TeamSchema)
