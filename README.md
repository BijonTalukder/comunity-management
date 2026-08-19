# Community Manager

A full-stack **community / area people management** application built as a single
Next.js project — the UI and the API live in the same app, with MongoDB behind a
service layer.

Manage community members and their households, track which school or college each
child attends, run events, record contributions with exact money arithmetic, and
see a field-by-field audit trail of every change.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then set MONGODB_URI and AUTH_SECRET
npm run seed                   # optional: 60 people, 7 events, ~380 contributions
npm run dev
```

Open <http://localhost:3000>. On first run the app creates the default super
admin from `DEFAULT_ADMIN_*`; sign in with those credentials and change the
password from **Settings** straight away.

Generate a signing secret with:

```bash
openssl rand -base64 48
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Reset and repopulate demo data |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Architecture

One Next.js App Router project. Route handlers stay thin; all business logic
lives in the service layer.

```
Route Handler → Zod validation → auth + permission check → service → Mongoose → MongoDB
```

```
src/
├── app/
│   ├── (auth)/login/            Sign-in screen
│   ├── (dashboard)/             Authenticated shell: dashboard, people,
│   │                            institutions, events, users, audit-logs, settings
│   └── api/                     Route handlers (the backend)
├── components/
│   ├── ui/                      shadcn/ui primitives
│   ├── layout/                  Sidebar, header, theme
│   ├── shared/                  Table, filter, pagination, export, form building blocks
│   └── people|children|institutions|events|users|audit|dashboard/
├── models/                      Mongoose schemas and indexes
├── services/                    Business logic and aggregations
├── validations/                 Zod schemas, shared by client and server
├── lib/                         DB, auth, permissions, audit, exports, helpers
├── hooks/
└── proxy.ts                     Edge routing gate (Next.js `proxy` convention)
```

**Why the split matters:** `src/validations/list.ts` holds the pure-Zod list
query shape, separate from `src/lib/query.ts` which imports Mongoose. Client
components import validation schemas without pulling the database driver into
the browser bundle.

---

## Data model

```
User ──creates/updates──▶ People · Children · Institutions · Events · Contributions

Person ──has many──▶ Children
Person ──has many──▶ Contributions
Institution ──has many──▶ Children
Event ──has many──▶ Contributions
```

Children are a **separate collection**, not embedded in the person document, so a
household can grow without rewriting the parent record. Contributions are a
separate collection too — totals are always computed with aggregation pipelines
and never denormalised onto the event, so voiding a payment is immediately
reflected everywhere.

Indexes are declared on each schema: unique `email` on users, a weighted text
index plus field indexes on people, `parentId`/`institutionId` on children, a
unique `(normalizedName, type)` pair on institutions, and compound
`(eventId, personId)` and `(entityType, entityId, performedAt)` indexes on
contributions and audit logs.

### Money

Amounts are stored as **integer poisha** in `amountMinor`, never as floats. The
API accepts and returns taka; `src/lib/money.ts` is the only place that converts.
Sums of ৳500 + ৳1000 + ৳2500.50 are exact.

---

## Authentication and authorisation

- Login issues a **HS256 JWT in an HttpOnly, SameSite=Lax cookie** (`secure` in
  production). Nothing sensitive is ever placed in `localStorage`.
- Passwords are hashed with **bcrypt** (cost 12) and the hash is `select: false`,
  so it cannot leak through a generic serializer.
- `proxy.ts` runs at the edge and only verifies the token's signature and expiry
  — it cannot reach MongoDB, so it routes users but never enforces access.
  **Every API route independently re-checks** the caller against the database.
- `getCurrentUser()` re-reads the user on each request, so deactivating an
  account takes effect immediately rather than when the token expires. Changing a
  password stamps `passwordChangedAt`, invalidating every older token.
- Login is rate-limited on two axes: 5 attempts per account and 20 per IP per
  5 minutes. Wrong email and wrong password return the same message, so the
  endpoint cannot be used to enumerate accounts.

### Roles

| Capability | Admin | Super Admin |
|---|:--:|:--:|
| People, children, events, contributions | ✅ | ✅ |
| Institutions — create/edit | ✅ | ✅ |
| Institutions — delete | — | ✅ |
| Audit log, exports | ✅ | ✅ |
| User accounts | — | ✅ |

Permissions are enumerated in `src/lib/permissions.ts`; a new role is described
in one table. The UI hides what a role cannot do, and the API refuses it anyway.

---

## Audit logging

Every create, update, delete, sign-in, password change and export is recorded in
`audit_logs` with the actor, timestamp, IP address and user agent.

Updates read the document **before** writing so the log stores the exact
field-level diff:

```
mobileNumber   01700000000 → 01800000000
area           Mirpur      → Gazipur
```

`src/lib/audit.ts` provides `createAuditLog()` and `getChangedFields()`; no
module builds log entries by hand. Password fields are redacted before they ever
reach the log, and a failed audit write never rolls back the business operation
that succeeded.

View the trail at **/audit-logs** — filter by date range, user, action and
module, and expand any row for the old → new values. Each person also has an
**Activity history** tab scoped to their record.

---

## Deletion policy

Nothing that carries history is silently destroyed:

| Record | Behaviour |
|---|---|
| Person | Archived; hard delete only when they have no children and no contributions |
| Event | Archived when it has contributions, deleted when it does not |
| Contribution | **Voided** — kept for the trail, excluded from every total |
| Institution | Deletion blocked while children reference it; deactivate instead |
| Child | Hard deleted (and logged) |

---

## Institution quick-create

Adding a child never asks for a free-text school name. The field is a searchable
combobox backed by `GET /api/institutions/search?q=`. If nothing matches, the
list offers **+ Add "ABC School"** — that opens a dialog, creates the
institution, and selects it, without leaving the child form. Only the
`institutionId` is stored on the child, so renaming an institution propagates
everywhere.

Names are normalised (case, punctuation, whitespace) and unique per type, so
`"  abc   school!! "` collides with `"ABC School"` but a school and a college may
share a name.

---

## Exports

Every list exports to **Excel** and **PDF**, honouring the filters currently
applied in the URL — what you see is what you get. Both formats are generated
server-side from one `ReportDefinition` (`src/lib/report.ts`), so the two
renderers can never drift apart.

- **Excel** (ExcelJS): titled metadata block, applied filters, summary, frozen
  styled header, typed cells with date and currency formats, auto-filter, and a
  `SUM` totals row.
- **PDF** (pdfkit): branded header, applied filters and summary side by side, a
  paginated zebra table and page numbers. Wide reports mark low-priority columns
  `pdfHidden` so the page stays readable while Excel keeps every field. PDF
  amounts use `BDT` because the built-in PDF fonts cannot encode `৳`.

Every export is itself recorded in the audit log with the filters used.

```
GET /api/reports/{people|children|institutions|events|audit-logs}/{excel|pdf}
GET /api/reports/events/[id]/contributions/{excel|pdf}[?view=summary]
```

---

## API

All list endpoints accept `page`, `limit`, `search`, `sortBy`, `sortOrder`, plus
module-specific filters. Sorting is restricted to an allow-list, so a query
string can never sort on a private or unindexed field.

Every response has the same shape:

```jsonc
{ "success": true,  "message": "Person created successfully", "data": { } }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "…" }] }
```

Field-level errors map straight onto form inputs on the client.

<details>
<summary>Endpoint list</summary>

```
POST   /api/auth/login · logout · change-password      GET /api/auth/me      PATCH /api/auth/profile
GET    /api/people            POST /api/people
GET    /api/people/[id]       PATCH /api/people/[id]   DELETE /api/people/[id][?hard=true]
GET    /api/people/[id]/children · contributions · activity
GET    /api/people/areas
GET    /api/children          GET/PATCH/DELETE /api/children/[id]
GET    /api/institutions      POST /api/institutions   GET /api/institutions/search?q=
GET/PATCH/DELETE /api/institutions/[id]
GET    /api/events            POST /api/events         GET/PATCH/DELETE /api/events/[id]
GET    /api/events/[id]/stats · contributors · contributions   POST /api/events/[id]/contributions
GET    /api/contributions     GET/PATCH/DELETE /api/contributions/[id]
GET    /api/users             POST /api/users          GET/PATCH /api/users/[id]
GET    /api/audit-logs        GET /api/audit-logs/performers
GET    /api/dashboard
```
</details>

---

## UI notes

- **Server Components fetch; Client Components interact.** Pages call services
  directly — no HTTP round-trip to their own API. TanStack Query is used only
  where client-side caching genuinely helps: the institution and person
  type-aheads.
- **List state lives in the URL.** Search, filters, sort and page are query
  params, so any view is shareable and survives a refresh, and exports can reuse
  the exact same filters.
- **Dialog forms are keyed and mounted on open**, so each open starts from fresh
  `defaultValues` — no reset-on-open effects and no stale first frame.
- **Charts** use a palette validated for colour-vision deficiency in both light
  and dark mode; the gender chart direct-labels every bar so identity never
  depends on colour alone.
- Light/dark theme with no flash of the wrong theme on load, a collapsible
  mobile sidebar, loading skeletons, empty states, toasts and confirmation
  dialogs throughout.

---

## Environment

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=community_management
AUTH_SECRET=<openssl rand -base64 48>
SESSION_MAX_AGE_DAYS=7
DEFAULT_ADMIN_NAME=Super Admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123
NEXT_PUBLIC_APP_NAME=Community Manager
```

## Before deploying

- Set a strong `AUTH_SECRET` and change `DEFAULT_ADMIN_PASSWORD`.
- The login rate limiter is in-memory and therefore per-instance. Behind more
  than one instance, back `src/lib/rate-limit.ts` with Redis.
- `photoUrl` takes a URL to an already-hosted image; there is no upload pipeline.
