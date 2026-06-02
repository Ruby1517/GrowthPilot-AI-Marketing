import mongoose from 'mongoose'
import type { Model } from 'mongoose'
const { Schema } = mongoose

export type SocialPlatform = 'linkedin' | 'twitter'

export interface SocialAccountDoc extends mongoose.Document {
  orgId:            mongoose.Types.ObjectId
  userId:           mongoose.Types.ObjectId
  platform:         SocialPlatform
  platformUserId:   string
  platformUsername: string
  displayName:      string
  accessToken:      string   // AES-256-GCM encrypted
  refreshToken?:    string   // encrypted, if provided
  expiresAt?:       Date
  scope:            string
  connectedAt:      Date
}

const SocialAccountSchema = new Schema<SocialAccountDoc>(
  {
    orgId:            { type: Schema.Types.ObjectId, ref: 'Org',  required: true, index: true },
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform:         { type: String, enum: ['linkedin','twitter'], required: true },
    platformUserId:   { type: String, required: true },
    platformUsername: { type: String, default: '' },
    displayName:      { type: String, default: '' },
    accessToken:      { type: String, required: true },
    refreshToken:     { type: String },
    expiresAt:        { type: Date },
    scope:            { type: String, default: '' },
    connectedAt:      { type: Date, default: Date.now },
  },
  { timestamps: false }
)

SocialAccountSchema.index({ orgId: 1, platform: 1 }, { unique: true })

export const SocialAccount: Model<SocialAccountDoc> =
  (mongoose.models.SocialAccount as Model<SocialAccountDoc>) ||
  mongoose.model<SocialAccountDoc>('SocialAccount', SocialAccountSchema)

export default SocialAccount
