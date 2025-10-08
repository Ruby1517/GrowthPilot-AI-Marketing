import mongoose, { Schema, models } from 'mongoose';

const BrandImageSchema = new Schema({
  type: { type: String },           // "cover" | "post" | "story"
  key: String,
  bucket: String,
  region: String,
  url: String,
}, { _id: false });

const BrandDocSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true, required: true },
  company: String,
  vibe: String,
  palette: [String],                // e.g. ["#0F172A", ...]
  fonts: [String],                  // e.g. ["Inter + Playfair", ...] or two names
  voice: [String],                  // e.g. ["confident","friendly","clear"]
  images: [BrandImageSchema],
  logo: String,
  pdfUrl: String,

  // NEW: user selections
  primary: String,                  // chosen primary color HEX
  secondary: String,                // chosen secondary color HEX
  fontPrimary: String,              // chosen primary font (family name)
  fontSecondary: String,            // chosen secondary font (family name)
  voiceSelected: [String],          // chosen voice words
}, { timestamps: true });

export default models.BrandDoc || mongoose.model('BrandDoc', BrandDocSchema);
