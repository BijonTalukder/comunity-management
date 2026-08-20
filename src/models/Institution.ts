import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  INSTITUTION_STATUSES,
  INSTITUTION_TYPES,
  type InstitutionStatus,
  type InstitutionType,
} from "@/types";

export interface InstitutionDoc {
  _id: Types.ObjectId;
  name: string;
  normalizedName: string;
  type: InstitutionType;
  address?: string;
  area?: string;
  city?: string;
  country?: string;
  status: InstitutionStatus;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Collapses casing/punctuation/whitespace so near-duplicates collide. */
export function normalizeInstitutionName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const institutionSchema = new Schema<InstitutionDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    normalizedName: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: INSTITUTION_TYPES, required: true },
    address: { type: String, trim: true, maxlength: 500 },
    area: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 160 },
    country: { type: String, trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: INSTITUTION_STATUSES,
      required: true,
      default: "ACTIVE",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "institutions" },
);

institutionSchema.index({ name: 1 });
institutionSchema.index({ type: 1 });
institutionSchema.index({ status: 1 });
// The same institution name may legitimately exist as different types
// (e.g. "Ideal" School vs "Ideal" College), so uniqueness is per type.
institutionSchema.index({ normalizedName: 1, type: 1 }, { unique: true });

export const Institution: Model<InstitutionDoc> =
  (models.Institution as Model<InstitutionDoc>) ??
  model<InstitutionDoc>("Institution", institutionSchema);
