// import mongoose, { Schema, model } from "mongoose";

// const ClipOutputSchema = new Schema({
//   jobId: { type: Schema.Types.ObjectId, index: true, required: true },
//   idx: Number,
//   startSec: Number,
//   endSec: Number,
//   score: Number,
//   title: String,
//   thumbText: String,
//   srt: { bucket: String, region: String, key: String },
//   mp4_916: { bucket: String, region: String, key: String, size: Number },
//   mp4_11:  { bucket: String, region: String, key: String, size: Number },
//   createdAt: { type: Date, default: Date.now },
// });

// export default (mongoose.models.ClipOutput as mongoose.Model<any>) || model("ClipOutput", ClipOutputSchema);


// models/ClipOutput.ts
import mongoose, { Schema, models, model } from 'mongoose';

const ClipOutputSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'ClipJob', index: true, required: true },
  index: { type: Number, default: 0 }, // 0..N-1 if multiple outputs

  url:   { type: String, required: true },
  thumb: { type: String },
  bytes: { type: Number },

  // duration of this single output (seconds)
  durationSec: { type: Number, required: true },
  // optional storage metadata
  storageKey: { type: String },  // e.g., s3://bucket/key.mp4
  codec:      { type: String },
}, { timestamps: true });

ClipOutputSchema.index({ jobId: 1, index: 1 }, { unique: false });

export const ClipOutput = (models.ClipOutput as any) || model('ClipOutput', ClipOutputSchema);
export default ClipOutput;
