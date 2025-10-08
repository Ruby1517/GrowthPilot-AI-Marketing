// models/User.ts
import { Schema, model, models } from 'mongoose'
const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  image: String,
  role: { type: String, enum: ['owner','member'], default: 'member' },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  orgId: { type: Schema.Types.ObjectId, ref: 'Org' },
  passwordHash: String, // only if you add email+password later
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true })
export default models.User || model('User', UserSchema)
