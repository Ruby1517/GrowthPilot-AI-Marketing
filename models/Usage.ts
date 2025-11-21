import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const UsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true },
  module: { type: String, index: true }, // "mailpilot"
  unit: { type: String, default: 'tokens' },
  amount: Number,
  meta: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true },
});

export default (mongoose.models.Usage as mongoose.Model<any>) || model('Usage', UsageSchema);
