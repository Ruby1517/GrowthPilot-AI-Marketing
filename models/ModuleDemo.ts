import mongoose, { Schema, model, models } from 'mongoose';

const ModuleDemoSchema = new Schema(
  {
    module: { type: String, required: true, index: true }, // ModuleKey
    key: { type: String, required: true },                 // S3 key
    url: { type: String },                                  // public or signed URL
  },
  { timestamps: true }
);

export default (models.ModuleDemo as mongoose.Model<any>) || model('ModuleDemo', ModuleDemoSchema);

