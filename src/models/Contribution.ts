import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CONTRIBUTION_STATUSES,
  PAYMENT_METHODS,
  type ContributionStatus,
  type PaymentMethod,
} from "@/types";

export interface ContributionDoc {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  personId: Types.ObjectId;
  /** Stored in the smallest currency unit (poisha) to avoid float drift. */
  amountMinor: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  status: ContributionStatus;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contributionSchema = new Schema<ContributionDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Amount must be a whole number of poisha.",
      },
    },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true, default: "CASH" },
    transactionReference: { type: String, trim: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 2000 },
    // Contributions are never hard-deleted; voiding preserves the paper trail
    // while removing the record from every total.
    status: {
      type: String,
      enum: CONTRIBUTION_STATUSES,
      required: true,
      default: "ACTIVE",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "contributions" },
);

contributionSchema.index({ eventId: 1, personId: 1 });
contributionSchema.index({ eventId: 1, paymentDate: -1 });
contributionSchema.index({ personId: 1, paymentDate: -1 });
contributionSchema.index({ paymentDate: -1 });
contributionSchema.index({ status: 1 });

export const Contribution: Model<ContributionDoc> =
  (models.Contribution as Model<ContributionDoc>) ??
  model<ContributionDoc>("Contribution", contributionSchema);
