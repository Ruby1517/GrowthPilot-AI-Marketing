
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ClipOutputSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'ClipJob', index: true, required: true },
  index: { type: Number, default: 0 }, // 0..N-1 if multiple outputs

  url:   { type: String, required: true },
  thumb: { type: String },
  bytes: { type: Number },

  title: { type: String },
  hook:  { type: String },
  hashtags: [{ type: String }],
  captionText: { type: String },
  thumbnailText: { type: String },
  thumbnailKey: { type: String },
  publishTargets: [{ type: String }],

  rawKey:      { type: String },
  captionKey:  { type: String },
  srtKey:      { type: String },

  // duration of this single output (seconds)
  durationSec: { type: Number, required: true },
  // optional storage metadata
  storageKey: { type: String },  // e.g., s3://bucket/key.mp4
  codec:      { type: String },
  aspect:     { type: String, enum: ['9:16','1:1','16:9'], default: '9:16' },
}, { timestamps: true });

ClipOutputSchema.index({ jobId: 1, index: 1 }, { unique: false });
const existing = models.ClipOutput as mongoose.Model<any> | undefined;
export const ClipOutput = existing || model('ClipOutput', ClipOutputSchema);
export default ClipOutput;
