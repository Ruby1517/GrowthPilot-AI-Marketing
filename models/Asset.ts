import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const AssetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true },
  projectId: { type: Schema.Types.ObjectId, index: true },
  key: { type: String, required: true, index: true, unique: true },
  bucket: { type: String, required: true },
  region: { type: String, required: true },
  url: { type: String },
  contentType: { type: String },
  size: { type: Number },
  etag: { type: String },
  width: Number,
  height: Number,
  status: { type: String, enum: ['pending','uploaded','processing','ready','failed'], default: 'pending', index: true },
  type: { type: String, enum: ['video','image','audio','doc','other'], default: 'other' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default (mongoose.models.Asset as mongoose.Model<any>) || model("Asset", AssetSchema);
