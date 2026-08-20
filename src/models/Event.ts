import { Schema, model, models, type Model, type Types } from "mongoose";
import { EVENT_STATUSES, type EventStatus } from "@/types";

export interface EventDoc {
  _id: Types.ObjectId;
  name: string;
  eventType?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  status: EventStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    eventType: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    startDate: { type: Date },
    endDate: { type: Date },
    location: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: EVENT_STATUSES, required: true, default: "UPCOMING" },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "events" },
);

eventSchema.index({ name: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ startDate: -1 });

export const Event: Model<EventDoc> =
  (models.Event as Model<EventDoc>) ?? model<EventDoc>("Event", eventSchema);
