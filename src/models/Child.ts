import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  EDUCATION_STATUSES,
  GENDERS,
  RELATIONSHIPS,
  type EducationStatus,
  type Gender,
  type Relationship,
} from "@/types";

export interface ChildDoc {
  _id: Types.ObjectId;
  parentId: Types.ObjectId;
  fullName: string;
  gender: Gender;
  dateOfBirth?: Date;
  relationship: Relationship;
  educationStatus: EducationStatus;
  institutionId?: Types.ObjectId;
  classOrGrade?: string;
  section?: string;
  rollNumber?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const childSchema = new Schema<ChildDoc>(
  {
    parentId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    gender: { type: String, enum: GENDERS, required: true },
    dateOfBirth: { type: Date },
    relationship: { type: String, enum: RELATIONSHIPS, required: true, default: "SON" },
    educationStatus: {
      type: String,
      enum: EDUCATION_STATUSES,
      required: true,
      default: "STUDYING",
    },
    // Only the reference is stored — the institution name always comes from
    // the institutions collection so a rename propagates everywhere.
    institutionId: { type: Schema.Types.ObjectId, ref: "Institution" },
    classOrGrade: { type: String, trim: true, maxlength: 60 },
    section: { type: String, trim: true, maxlength: 60 },
    rollNumber: { type: String, trim: true, maxlength: 60 },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "children" },
);

childSchema.index({ parentId: 1, createdAt: -1 });
childSchema.index({ institutionId: 1 });
childSchema.index({ fullName: 1 });
childSchema.index({ educationStatus: 1 });

export const Child: Model<ChildDoc> =
  (models.Child as Model<ChildDoc>) ?? model<ChildDoc>("Child", childSchema);
