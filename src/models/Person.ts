import { Schema, model, models, type Model, type Types } from "mongoose";
import { GENDERS, PERSON_STATUSES, type Gender, type PersonStatus } from "@/types";

export interface PersonDoc {
  _id: Types.ObjectId;
  fullName: string;
  fatherOrHusbandName?: string;
  motherName?: string;
  gender: Gender;
  dateOfBirth?: Date;
  mobileNumber?: string;
  alternativeMobileNumber?: string;
  email?: string;
  address?: string;
  area?: string;
  occupation?: string;
  photoUrl?: string;
  notes?: string;
  status: PersonStatus;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const personSchema = new Schema<PersonDoc>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    fatherOrHusbandName: { type: String, trim: true, maxlength: 160 },
    motherName: { type: String, trim: true, maxlength: 160 },
    gender: { type: String, enum: GENDERS, required: true },
    dateOfBirth: { type: Date },
    mobileNumber: { type: String, trim: true, maxlength: 32 },
    alternativeMobileNumber: { type: String, trim: true, maxlength: 32 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 500 },
    area: { type: String, trim: true, maxlength: 160 },
    occupation: { type: String, trim: true, maxlength: 160 },
    photoUrl: { type: String, trim: true, maxlength: 2000 },
    notes: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: PERSON_STATUSES, required: true, default: "ACTIVE" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "people" },
);

personSchema.index({ fullName: 1 });
personSchema.index({ mobileNumber: 1 });
personSchema.index({ gender: 1 });
personSchema.index({ area: 1 });
personSchema.index({ status: 1 });
personSchema.index({ createdAt: -1 });

export const Person: Model<PersonDoc> =
  (models.Person as Model<PersonDoc>) ?? model<PersonDoc>("Person", personSchema);
