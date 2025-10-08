import { Schema, model, models } from "mongoose";

const TimelineSchema = new Schema({
  tStart: Number,
  tEnd: Number,
  assetUrl: String,
  caption: String
},{ _id:false });

const VideoSchema = new Schema({
  niche: String,
  topic: String,
  title: String,
  description: String,
  script: String,
  voiceUrl: String,
  timeline: [TimelineSchema],
  s3Key: String,
  duration: Number,
  ytVideoId: String,
}, { timestamps: true });

export default models.Video || model("Video", VideoSchema);
