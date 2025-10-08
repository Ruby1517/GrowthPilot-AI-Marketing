// models/BlogDoc.ts
import mongoose, { Schema, model } from "mongoose";

const BlogDocSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true },

  // inputs
  keywords: [String],
  url: String,
  tone: String,
  wordCount: Number,
  targetLinks: [{ anchor: String, url: String }],

  // generated
  brief: String,
  outline: [String],
  draft: String, // markdown
  meta: { title: String, description: String },
  faq: [{ q: String, a: String }],
  altText: [String],
  citations: [String],
  readability: { score: Number, grade: String },

  // ⬇️ rename to avoid clashing with Mongoose's Model.schema
  schemaLD: {
    article: Schema.Types.Mixed,
    faq: Schema.Types.Mixed,
  },

  // optional organizing
  titleOverride: String,
  tags: [String],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

BlogDocSchema.pre("save", function (next) {
  (this as any).updatedAt = new Date();
  next();
});

export default (mongoose.models.BlogDoc as mongoose.Model<any>) || model("BlogDoc", BlogDocSchema);
