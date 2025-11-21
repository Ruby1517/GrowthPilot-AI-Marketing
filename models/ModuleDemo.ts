import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ModuleDemoSchema = new Schema(
  {
    module: { type: String, required: true, index: true }, // ModuleKey
    key: { type: String, required: true },                 // S3 key
    url: { type: String },                                  // public or signed URL
  },
  { timestamps: true }
);

export default (models.ModuleDemo as mongoose.Model<any>) || model('ModuleDemo', ModuleDemoSchema);
