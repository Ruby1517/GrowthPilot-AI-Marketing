import mongoose, { Schema, model } from 'mongoose';

const EmailSchema = new Schema({
  subjectA: String,
  subjectB: String,
  preheader: String,
  html: String,
  text: String,
  step: Number,
  delayDays: { type: Number, default: 0 },
});

const RecipientSchema = new Schema({
  email: { type: String, index: true },
  first_name: String,
  last_name: String,
  company: String,
  custom: Schema.Types.Mixed,
});

const MailCampaignSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true },
  type: { type: String, enum: ['cold','warm','newsletter','nurture'], index: true },
  title: String,
  offer: String,
  audience: String,
  tone: String,
  sender: {
    sender_name: String,
    sender_company: String,
    sender_email: String,
  },
  mergeVars: [String],
  emails: [EmailSchema],
  recipients: [RecipientSchema],
  spam: {
    score: Number,
    hits: [String],
  },
  cost: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

export default (mongoose.models.MailCampaign as mongoose.Model<any>) || model('MailCampaign', MailCampaignSchema);
