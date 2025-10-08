import mongoose, { Schema, Model } from 'mongoose';

const ScriptSection = new Schema(
  {
    type: { type: String },           // 'intro' | 'point' | 'outro'
    title: String,
    text: String,
    ts: String,                       // "00:00" style (optional)
  },
  { _id: false }
);

const ViralProjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, index: true, required: true },
    keyword: { type: String, index: true },
    ideas: [
      {
        title: String,
        angle: String,
        type: { type: String },       // 'trending' | 'evergreen'
      },
    ],
    selectedIdea: { type: String },
    script: {
      title: String,
      sections: [ScriptSection],      // ordered array
      cta: String,
    },
    voice: { type: String, default: 'neutral' }, // 'neutral' | 'male' | 'female' | etc.
    tts: {
      key: String,
      bucket: String,
      region: String,
      url: String,
      durationSec: Number,
    },
    video: {
      key: String,
      bucket: String,
      region: String,
      url: String,
      status: { type: String, enum: ['none', 'queued', 'processing', 'ready', 'failed'], default: 'none' },
      error: String,
    },
    status: { type: String, enum: ['draft', 'tts-ready', 'video-ready'], default: 'draft', index: true },
  },
  { timestamps: true }
);

export default models.ViralProject || mongoose.model('ViralProject', ViralProjectSchema);
