import mongoose, { Schema, model, models } from "mongoose";

const PlanSchema = new Schema(
  {
    startSeconds: Number,
    endSeconds: Number,
    durationSeconds: Number,
    hook: String,
    promoLabel: String,
    ctaText: String,
    brandTag: String,
    title: String,
    summary: String,
  },
  { _id: false }
);

const ClipShortSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: false },
    videoKey: { type: String, required: true },
    videoUrl: { type: String, required: true },
    plan: { type: PlanSchema, required: true },
    voiceScript: { type: String, required: false },
    voicePersona: { type: String, required: false },
    voiceStyle: { type: String, required: false },
    voiceId: { type: String, required: false },
    category: { type: String, required: false },
    sourceVideoPath: { type: String, required: false },
    audioMode: { type: String, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type ClipShortType = mongoose.InferSchemaType<typeof ClipShortSchema>;

export default models.ClipShort || model("ClipShort", ClipShortSchema);
