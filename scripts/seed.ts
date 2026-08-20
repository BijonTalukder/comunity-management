/**
 * Development seed. Creates a realistic community so every screen and chart has
 * something to show. Safe to re-run: it clears the collections it owns first.
 *
 *   npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import mongoose from "mongoose";
import { connectToDatabase, syncIndexes } from "../src/lib/mongodb";
import { ensureDefaultAdmin } from "../src/lib/bootstrap";
import { User } from "../src/models/User";
import { Person } from "../src/models/Person";
import { Child } from "../src/models/Child";
import { Institution, normalizeInstitutionName } from "../src/models/Institution";
import { Event } from "../src/models/Event";
import { Contribution } from "../src/models/Contribution";
import { AuditLog } from "../src/models/AuditLog";
import { toMinorUnits } from "../src/lib/money";
import type { Gender, InstitutionType, PaymentMethod } from "../src/types";

/** Deterministic PRNG so repeated seeds produce the same demo data. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260819);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const MALE_NAMES = ["Rahim", "Karim", "Jashim", "Nayeem", "Sabbir", "Tanvir", "Imran", "Faisal", "Rased", "Shakil"];
const FEMALE_NAMES = ["Fatema", "Ayesha", "Rukhsana", "Nusrat", "Shirin", "Tahmina", "Sadia", "Mitu", "Rehana", "Sumaiya"];
const SURNAMES = ["Uddin", "Hossain", "Islam", "Ahmed", "Chowdhury", "Rahman", "Akter", "Begum", "Khatun", "Mia"];
const AREAS = ["Mirpur", "Uttara", "Gulshan", "Dhanmondi", "Bashundhara", "Mohammadpur"];
const OCCUPATIONS = ["Teacher", "Shopkeeper", "Farmer", "Driver", "Engineer", "Tailor", "Doctor", "Homemaker"];

const INSTITUTIONS: { name: string; type: InstitutionType; area: string }[] = [
  { name: "Ideal School & College", type: "SCHOOL", area: "Motijheel" },
  { name: "Mirpur Bangla High School", type: "SCHOOL", area: "Mirpur" },
  { name: "Dhaka College", type: "COLLEGE", area: "Dhanmondi" },
  { name: "University of Dhaka", type: "UNIVERSITY", area: "Shahbagh" },
  { name: "Tamirul Millat Kamil Madrasha", type: "MADRASHA", area: "Tongi" },
  { name: "Dhaka Polytechnic Institute", type: "TECHNICAL", area: "Tejgaon" },
  { name: "Uttara Model School", type: "SCHOOL", area: "Uttara" },
];

const EVENTS = [
  { name: "Durga Puja 2024", type: "Puja", month: 9, year: 2024, status: "COMPLETED" as const },
  { name: "Saraswati Puja 2025", type: "Puja", month: 1, year: 2025, status: "COMPLETED" as const },
  { name: "Community Picnic 2025", type: "Picnic", month: 3, year: 2025, status: "COMPLETED" as const },
  { name: "Eid Relief Fund 2025", type: "Fundraiser", month: 5, year: 2025, status: "COMPLETED" as const },
  { name: "Durga Puja 2025", type: "Puja", month: 9, year: 2025, status: "COMPLETED" as const },
  { name: "Winter Blanket Drive 2025", type: "Fundraiser", month: 11, year: 2025, status: "ONGOING" as const },
  { name: "Durga Puja 2026", type: "Puja", month: 9, year: 2026, status: "UPCOMING" as const },
];

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BKASH", "NAGAD", "ROCKET", "BANK", "CARD"];
const AMOUNTS = [200, 300, 500, 500, 1000, 1000, 1500, 2000, 2500, 5000];

async function main() {
  await connectToDatabase();
  await ensureDefaultAdmin();
  await syncIndexes();

  const admin = await User.findOne({ role: "SUPER_ADMIN" }).select("_id").lean();
  if (!admin) throw new Error("Bootstrap did not create a super admin.");
  const actorId = admin._id;

  console.info("Clearing existing demo data…");
  await Promise.all([
    Person.deleteMany({}),
    Child.deleteMany({}),
    Institution.deleteMany({}),
    Event.deleteMany({}),
    Contribution.deleteMany({}),
    AuditLog.deleteMany({ entityType: { $ne: "Auth" } }),
  ]);

  console.info("Creating institutions…");
  const institutions = await Institution.insertMany(
    INSTITUTIONS.map((item) => ({
      ...item,
      normalizedName: normalizeInstitutionName(item.name),
      city: "Dhaka",
      country: "Bangladesh",
      status: "ACTIVE",
      createdBy: actorId,
    })),
  );

  console.info("Creating people…");
  const people = await Person.insertMany(
    Array.from({ length: 60 }, (_, index) => {
      const gender: Gender = random() < 0.52 ? "MALE" : "FEMALE";
      const given = gender === "MALE" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
      const surname = pick(SURNAMES);
      return {
        fullName: `${given} ${surname}`,
        fatherOrHusbandName: `${pick(MALE_NAMES)} ${surname}`,
        motherName: `${pick(FEMALE_NAMES)} ${pick(SURNAMES)}`,
        gender,
        dateOfBirth: new Date(between(1955, 2000), between(0, 11), between(1, 28)),
        mobileNumber: `01${between(3, 9)}${String(between(10_000_000, 99_999_999))}`,
        area: pick(AREAS),
        occupation: pick(OCCUPATIONS),
        address: `House ${between(1, 90)}, Road ${between(1, 20)}, ${pick(AREAS)}, Dhaka`,
        // A handful of archived records exercise the status filter.
        status: index >= 57 ? "ARCHIVED" : "ACTIVE",
        createdBy: actorId,
      };
    }),
  );

  console.info("Creating children…");
  const children: Record<string, unknown>[] = [];
  for (const person of people) {
    for (let i = 0; i < between(0, 3); i += 1) {
      const gender: Gender = random() < 0.5 ? "MALE" : "FEMALE";
      const studying = random() < 0.75;
      const institution = pick(institutions);
      children.push({
        parentId: person._id,
        fullName: `${gender === "MALE" ? pick(MALE_NAMES) : pick(FEMALE_NAMES)} ${person.fullName.split(" ")[1]}`,
        gender,
        dateOfBirth: new Date(between(2005, 2020), between(0, 11), between(1, 28)),
        relationship: gender === "MALE" ? "SON" : "DAUGHTER",
        educationStatus: studying ? "STUDYING" : pick(["COMPLETED", "NOT_STARTED"] as const),
        institutionId: studying ? institution._id : undefined,
        classOrGrade: studying ? `Class ${between(1, 12)}` : undefined,
        section: studying ? pick(["A", "B", "C"]) : undefined,
        rollNumber: studying ? String(between(1, 80)) : undefined,
        createdBy: actorId,
      });
    }
  }
  await Child.insertMany(children);

  console.info("Creating events and contributions…");
  const events = await Event.insertMany(
    EVENTS.map((item) => ({
      name: item.name,
      eventType: item.type,
      status: item.status,
      startDate: new Date(item.year, item.month, 1),
      endDate: new Date(item.year, item.month, between(2, 5)),
      location: pick(["Community Hall", "Central Field", "School Ground"]),
      description: `${item.type} organised by the community committee.`,
      createdBy: actorId,
    })),
  );

  const activePeople = people.filter((person) => person.status === "ACTIVE");
  const contributions: Record<string, unknown>[] = [];

  for (const event of events) {
    if (event.status === "UPCOMING") continue;
    // Roughly two thirds of the community contributes to any given event.
    for (const person of activePeople) {
      if (random() > 0.65) continue;
      for (let i = 0; i < between(1, 3); i += 1) {
        const start = event.startDate ?? new Date();
        contributions.push({
          eventId: event._id,
          personId: person._id,
          amountMinor: toMinorUnits(pick(AMOUNTS)),
          paymentDate: new Date(start.getTime() + between(-10, 10) * 86_400_000),
          paymentMethod: pick(PAYMENT_METHODS),
          transactionReference: random() < 0.4 ? `TRX${between(100000, 999999)}` : undefined,
          // A few voided payments prove totals exclude them.
          status: random() < 0.03 ? "VOID" : "ACTIVE",
          createdBy: actorId,
        });
      }
    }
  }
  await Contribution.insertMany(contributions);

  const totals = await Contribution.aggregate<{ total: number }>([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: null, total: { $sum: "$amountMinor" } } },
  ]);

  console.info("\nSeed complete:");
  console.table({
    institutions: institutions.length,
    people: people.length,
    children: children.length,
    events: events.length,
    contributions: contributions.length,
    totalCollected: `BDT ${((totals[0]?.total ?? 0) / 100).toLocaleString("en-US")}`,
  });

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
