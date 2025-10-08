import mongoose, { Schema, model } from "mongoose";

const LeadSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true }, // owner in your app
  site: String,                      // site the widget is embedded on
  playbook: { type: String, index: true },
  name: String,
  email: String,
  company: String,
  message: String,
  transcript: [{ role: String, content: String }], // optional chat transcript
  confidence: Number,               // last assistant confidence about intent/answer
  createdAt: { type: Date, default: Date.now, index: true },
});

export default (mongoose.models.Lead as mongoose.Model<any>) || model("Lead", LeadSchema);
