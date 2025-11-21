// models/Invite.ts
import mongoose from 'mongoose';
const { Schema, Model, models, model } = mongoose;
import type { Role } from './Org';

export interface InviteDoc extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  email: string;
  role: Role;
  token: string;         // signed random
  expiresAt: Date;
  acceptedBy?: mongoose.Types.ObjectId | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<InviteDoc>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    email: { type: String, required: true, index: true },
    role:  { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending', index: true },
  },
  { timestamps: true }
);

export const Invite: Model<InviteDoc> =
  (models.Invite as Model<InviteDoc>) || model<InviteDoc>('Invite', InviteSchema);
export default Invite;
