# Add New Features to the Existing Next.js Community Management Application

The application is already built using:

- Next.js App Router
- TypeScript
- MongoDB
- Mongoose
- Next.js Route Handlers
- Tailwind CSS
- shadcn/ui
- Existing authentication and role-based authorization
- Existing Users, People, Children, Institutions, Events, Contributions and Audit Logs

Do NOT rewrite the existing application.

Do NOT change the existing architecture unnecessarily.

Extend the current codebase cleanly and reuse existing:

- Authentication
- Authorization
- API response helpers
- Mongoose connection
- Models
- Service patterns
- UI components
- Audit logging system
- Export/report utilities

Before implementation, inspect the existing codebase and understand its architecture. Then integrate these features following the existing conventions.

Add the following four features:

1. Duplicate Person Detection
2. Global Search
3. Command Menu
4. Backup and Restore

---

# FEATURE 1: Duplicate Person Detection

## Goal

Prevent accidental duplicate person records while still allowing the admin to create a record when similar people are genuinely different.

Do NOT automatically block creation based only on a similar name.

The system should intelligently detect possible duplicates and show a warning.

---

## Duplicate Detection Rules

Check for possible duplicates using the following priority.

### High Confidence Duplicate

Show a strong warning when:

```text
Same mobile number
```

or:

```text
Same alternative mobile number
```

or a mobile number matches another person's primary or alternative number.

Example:

```text
Possible Duplicate Detected

Rahim Uddin
Mobile: 017XXXXXXXX
Area: Kaliganj

This person already has the same mobile number.
```

The UI should clearly indicate this is a high-confidence match.

---

### Medium Confidence Duplicate

Check combinations such as:

```text
Same full name + same area
```

```text
Same full name + same father/husband name
```

```text
Same full name + same date of birth
```

Use normalized values for comparison.

For example:

```text
"  Rahim   Uddin "
```

and:

```text
"rahim uddin"
```

should be normalized before comparison.

Create reusable normalization utilities.

Example:

```text
normalizeName()
normalizePhoneNumber()
```

---

## Database Changes

Extend the existing Person model only if needed.

Recommended fields:

```ts
normalizedFullName?: string;
normalizedMobileNumber?: string;
normalizedAlternativeMobileNumber?: string;
```

Alternatively, calculate normalized values inside queries if that fits the existing architecture better.

For mobile numbers, create proper indexes where possible.

Do not create duplicate indexes unnecessarily.

Ensure existing data migration/backfill is considered if normalized fields are added.

---

## Duplicate Detection API

Add an API endpoint compatible with the existing Route Handler structure.

Example:

```text
GET /api/people/duplicate-check
```

Support parameters such as:

```text
fullName
mobileNumber
alternativeMobileNumber
area
fatherOrHusbandName
dateOfBirth
excludeId
```

`excludeId` is required when editing an existing person so the current person does not match itself.

Response example:

```json
{
  "success": true,
  "data": {
    "hasExactDuplicate": false,
    "possibleDuplicates": [
      {
        "person": {},
        "matchScore": 90,
        "matchReasons": [
          "Same full name",
          "Same area",
          "Same father/husband name"
        ]
      }
    ]
  }
}
```

Do not expose unnecessary sensitive information.

---

## Match Scoring

Implement a reusable duplicate detection service.

Example scoring:

```text
Same mobile number                100
Same alternative mobile number    100
Same full name + DOB               90
Same full name + father/husband    85
Same full name + area              70
Same name only                     40
```

The exact scoring may be adjusted, but the logic should be clean and configurable.

Do not show low-confidence matches unnecessarily.

Use sensible thresholds.

---

## Duplicate Detection UX

### During Person Creation

After the admin enters relevant fields, perform a debounced duplicate check.

Do NOT send an API request on every keystroke.

Use debounce.

For example:

```text
500–800ms debounce
```

Check when enough useful data exists, especially:

- Mobile number
- Full name + area
- Full name + father/husband name

If possible duplicates exist, show a warning card above the submit button.

Example:

```text
⚠ Possible duplicate records found

1. Rahim Uddin
   Mobile: 017XXXXXXXX
   Area: Kaliganj
   Reason: Same mobile number

[View Existing Record]
```

If an exact mobile duplicate exists:

```text
⚠ A person with this mobile number already exists.
```

The UI should preferably prevent accidental submission but allow an authorized admin to explicitly override if the business rules allow duplicate mobile numbers.

If overriding is allowed:

```text
[Cancel]
[Create Anyway]
```

Creating despite a duplicate must generate an audit log.

Audit metadata should indicate that duplicate detection was overridden.

Example:

```text
action: CREATE
metadata:
  duplicateOverride: true
  matchedPersonIds: [...]
```

---

# FEATURE 2: Global Search

## Goal

Add a powerful global search that can search across the application.

Search categories:

1. People
2. Institutions
3. Events

Optionally include:

4. Children

Do not include unnecessary categories if they make search slow or cluttered.

---

## Global Search UI

Add a search button/input in the top navigation.

Desktop example:

```text
🔍 Search people, institutions, events...
                     Ctrl + K
```

Mobile should have an accessible search action.

Clicking it opens a search dialog.

Use a modern searchable dialog interface.

---

## Search Behavior

Search should work across multiple collections.

Example search:

```text
Rahim
```

Results:

```text
People
────────────────────
Rahim Uddin
017XXXXXXXX
Kaliganj

Institutions
────────────────────
Rahim Memorial High School

Events
────────────────────
Rahim Community Program 2026
```

Each result should contain:

```text
Icon
Primary Title
Useful Secondary Information
Result Type
```

Clicking a result navigates directly to its details page.

Examples:

```text
Person → /people/[id]

Institution → /institutions/[id]

Event → /events/[id]
```

Use existing application routes if they differ.

---

## Global Search API

Create:

```text
GET /api/search?q=
```

Optional:

```text
GET /api/search?q=&types=people,institutions,events
```

The API must:

1. Require authentication.
2. Respect authorization.
3. Validate query parameters.
4. Apply result limits.
5. Avoid returning entire collections.
6. Return grouped or typed results.

Example response:

```json
{
  "success": true,
  "data": {
    "people": [],
    "institutions": [],
    "events": []
  }
}
```

or:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "...",
        "type": "PERSON",
        "title": "Rahim Uddin",
        "subtitle": "017XXXXXXXX • Kaliganj",
        "url": "/people/..."
      }
    ]
  }
}
```

Choose the structure that fits the existing frontend best.

---

## Search Performance

Requirements:

- Minimum query length: 2 characters
- Debounce requests
- Limit results per category
- Use MongoDB indexes
- Do not use unbounded regex scans
- Escape user input safely
- Use case-insensitive normalized search where appropriate

Search priority:

### People

```text
Full Name
Mobile Number
Member ID if available
```

### Institutions

```text
Institution Name
Area
```

### Events

```text
Event Name
Event Type
```

If the dataset grows significantly, design the search service so it can later be replaced by a dedicated search engine without rewriting the UI.

---

# FEATURE 3: Command Menu

## Goal

Add a modern command palette similar to:

```text
VS Code Command Palette
Linear
Notion
GitHub Command Menu
```

Use the existing shadcn/ui Command component or an equivalent accessible implementation.

Do not create an unnecessarily custom solution if a reliable existing component is already part of the stack.

---

## Open Command Menu

Keyboard shortcuts:

```text
Ctrl + K
```

and:

```text
Cmd + K
```

Support both Windows/Linux and macOS.

Also provide a clickable button in the UI.

Pressing:

```text
Esc
```

should close the command menu.

---

## Command Menu Sections

### Quick Actions

```text
Add Person
Add Institution
Create Event
Add Contribution
```

Clicking should navigate to the relevant existing create page or open the existing creation flow.

---

### Navigation

```text
Go to Dashboard
Go to People
Go to Institutions
Go to Events
Go to Users
Go to Audit Logs
Go to Settings
```

Only show routes the current user has permission to access.

---

### Search

Allow typing inside the command menu.

Examples:

```text
Rahim
```

Show global search results.

```text
People
Rahim Uddin

Institutions
Rahim High School

Events
Rahim Community Event
```

Reuse the Global Search API/service.

Do not duplicate search logic.

---

## Command Menu UX

Initial state:

```text
Quick Actions
Navigation
Recent Pages
```

When the user starts typing:

```text
Search Results
```

Show:

```text
Loading state
No results state
Keyboard navigation
```

Support:

```text
Arrow Up
Arrow Down
Enter
Esc
```

Make the component fully keyboard accessible.

---

## Recent Pages

Optionally track recently visited application pages.

Example:

```text
Recent

Rahim Uddin
Durga Puja 2025
People
Audit Logs
```

Store this locally in the browser.

Do not unnecessarily store recent navigation in MongoDB.

Limit recent items, for example:

```text
Maximum 5–10 items
```

Avoid duplicates.

---

# FEATURE 4: Backup and Restore

## IMPORTANT SECURITY REQUIREMENT

Backup and Restore is a highly sensitive administrative feature.

Only:

```text
SUPER_ADMIN
```

can access it.

Every backup and restore action must be audited.

Do not expose raw database credentials or MongoDB connection information.

Do not create an unsafe public endpoint.

---

# Backup System

Create a new settings section:

```text
/settings/backup
```

Only accessible by Super Admin.

Show:

```text
Database Backup

[Create Backup]
```

Before creating a backup, show confirmation:

```text
Create a backup of all application data?

[Cancel] [Create Backup]
```

---

## Backup Scope

Include application collections:

```text
users
people
children
institutions
events
contributions
audit_logs
```

Also automatically include any newly introduced related application collections if they are part of the existing application.

Do not hardcode system collections that do not belong to the application.

---

## Backup Format

Use a structured JSON backup format.

Example:

```json
{
  "metadata": {
    "appVersion": "1.0.0",
    "createdAt": "2026-08-19T00:00:00.000Z",
    "createdBy": {
      "id": "...",
      "name": "Super Admin"
    },
    "formatVersion": 1
  },
  "data": {
    "people": [],
    "children": [],
    "institutions": [],
    "events": [],
    "contributions": []
  }
}
```

Do NOT include password hashes in a normal downloadable backup unless there is a strong administrative requirement.

Prefer excluding authentication secrets and password hashes.

If user records must be backed up, use a safe strategy that does not expose credentials.

Never include:

- JWT secrets
- Environment variables
- MongoDB URI
- Refresh tokens
- Session secrets
- Password hashes in downloadable backups

---

## Backup API

Example:

```text
POST /api/backup
```

The endpoint must:

1. Require authentication.
2. Verify Super Admin role server-side.
3. Generate backup server-side.
4. Set proper download headers.
5. Return the JSON file as an attachment.
6. Create an audit log.

Example filename:

```text
community-backup-2026-08-19-143000.json
```

For large databases, avoid loading unnecessary duplicate data into memory where possible.

---

# Restore System

Create a restore section:

```text
/settings/backup
```

Show:

```text
Restore Database

Upload Backup File

[Choose File]

[Validate Backup]
```

The uploaded file must be validated before any restore operation.

---

## Restore Flow

### Step 1: Upload

Allow only supported backup files.

Example:

```text
.json
```

Validate:

- File type
- File size
- JSON syntax

---

### Step 2: Validate

Validate:

```text
formatVersion
metadata
required collections
document structure
ObjectId format
data types
references
```

Show a preview:

```text
Backup created:
19 August 2026

People: 1,250
Children: 800
Institutions: 30
Events: 10
Contributions: 5,000
```

Show warnings if data appears incompatible.

Do not restore invalid or incompatible backups.

---

### Step 3: Restore Mode Selection

Provide two modes.

## Merge Restore

```text
MERGE
```

Rules:

- Insert missing records.
- Update records with matching `_id` only when explicitly selected by the restore strategy.
- Avoid creating duplicates.
- Preserve valid relationships.

## Replace Application Data

```text
REPLACE
```

This is dangerous.

Clearly display:

```text
WARNING:
This will replace current application data with the backup data.
This action cannot be undone.
```

Require explicit confirmation.

Example:

```text
Type RESTORE to continue
```

Do not allow one-click destructive restore.

---

## Restore Transaction and Safety

Because MongoDB transactions require replica set support, detect the deployment capabilities.

If transactions are available:

- Use transactions where appropriate.

If a complete atomic restore is not practical:

- Validate everything before writing.
- Restore in dependency order.
- Record restore progress.
- Stop safely on critical failures.
- Never silently report a partially failed restore as successful.

Dependency order:

```text
Institutions
Users if applicable
People
Children
Events
Contributions
Other dependent collections
```

Consider reference dependencies carefully.

---

## Restore User Safety

Do not accidentally delete or lock out the currently authenticated Super Admin.

Before replace restore:

- Ensure at least one valid Super Admin will remain available.
- Preserve or safely handle the current Super Admin.
- Never restore invalid user credentials from an untrusted file.

Because downloadable backups should not contain password hashes, restoring users must use a safe strategy.

Preferred approach:

- Backup application data separately from authentication credentials.
- Do not replace user passwords.
- Match users by stable identifiers or email where appropriate.
- Preserve current authentication accounts.

Explain and implement this clearly.

---

## Restore API

Example:

```text
POST /api/backup/validate
POST /api/backup/restore
```

Restore must require:

- Authentication
- Super Admin role
- CSRF-safe request handling appropriate for the existing authentication approach
- Explicit restore mode
- Confirmation text for destructive restore

Create audit logs.

Example:

```text
action: RESTORE
entityType: BACKUP

metadata:
  backupCreatedAt
  restoreMode
  restoredCollections
  recordCounts
```

If the existing Audit Log schema does not support metadata, extend it in a backward-compatible way.

---

# Backup History

Add a backup activity/history section.

At minimum, audit logs should show:

```text
Backup Created
Backup Downloaded
Restore Validated
Restore Completed
Restore Failed
```

If the application supports server-side backup storage, add a dedicated `backups` collection.

Otherwise, do not pretend files remain stored after download.

---

# New Navigation and Permissions

Update the application so:

```text
Settings
 └── Backup & Restore
```

is visible only to:

```text
SUPER_ADMIN
```

The backend/API authorization is mandatory even if the menu is hidden.

Never rely only on frontend visibility.

---

# Audit Requirements

Add audit entries for:

## Duplicate Detection

When duplicate creation is overridden:

```text
DUPLICATE_OVERRIDE
```

or equivalent metadata inside the existing CREATE audit event.

Include:

```text
matchedPersonIds
matchReasons
```

## Global Search

Do NOT audit every normal search query because this can create unnecessary audit data.

## Command Menu

Do NOT audit ordinary navigation.

## Backup

Audit:

```text
BACKUP_CREATE
BACKUP_DOWNLOAD
```

or equivalent actions.

## Restore

Audit:

```text
RESTORE_VALIDATE
RESTORE_SUCCESS
RESTORE_FAILED
```

Include safe metadata but never store sensitive backup contents inside audit logs.

---

# Required UI Components

Add reusable components where appropriate:

```text
DuplicateWarningCard
DuplicateMatchList
GlobalSearchDialog
GlobalSearchResults
CommandMenu
BackupPanel
BackupValidationPreview
RestoreDialog
RestoreConfirmationDialog
```

Follow the existing component naming and folder conventions if they already differ.

Do not duplicate existing dialog, button, table, loading or toast components.

---

# Error Handling

Provide clear user-friendly messages.

Examples:

```text
Could not check duplicates. Please try again.
```

```text
No matching records found.
```

```text
Backup file is invalid or corrupted.
```

```text
Only Super Admin can restore data.
```

```text
Restore failed. No success should be reported until the operation completes successfully.
```

Do not expose internal MongoDB errors, stack traces, secrets or database connection details to the client.

---

# Performance Requirements

## Duplicate Detection

- Debounced
- Indexed queries
- Limited result count

## Global Search

- Minimum 2 characters
- Debounced
- Limited results
- Indexed queries
- No unbounded regex search

## Command Menu

- Reuse Global Search
- Avoid unnecessary API calls
- Load instantly

## Backup

- Server-side generation
- Handle larger datasets carefully

## Restore

- Validate before writing
- Avoid uncontrolled memory usage
- Restore in dependency-safe order

---

# Testing Requirements

Add tests where the existing project test setup supports them.

At minimum verify:

## Duplicate Detection

- Same primary mobile
- Primary vs alternative mobile match
- Same name + area
- Edit mode excludes current person
- Normalized names work correctly

## Global Search

- Authentication required
- Query validation
- Results grouped correctly
- Result limits work

## Command Menu

- Ctrl/Cmd + K opens it
- Esc closes it
- Keyboard navigation works
- Permissions hide restricted commands

## Backup and Restore

- Non-Super Admin is rejected
- Invalid backup is rejected
- Invalid JSON is rejected
- Backup validation works
- Merge restore works
- Replace restore requires confirmation
- Sensitive credentials are not exported
- Restore creates audit logs

---

# Final Implementation Rules

1. Do not rewrite existing modules unnecessarily.
2. Inspect and reuse the current architecture first.
3. Keep all database operations server-side.
4. Keep Route Handlers thin.
5. Put complex logic into reusable services.
6. Reuse existing authentication and authorization.
7. Reuse existing audit logging.
8. Add proper MongoDB indexes where needed.
9. Do not expose sensitive information.
10. All destructive actions require confirmation.
11. Backup and Restore must only work for Super Admin.
12. Do not break existing People, Events, Contributions or Reports functionality.
13. Maintain backward compatibility with existing MongoDB data.
14. If schema changes are required, provide safe migration/backfill logic.
15. Follow the existing coding style and folder structure.

---

# Implementation Order

Implement in this order:

## Phase 1

Inspect the existing project architecture and identify the exact files that need modification.

## Phase 2

Implement reusable normalization and Duplicate Person Detection service, API and UI.

## Phase 3

Implement Global Search API, search service and Global Search Dialog.

## Phase 4

Implement Command Menu and connect it to Global Search and existing navigation/actions.

## Phase 5

Implement secure Backup generation.

## Phase 6

Implement Backup validation and safe Restore functionality.

## Phase 7

Add authorization, audit logs, error handling and tests.

Before modifying code, first provide a concise implementation plan showing:

- Existing files to modify
- New files to create
- MongoDB schema/index changes
- API routes to add
- UI components to add
- Security considerations

Then implement the features step by step without rewriting unrelated working functionality.
