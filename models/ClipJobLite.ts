import mongoose, { Schema, model, models } from "mongoose";

const ClipJobLiteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    inputKey: { type: String, required: true },   // S3 key for input video
    outputKey: { type: String },                  // S3 key for rendered clip
    status: { type: String, enum: ["queued", "processing", "completed", "failed"], default: "queued", index: true },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default models.ClipJobLite || model("ClipJobLite", ClipJobLiteSchema);
