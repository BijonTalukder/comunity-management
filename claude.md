# Build a Complete Full Stack Community Management Web Application Using Next.js

Build a complete, production-ready **Community / Area People Management Web Application** using a **single Next.js project**.

Do NOT create a separate NestJS backend or separate backend repository.

The frontend and backend must exist inside the same Next.js application.

---

# Core Tech Stack

Use:

- Next.js latest stable version
- App Router
- TypeScript
- MongoDB
- Mongoose
- Next.js Route Handlers for backend APIs
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Server Components where appropriate
- Client Components only when necessary
- TanStack Query only where client-side caching/refetching is useful
- bcrypt for password hashing
- JWT or secure session-based authentication
- ExcelJS for Excel exports
- PDF generation library compatible with Next.js server runtime
- Lucide icons

Do not create a separate Express, NestJS, or other backend application.

---

# Architecture Requirement

Use a clean full-stack Next.js architecture.

Example:

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── people/
│   │   ├── institutions/
│   │   ├── events/
│   │   ├── users/
│   │   ├── audit-logs/
│   │   └── settings/
│   │
│   └── api/
│       ├── auth/
│       ├── users/
│       ├── people/
│       ├── children/
│       ├── institutions/
│       ├── events/
│       ├── contributions/
│       ├── audit-logs/
│       └── reports/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── people/
│   ├── children/
│   ├── institutions/
│   ├── events/
│   └── shared/
│
├── models/
│   ├── User.ts
│   ├── Person.ts
│   ├── Child.ts
│   ├── Institution.ts
│   ├── Event.ts
│   ├── Contribution.ts
│   └── AuditLog.ts
│
├── lib/
│   ├── mongodb.ts
│   ├── auth.ts
│   ├── api-response.ts
│   ├── permissions.ts
│   ├── audit.ts
│   ├── export-excel.ts
│   ├── export-pdf.ts
│   └── utils.ts
│
├── services/
│   ├── people.service.ts
│   ├── children.service.ts
│   ├── institution.service.ts
│   ├── event.service.ts
│   └── contribution.service.ts
│
├── validations/
│   ├── auth.schema.ts
│   ├── people.schema.ts
│   ├── children.schema.ts
│   ├── institution.schema.ts
│   ├── event.schema.ts
│   └── contribution.schema.ts
│
├── types/
├── hooks/
└── middleware.ts
```

Keep business logic separate from API route handlers.

Route handlers should remain thin.

Example:

```text
Route Handler
      ↓
Validation
      ↓
Authentication / Authorization
      ↓
Service Layer
      ↓
Mongoose Model
      ↓
MongoDB
```

---

# Database Connection

Use MongoDB with Mongoose.

Create a reusable cached MongoDB connection to avoid creating multiple connections during Next.js hot reload or repeated server requests.

Use:

```env
MONGODB_URI=
MONGODB_DB_NAME=
```

All database operations must run server-side.

Never expose MongoDB credentials to the client.

---

# Authentication

Create authentication inside the Next.js application.

Features:

- Login
- Logout
- Protected dashboard routes
- Secure authentication
- Password hashing with bcrypt
- Change password
- Role-based authorization
- Default admin creation

Use secure HttpOnly cookies for authentication/session handling.

Do not store sensitive authentication tokens in localStorage.

---

# Default Admin Bootstrap

On first application initialization, automatically ensure that a default Super Admin exists.

Environment variables:

```env
DEFAULT_ADMIN_NAME=Super Admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123
```

Logic:

1. Check whether the default admin exists.
2. If not, hash the password using bcrypt.
3. Create the user as `SUPER_ADMIN`.
4. Never expose the password hash.
5. Admin can change their password later.

Do not run duplicate seeding.

Make the initialization logic safe even when multiple requests arrive simultaneously.

---

# Users Collection

```ts
{
  _id: ObjectId,

  name: string,
  email: string,
  passwordHash: string,

  role: "SUPER_ADMIN" | "ADMIN",

  isActive: boolean,

  lastLoginAt?: Date,
  passwordChangedAt?: Date,

  createdBy?: ObjectId,
  updatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- Unique email
- role
- isActive

---

# People Management

Admin can manage people from a specific area/community.

Fields:

```text
Full Name
Father/Husband Name
Mother Name
Gender
Date of Birth
Mobile Number
Alternative Mobile Number
Email
Address
Area
Occupation
Photo
Notes
Status
```

System fields:

```text
createdBy
updatedBy
createdAt
updatedAt
```

Features:

- Create
- View
- Update
- Archive/Delete
- Search
- Filters
- Pagination
- Sorting
- Excel download
- PDF download
- Activity history

---

# Children Management

Each person can have multiple children.

Use a separate MongoDB collection.

Schema:

```ts
{
  parentId: ObjectId,

  fullName: string,
  gender: "MALE" | "FEMALE" | "OTHER",
  dateOfBirth?: Date,

  relationship: "SON" | "DAUGHTER" | "OTHER",

  educationStatus:
    | "STUDYING"
    | "COMPLETED"
    | "NOT_STARTED"
    | "OTHER",

  institutionId?: ObjectId,

  classOrGrade?: string,
  section?: string,
  rollNumber?: string,
  notes?: string,

  createdBy: ObjectId,
  updatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Do not embed all children inside the Person document.

---

# Institution Management

Create one master collection:

```text
institutions
```

This will support:

- School
- College
- University
- Madrasha
- Technical Institute
- Other

Schema:

```ts
{
  name: string,
  normalizedName: string,

  type:
    | "SCHOOL"
    | "COLLEGE"
    | "UNIVERSITY"
    | "MADRASHA"
    | "TECHNICAL"
    | "OTHER",

  address?: string,
  area?: string,
  city?: string,
  country?: string,

  status: "ACTIVE" | "INACTIVE",

  createdBy: ObjectId,
  updatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Create appropriate indexes for searching.

---

# Important Institution UX Requirement

When adding or editing a child:

Do NOT use a normal text input for school/college.

Use a searchable combobox.

Flow:

### Existing Institution

Admin types:

```text
ABC School
```

Search MongoDB through a Next.js API route.

Example:

```text
GET /api/institutions/search?q=abc
```

Show matching institutions.

Admin selects one.

Save only:

```text
institutionId
```

### Institution Not Found

Show:

```text
No institution found

+ Add "ABC School"
```

When clicked:

1. Open a dialog.
2. Create the institution.
3. Save it immediately through Next.js Route Handler.
4. Return the newly created institution.
5. Automatically select it in the child form.
6. Save its ObjectId as `institutionId`.

The user must not need to navigate away from the form.

---

# Events

Admin can create unlimited events.

Examples:

```text
Durga Puja 2024
Durga Puja 2025
Durga Puja 2026
Saraswati Puja 2025
Community Picnic 2025
```

Schema:

```ts
{
  name: string,
  eventType?: string,
  description?: string,

  startDate?: Date,
  endDate?: Date,

  location?: string,

  status:
    | "UPCOMING"
    | "ONGOING"
    | "COMPLETED"
    | "ARCHIVED",

  notes?: string,

  createdBy: ObjectId,
  updatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

---

# Event Contribution Management

Each event can have contribution/payment records.

Use a separate collection.

Schema:

```ts
{
  eventId: ObjectId,
  personId: ObjectId,

  amount: number,

  paymentDate: Date,

  paymentMethod:
    | "CASH"
    | "BKASH"
    | "NAGAD"
    | "ROCKET"
    | "BANK"
    | "CARD"
    | "OTHER",

  transactionReference?: string,

  notes?: string,

  status: "ACTIVE" | "VOID",

  createdBy: ObjectId,
  updatedBy?: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

One person can contribute multiple times to the same event.

Example:

```text
Rahim
Durga Puja 2025

৳500
৳1000
৳500

Total = ৳2000
```

Calculate totals using MongoDB aggregation.

Avoid storing unnecessary duplicated totals.

---

# Event Details Page

Create an attractive event dashboard.

Example:

```text
Durga Puja 2025
```

Show:

- Total Contributors
- Total Contribution Amount
- Average Contribution
- Number of Payment Records
- Recent Contributions

Contribution table:

```text
Person
Mobile
Total Paid
Last Payment Date
Actions
```

Clicking a person should show their full contribution history for the selected event.

---

# Audit Logging

This is mandatory.

Track:

- Who created a record
- Who updated a record
- Who deleted/archived a record
- When the action happened
- Exactly which fields changed
- Old value
- New value

Create:

```text
audit_logs
```

Schema:

```ts
{
  entityType: string,
  entityId: ObjectId | string,

  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "PASSWORD_CHANGE"
    | "EXPORT",

  changes?: [
    {
      field: string,
      oldValue: unknown,
      newValue: unknown
    }
  ],

  performedBy?: ObjectId,

  ipAddress?: string,
  userAgent?: string,

  performedAt: Date
}
```

Create reusable audit utility:

```text
lib/audit.ts
```

Do not manually duplicate audit logging logic everywhere.

Create reusable functions such as:

```ts
createAuditLog();
getChangedFields();
```

For update operations:

1. Read the old document.
2. Compare allowed tracked fields.
3. Perform update.
4. Generate field-by-field differences.
5. Store the audit log.

Example:

```text
Mobile Number
01700000000 → 01800000000

Address
Dhaka → Gazipur
```

---

# Audit Log Page

Create:

```text
/audit-logs
```

Columns:

```text
Date & Time
User
Action
Module
Record
Changes
IP Address
```

Use expandable rows or a side panel to view detailed changes.

Filters:

- Date range
- User
- Action
- Entity/module

---

# API Routes

Use Next.js Route Handlers.

Example:

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password

GET /api/users
POST /api/users
PATCH /api/users/[id]

GET /api/people
POST /api/people
GET /api/people/[id]
PATCH /api/people/[id]
DELETE /api/people/[id]

GET /api/people/[id]/children
POST /api/people/[id]/children

GET /api/children/[id]
PATCH /api/children/[id]
DELETE /api/children/[id]

GET /api/institutions
POST /api/institutions

GET /api/institutions/search?q=

GET /api/events
POST /api/events
GET /api/events/[id]
PATCH /api/events/[id]

GET /api/events/[id]/contributions
POST /api/events/[id]/contributions

PATCH /api/contributions/[id]
DELETE /api/contributions/[id]

GET /api/audit-logs

GET /api/reports/people/excel
GET /api/reports/people/pdf

GET /api/reports/institutions/excel
GET /api/reports/institutions/pdf

GET /api/reports/events/[id]/contributions/excel
GET /api/reports/events/[id]/contributions/pdf
```

All list APIs should support:

```text
page
limit
search
sortBy
sortOrder
```

Add module-specific filters where needed.

---

# Export System

Every major list must support:

- Download Excel
- Download PDF

Modules:

- People
- Children
- Institutions
- Events
- Event Contributions
- Audit Logs

## Excel

Use ExcelJS.

Generate files server-side using Next.js Route Handlers.

Support:

- Headers
- Date formatting
- Currency formatting
- Summary rows where useful
- Applied filters in report metadata

## PDF

Generate server-side.

PDF should include:

```text
Application Name
Report Name
Generated Date
Generated By
Applied Filters
Summary
Data Table
```

Example:

```text
Durga Puja 2025 Contribution Report

Total Contributors: 120
Total Amount: ৳150,000
```

---

# UI/UX Design

Create a premium modern admin dashboard.

Use:

- Clean whitespace
- Consistent spacing
- Good typography
- Modern cards
- Professional tables
- Accessible dialogs
- Clear empty states
- Loading skeletons
- Toast notifications
- Confirmation dialogs
- Responsive layouts

Do not make the UI look like a basic CRUD template.

The application should feel like a polished production SaaS admin panel.

---

# Main Navigation

Sidebar:

```text
Dashboard
People
Institutions
Events
Users
Audit Logs
Settings
```

Header:

```text
Breadcrumb
Current Page Title
Profile Menu
Logout
```

Mobile:

- Collapsible sidebar
- Responsive tables
- Touch-friendly buttons
- Mobile-friendly forms

---

# Dashboard

Show:

```text
Total People
Total Children
Male
Female
Total Institutions
Total Events
Total Contribution
```

Add useful charts:

- Gender distribution
- Contributions by event
- Monthly contributions
- Recent activities

Do not overload the dashboard.

Keep it clean and useful.

---

# People Details Page

Create tabs:

```text
Overview
Children
Contributions
Activity History
```

## Overview

Show complete person information.

## Children

Show all children.

Actions:

- Add Child
- Edit Child
- Delete Child

Institution uses the searchable quick-create selector.

## Contributions

Show all contributions grouped by event.

## Activity History

Show audit logs related to this person.

---

# Validation

Use Zod schemas.

Validate:

1. Client-side for forms.
2. Server-side inside Route Handlers.

Never trust only client-side validation.

Use the same validation definitions where practical.

---

# API Response Format

Success:

```json
{
  "success": true,
  "message": "Person created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Maintain consistent responses throughout the application.

---

# Security

Implement:

- bcrypt password hashing
- HttpOnly secure cookies
- Authentication middleware
- Role-based access control
- Server-side authorization checks
- Zod validation
- MongoDB query sanitization
- Rate limiting for login
- Environment variable protection
- Never expose password hashes
- Audit sensitive actions

Do not rely only on frontend route protection.

Every protected API route must validate the authenticated user.

---

# Database Relationships

```text
User
 ├── creates/updates → People
 ├── creates/updates → Children
 ├── creates/updates → Institutions
 ├── creates/updates → Events
 └── creates/updates → Contributions


Person
 ├── has many → Children
 └── has many → Contributions


Institution
 └── has many → Children


Event
 └── has many → Contributions
```

Use ObjectId references.

Use aggregation pipelines for reports and totals.

Avoid excessive Mongoose populate operations on large datasets.

---

# Important MongoDB Indexes

Create appropriate indexes.

Examples:

```text
User:
email unique

People:
fullName
mobileNumber
gender
area
status

Children:
parentId
institutionId

Institutions:
name
normalizedName
type

Events:
name
status
startDate

Contributions:
eventId
personId
paymentDate

Compound:
eventId + personId

Audit Logs:
entityType + entityId
performedBy
performedAt
action
```

---

# Implementation Phases

## Phase 1

```text
Next.js project setup
Tailwind CSS
shadcn/ui
MongoDB connection
Mongoose setup
Authentication
Default admin bootstrap
Middleware
Dashboard layout
```

## Phase 2

```text
People CRUD
Search
Filters
Pagination
Person details page
```

## Phase 3

```text
Children CRUD
Institutions CRUD
Searchable institution selector
Quick institution creation
```

## Phase 4

```text
Events CRUD
Contribution CRUD
Event details dashboard
MongoDB aggregation
Contribution history
```

## Phase 5

```text
Audit logging system
Changed-field tracking
Audit log UI
```

## Phase 6

```text
Excel export
PDF export
Reports
```

## Phase 7

```text
Dashboard analytics
Charts
Loading states
Empty states
Error handling
Responsive optimization
Security review
```

---

# Final Development Rules

- Use one Next.js project for both frontend and backend.
- Use App Router.
- Use Route Handlers as the backend API layer.
- Use MongoDB + Mongoose.
- Keep API routes thin.
- Put business logic in reusable service files.
- Do not create one massive file.
- Do not use `any` unnecessarily.
- Use reusable UI components.
- Use server components where possible.
- Use client components only when required.
- Add proper loading and error states.
- Add MongoDB indexes.
- Handle ObjectId validation correctly.
- Handle money safely.
- Do not store duplicate institution names in children.
- Do not embed contributions inside events.
- Track createdBy and updatedBy.
- Track detailed audit changes.
- Soft-delete/archive important data where appropriate.
- Build production-quality code, not a simple demo.

Before writing the complete code, first provide:

1. Final project folder structure
2. MongoDB schema and relationships
3. Authentication approach
4. API route plan
5. UI component plan
6. Step-by-step implementation plan

Then implement the application phase by phase.
