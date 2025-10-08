import mongoose, { Schema, Types } from 'mongoose'

export type Platform = 'instagram' | 'tiktok' | 'linkedin' | 'x'
export type Tone = 'casual' | 'professional' | 'witty' | 'inspirational' | 'authoritative'

const VariantSchema = new Schema({
  platform: { type: String, enum: ['instagram','tiktok','linkedin','x'], required: true },
  text: { type: String, required: true },
  hashtags: [String],
  altText: String,
  suggestions: [String], // image ideas
}, { _id: false })

const PostSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  topic: String,      // topic / url / brief
  tone: { type: String, enum: ['casual','professional','witty','inspirational','authoritative'], default: 'casual' },
  variants: [VariantSchema],
  scheduledAt: Date,  // optional (for calendar)
  cost: {             // tracked per generation
    inputTokens: Number,
    outputTokens: Number,
    usd: Number,
    model: String,
  },
  metrics: {          // minimal analytics
    copied: { type: Number, default: 0 },
    downloaded: { type: Number, default: 0 },
  },
}, { timestamps: true })

export default mongoose.models.Post || mongoose.model('Post', PostSchema)
