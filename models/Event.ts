// models/Event.ts
import mongoose, { Schema, Model, models, model } from 'mongoose';

export type ModuleKey =
  | 'postpilot' | 'clippilot' | 'blogpilot' | 'adpilot'
  | 'leadpilot' | 'mailpilot' | 'brandpilot' | 'viralpilot';

export type EventType =
  | 'generation.requested' | 'generation.completed'
  | 'asset.uploaded' | 'email.drafted'
  | 'ad.variant_created' | 'lead.captured' | 'lead.intent'
  | 'watchtime.added';

export interface EventDoc extends mongoose.Document {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  module: ModuleKey;
  type: EventType;
  at: Date;
  meta?: Record<string, any>;
  createdAt: Date;
}

const EventSchema = new Schema<EventDoc>(
  {
    orgId:   { type: Schema.Types.ObjectId, ref: 'Org', required: true, index: true },
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module:  { type: String, required: true },
    type:    { type: String, required: true, index: true },
    at:      { type: Date, required: true, default: () => new Date(), index: true },
    meta:    { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EventSchema.index({ orgId: 1, at: 1 });
EventSchema.index({ orgId: 1, module: 1, type: 1, at: 1 });

export const Event: Model<EventDoc> =
  (models.Event as Model<EventDoc>) || model<EventDoc>('Event', EventSchema);
export default Event;
