import { Schema, model, models } from "mongoose";

const StepSchema = new Schema({
  name: String,
  status: { type: String, enum: ["queued","running","done","failed"], default: "queued" },
  meta: Schema.Types.Mixed
},{ _id: false });

const JobSchema = new Schema({
  type: { type: String, default: "video" },
  niche: String,
  topic: String,
  status: { type: String, enum: ["queued","running","failed","done"], default: "queued" },
  steps: [StepSchema],
  outputVideoUrl: String,
  outputThumbUrl: String,
  error: String,
}, { timestamps: true });

export default models.Job || model("Job", JobSchema);
