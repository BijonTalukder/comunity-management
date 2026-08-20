export const ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const PERSON_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PersonStatus = (typeof PERSON_STATUSES)[number];

export const RELATIONSHIPS = ["SON", "DAUGHTER", "OTHER"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const EDUCATION_STATUSES = [
  "STUDYING",
  "COMPLETED",
  "NOT_STARTED",
  "OTHER",
] as const;
export type EducationStatus = (typeof EDUCATION_STATUSES)[number];

export const INSTITUTION_TYPES = [
  "SCHOOL",
  "COLLEGE",
  "UNIVERSITY",
  "MADRASHA",
  "TECHNICAL",
  "OTHER",
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const INSTITUTION_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type InstitutionStatus = (typeof INSTITUTION_STATUSES)[number];

export const EVENT_STATUSES = [
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "BANK",
  "CARD",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CONTRIBUTION_STATUSES = ["ACTIVE", "VOID"] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "PASSWORD_CHANGE",
  "EXPORT",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "User",
  "Person",
  "Child",
  "Institution",
  "Event",
  "Contribution",
  "Auth",
  "Report",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** Shape returned by every API route. */
export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiFailure = {
  success: false;
  message: string;
  errors: ApiFieldError[];
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** Human-readable labels shared by tables, filters and exported reports. */
export const LABELS = {
  role: { SUPER_ADMIN: "Super Admin", ADMIN: "Admin" },
  gender: { MALE: "Male", FEMALE: "Female", OTHER: "Other" },
  personStatus: { ACTIVE: "Active", INACTIVE: "Inactive", ARCHIVED: "Archived" },
  relationship: { SON: "Son", DAUGHTER: "Daughter", OTHER: "Other" },
  educationStatus: {
    STUDYING: "Studying",
    COMPLETED: "Completed",
    NOT_STARTED: "Not started",
    OTHER: "Other",
  },
  institutionType: {
    SCHOOL: "School",
    COLLEGE: "College",
    UNIVERSITY: "University",
    MADRASHA: "Madrasha",
    TECHNICAL: "Technical institute",
    OTHER: "Other",
  },
  institutionStatus: { ACTIVE: "Active", INACTIVE: "Inactive" },
  eventStatus: {
    UPCOMING: "Upcoming",
    ONGOING: "Ongoing",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
  },
  paymentMethod: {
    CASH: "Cash",
    BKASH: "bKash",
    NAGAD: "Nagad",
    ROCKET: "Rocket",
    BANK: "Bank",
    CARD: "Card",
    OTHER: "Other",
  },
  contributionStatus: { ACTIVE: "Active", VOID: "Void" },
  auditAction: {
    CREATE: "Create",
    UPDATE: "Update",
    DELETE: "Delete",
    LOGIN: "Login",
    LOGOUT: "Logout",
    PASSWORD_CHANGE: "Password change",
    EXPORT: "Export",
  },
} as const;
