// import mongoose, { Schema, Model, model } from "mongoose";

// const ClipJobSchema = new Schema({
//   userId: { type: Schema.Types.ObjectId, index: true, required: true },
//   source: { bucket: String, region: String, key: String, contentType: String, duration: Number, fps: Number },
//   status: { type: String, enum: ["queued","processing","done","failed"], default: "queued", index: true },
//   stage:  { type: String, enum: ["queued","probe","transcribe","analyze","render","upload","done","failed"], default: "queued", index: true },
//   progress: { type: Number, default: 0 },
//   error: String,
//   maxClips: { type: Number, default: 6 },
//   minClipSec: { type: Number, default: 20 },
//   maxClipSec: { type: Number, default: 60 },
//   createdAt: { type: Date, default: Date.now, index: true },
//   updatedAt: { type: Date, default: Date.now },
// });
// ClipJobSchema.pre("save", function(next){ this.updatedAt = new Date(); next(); });

// export default (mongoose.models.ClipJob as mongoose.Model<any>) || model("ClipJob", ClipJobSchema);


// models/ClipJob.ts
import mongoose, { Schema, models, model } from 'mongoose';

const ClipJobSchema = new Schema({
  orgId:   { type: Schema.Types.ObjectId, ref: 'Org', index: true, required: true },
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },

  src:     { type: String, default: '' },     // s3 key or URL
  prompt:  { type: String, default: '' },
  aspect:  { type: String, enum: ['9:16','1:1','16:9'], default: '9:16' },
  durationSec: { type: Number, required: true },  // requested per variant
  variants:    { type: Number, default: 1, min: 1, max: 10 },

  // lifecycle
  status:  { type: String, enum: ['queued','processing','done','error'], default: 'queued', index: true },
  error:   { type: String },

  // accounting
  estimateMinutes: { type: Number, default: 0 },
  actualMinutes:   { type: Number, default: 0 },

}, { timestamps: true });

ClipJobSchema.index({ orgId: 1, createdAt: -1 });

export const ClipJob = (models.ClipJob as any) || model('ClipJob', ClipJobSchema);
export default ClipJob;
