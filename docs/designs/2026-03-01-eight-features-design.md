# Design: 8 New Features for Next Step

**Date:** 2026-03-01
**Priority:** Urgent
**Scope:** Medium (3-5 days)
**Target Users:** End users (patients & family caregivers)

---

## Established Patterns (must follow)

All new features must follow these exact conventions from the codebase:

### File Patterns
- **Pages:** `src/app/(app)/<feature>/page.tsx` — `'use client'`, uses `useApp()` for workspace, `Header` + `PageContainer` layout
- **API routes:** `src/app/api/workspaces/[id]/<feature>/route.ts` — uses `withAuth`, `checkWorkspaceAccess`, `canEdit`, Zod validation, audit log on writes
- **Components:** `src/components/<feature>/ComponentName.tsx` — `'use client'`, uses UI kit (`Card`, `Button`, `showToast`)
- **Validation:** `src/lib/validation/schemas.ts` — Zod schemas with type exports
- **Dexie tables:** `src/lib/sync/db.ts` — interface + table definition, bump version
- **Sync ops:** `src/lib/sync/manager.ts` — add entity types and op handlers

### UI Patterns
- Colors: `primary-*` (sage green), `secondary-*` (warm stone), `accent-*` (terracotta), `alert-*` (soft red), `cream-*` (warm neutral)
- Semantic: `bg-background`, `bg-surface`, `bg-muted`, `border-border`
- Cards: `<Card>` with `shadow-card`, `rounded-card` (20px)
- Touch: `min-h-touch` (48px), large tap targets
- Typography: `font-display` for headings, `text-secondary-900` for titles, `text-secondary-500` for meta
- Icons: `lucide-react`, 6x6 default, stroke color matching text
- States: `LoadingState`, `EmptyState`, `ErrorState` from `@/components/ui`
- Toast: `showToast('message', 'success'|'error')`
- Page structure: `<Header title="X" />` then `<PageContainer className="pt-4 space-y-6">`

### API Patterns
```typescript
export const GET = withAuth(async (req: AuthenticatedRequest, { params }) => {
  const { id: workspaceId } = await params
  const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  // ... logic
})

export const POST = withAuth(async (req: AuthenticatedRequest, { params }) => {
  const { id: workspaceId } = await params
  const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
  if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  // ... create + audit log
})
```

### Data fetch pattern (pages)
```typescript
// 1. useLiveQuery from Dexie for offline-first
const localData = useLiveQuery(() => db.table.where('workspaceId').equals(id)..., [id])
// 2. Also fetch from server
const fetchData = useCallback(async () => { ... }, [currentWorkspace.id])
// 3. Combine: prefer server, fallback to local
const data = serverData.length > 0 ? serverData : localData || []
```

---

## Prisma Schema Additions

All 8 features in a single migration:

```prisma
// ============================================
// TEMPERATURE LOG
// ============================================

model TemperatureLog {
  id          String    @id @default(cuid())
  workspaceId String
  recordedAt  DateTime  @default(now())
  tempCelsius Float
  method      String?   // "oral", "forehead", "ear", "armpit"
  notes       String?
  createdById String
  deletedAt   DateTime?

  // Sync
  version     Int       @default(1)
  syncedAt    DateTime  @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("TempLogCreatedBy", fields: [createdById], references: [id])

  @@index([workspaceId, recordedAt])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// CONTACT DIRECTORY
// ============================================

model Contact {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  role        String    // "Oncologist", "Pharmacist", etc.
  category    String    // "ONCOLOGY", "HOSPITAL", "PHARMACY", "INSURANCE", "FAMILY", "OTHER"
  phone       String
  phone2      String?
  email       String?
  address     String?
  hours       String?   // "Mon-Fri 8am-5pm"
  notes       String?
  isEmergency Boolean   @default(false)
  sortOrder   Int       @default(0)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String
  updatedById String

  // Sync
  version     Int       @default(1)
  syncedAt    DateTime  @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("ContactCreatedBy", fields: [createdById], references: [id])
  updatedBy User      @relation("ContactUpdatedBy", fields: [updatedById], references: [id])

  @@index([workspaceId, category])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// WEIGHT LOG
// ============================================

model WeightLog {
  id          String    @id @default(cuid())
  workspaceId String
  recordedAt  DateTime  @default(now())
  weightKg    Float
  notes       String?
  createdById String
  deletedAt   DateTime?

  // Sync
  version     Int       @default(1)
  syncedAt    DateTime  @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("WeightLogCreatedBy", fields: [createdById], references: [id])

  @@index([workspaceId, recordedAt])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// TREATMENT TIMELINE
// ============================================

enum MilestoneStatus {
  SCHEDULED
  COMPLETED
  DELAYED
  CANCELLED
}

model TreatmentMilestone {
  id          String          @id @default(cuid())
  workspaceId String
  type        String          // "CHEMO_CYCLE", "SURGERY", "RADIATION", "SCAN", "CONSULTATION", "OTHER"
  title       String
  description String?
  plannedDate DateTime
  actualDate  DateTime?
  status      MilestoneStatus @default(SCHEDULED)
  sortOrder   Int             @default(0)
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  createdById String
  updatedById String

  // Sync
  version     Int             @default(1)
  syncedAt    DateTime        @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("MilestoneCreatedBy", fields: [createdById], references: [id])
  updatedBy User      @relation("MilestoneUpdatedBy", fields: [updatedById], references: [id])

  @@index([workspaceId, plannedDate])
  @@index([workspaceId, status])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// CAREGIVER TASKS
// ============================================

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  CANCELLED
}

enum TaskPriority {
  URGENT
  HIGH
  NORMAL
  LOW
}

model CaregiverTask {
  id            String       @id @default(cuid())
  workspaceId   String
  title         String
  description   String?
  category      String       // "MEDICAL", "ERRANDS", "MEALS", "EMOTIONAL", "OTHER"
  priority      TaskPriority @default(NORMAL)
  status        TaskStatus   @default(TODO)
  assignedToId  String?
  dueDate       DateTime?
  completedAt   DateTime?
  completedById String?
  deletedAt     DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  createdById   String
  updatedById   String

  // Sync
  version       Int          @default(1)
  syncedAt      DateTime     @default(now())

  // Relations
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("TaskCreatedBy", fields: [createdById], references: [id])
  updatedBy   User      @relation("TaskUpdatedBy", fields: [updatedById], references: [id])
  assignedTo  User?     @relation("TaskAssignedTo", fields: [assignedToId], references: [id])
  completedBy User?     @relation("TaskCompletedBy", fields: [completedById], references: [id])

  @@index([workspaceId, status])
  @@index([workspaceId, assignedToId])
  @@index([workspaceId, dueDate])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// LAB RESULTS
// ============================================

model LabResult {
  id          String    @id @default(cuid())
  workspaceId String
  testDate    DateTime
  panelName   String    // "Complete Blood Count", "Comprehensive Metabolic", etc.
  labName     String?   // "Quest", "Hospital Lab"
  results     Json      // Array of { marker, value, unit, refMin, refMax, flag }
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String
  updatedById String

  // Sync
  version     Int       @default(1)
  syncedAt    DateTime  @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("LabResultCreatedBy", fields: [createdById], references: [id])
  updatedBy User      @relation("LabResultUpdatedBy", fields: [updatedById], references: [id])

  @@index([workspaceId, testDate])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// MEDICAL DOCUMENTS
// ============================================

model MedicalDocument {
  id          String    @id @default(cuid())
  workspaceId String
  title       String
  category    String    // "LAB_REPORT", "SCAN", "INSURANCE", "ID_CARD", "PRESCRIPTION", "OTHER"
  fileName    String
  fileSize    Int       // bytes
  mimeType    String    // "application/pdf", "image/jpeg"
  fileData    Bytes     // Store in DB as bytes (self-hosted, no S3)
  dateTaken   DateTime?
  expiryDate  DateTime?
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String

  // Sync (no offline sync for file blobs — too large)
  version     Int       @default(1)
  syncedAt    DateTime  @default(now())

  // Relations
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation("DocCreatedBy", fields: [createdById], references: [id])

  @@index([workspaceId, category])
  @@index([workspaceId, deletedAt])
  @@index([syncedAt])
}

// ============================================
// DRUG INTERACTIONS (cached lookups)
// ============================================

model DrugInteraction {
  id            String   @id @default(cuid())
  workspaceId   String
  medication1Id String
  medication2Id String
  severity      String   // "MINOR", "MODERATE", "MAJOR", "CONTRAINDICATED"
  description   String
  checkedAt     DateTime @default(now())

  // Relations
  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  medication1 Medication @relation("Interaction1", fields: [medication1Id], references: [id], onDelete: Cascade)
  medication2 Medication @relation("Interaction2", fields: [medication2Id], references: [id], onDelete: Cascade)

  @@unique([workspaceId, medication1Id, medication2Id])
  @@index([workspaceId])
}
```

### User model additions (relations)
```prisma
// Add to User model:
  temperatureLogs       TemperatureLog[]  @relation("TempLogCreatedBy")
  createdContacts       Contact[]         @relation("ContactCreatedBy")
  updatedContacts       Contact[]         @relation("ContactUpdatedBy")
  weightLogs            WeightLog[]       @relation("WeightLogCreatedBy")
  createdMilestones     TreatmentMilestone[] @relation("MilestoneCreatedBy")
  updatedMilestones     TreatmentMilestone[] @relation("MilestoneUpdatedBy")
  createdTasks          CaregiverTask[]   @relation("TaskCreatedBy")
  updatedTasks          CaregiverTask[]   @relation("TaskUpdatedBy")
  assignedTasks         CaregiverTask[]   @relation("TaskAssignedTo")
  completedTasks        CaregiverTask[]   @relation("TaskCompletedBy")
  createdLabResults     LabResult[]       @relation("LabResultCreatedBy")
  updatedLabResults     LabResult[]       @relation("LabResultUpdatedBy")
  createdDocuments      MedicalDocument[] @relation("DocCreatedBy")

// Add to Workspace model:
  temperatureLogs       TemperatureLog[]
  contacts              Contact[]
  weightLogs            WeightLog[]
  milestones            TreatmentMilestone[]
  caregiverTasks        CaregiverTask[]
  labResults            LabResult[]
  medicalDocuments      MedicalDocument[]
  drugInteractions      DrugInteraction[]

// Add to Medication model:
  interactions1         DrugInteraction[] @relation("Interaction1")
  interactions2         DrugInteraction[] @relation("Interaction2")
```

---

## Dexie DB (Version 3)

Add to `src/lib/sync/db.ts`:

```typescript
// New interfaces
export interface LocalTemperatureLog {
  id: string
  workspaceId: string
  recordedAt: string
  tempCelsius: number
  method: string | null
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
}

export interface LocalContact {
  id: string
  workspaceId: string
  name: string
  role: string
  category: string
  phone: string
  phone2: string | null
  email: string | null
  address: string | null
  hours: string | null
  notes: string | null
  isEmergency: boolean
  sortOrder: number
  deletedAt: string | null
  version: number
  syncedAt: string
}

export interface LocalWeightLog {
  id: string
  workspaceId: string
  recordedAt: string
  weightKg: number
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
}

export interface LocalMilestone {
  id: string
  workspaceId: string
  type: string
  title: string
  description: string | null
  plannedDate: string
  actualDate: string | null
  status: string
  sortOrder: number
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
}

export interface LocalCaregiverTask {
  id: string
  workspaceId: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  assignedToId: string | null
  dueDate: string | null
  completedAt: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  assignedTo?: { id: string; name: string }
  createdBy?: { id: string; name: string }
}

export interface LocalLabResult {
  id: string
  workspaceId: string
  testDate: string
  panelName: string
  labName: string | null
  results: Array<{
    marker: string
    value: number
    unit: string
    refMin: number | null
    refMax: number | null
    flag: string | null // "LOW", "HIGH", "CRITICAL_LOW", "CRITICAL_HIGH", null
  }>
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
}

// Version 3 stores
this.version(3).stores({
  appointments: 'id, workspaceId, datetime, deletedAt',
  medications: 'id, workspaceId, active, deletedAt',
  notes: 'id, workspaceId, type, deletedAt',
  doseLogs: 'id, medicationId, workspaceId, takenAt',
  workspaces: 'id',
  symptoms: 'id, workspaceId, type, recordedAt, deletedAt',
  temperatureLogs: 'id, workspaceId, recordedAt, deletedAt',
  contacts: 'id, workspaceId, category, deletedAt',
  weightLogs: 'id, workspaceId, recordedAt, deletedAt',
  milestones: 'id, workspaceId, plannedDate, status, deletedAt',
  caregiverTasks: 'id, workspaceId, status, assignedToId, deletedAt',
  labResults: 'id, workspaceId, testDate, deletedAt',
  outbox: 'id, workspaceId, timestamp',
  syncMeta: 'id, workspaceId',
})
```

Note: Medical documents are NOT stored in Dexie (too large for IndexedDB). They are server-only.

---

## Zod Validation Schemas

Add to `src/lib/validation/schemas.ts`:

```typescript
// Temperature Log
export const temperatureLogSchema = z.object({
  tempCelsius: z.number().min(30).max(45),
  method: z.enum(['oral', 'forehead', 'ear', 'armpit']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
})

// Contact
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().min(1, 'Role is required').max(100),
  category: z.enum(['ONCOLOGY', 'HOSPITAL', 'PHARMACY', 'INSURANCE', 'FAMILY', 'OTHER']),
  phone: z.string().min(1, 'Phone is required').max(50),
  phone2: z.string().max(50).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  hours: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  isEmergency: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

// Weight Log
export const weightLogSchema = z.object({
  weightKg: z.number().min(1).max(500),
  notes: z.string().max(500).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
})

// Treatment Milestone
export const milestoneSchema = z.object({
  type: z.enum(['CHEMO_CYCLE', 'SURGERY', 'RADIATION', 'SCAN', 'CONSULTATION', 'OTHER']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  plannedDate: z.string().datetime(),
  actualDate: z.string().datetime().nullable().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'DELAYED', 'CANCELLED']).default('SCHEDULED'),
  notes: z.string().max(2000).nullable().optional(),
})

// Caregiver Task
export const caregiverTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(['MEDICAL', 'ERRANDS', 'MEALS', 'EMOTIONAL', 'OTHER']),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).default('TODO'),
  assignedToId: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

// Lab Result
const labMarkerSchema = z.object({
  marker: z.string().min(1).max(50),
  value: z.number(),
  unit: z.string().max(20),
  refMin: z.number().nullable().optional(),
  refMax: z.number().nullable().optional(),
  flag: z.enum(['LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH']).nullable().optional(),
})

export const labResultSchema = z.object({
  testDate: z.string().datetime(),
  panelName: z.string().min(1).max(200),
  labName: z.string().max(200).nullable().optional(),
  results: z.array(labMarkerSchema).min(1),
  notes: z.string().max(2000).nullable().optional(),
})

// Medical Document (metadata only — file sent as multipart)
export const medicalDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.enum(['LAB_REPORT', 'SCAN', 'INSURANCE', 'ID_CARD', 'PRESCRIPTION', 'OTHER']),
  dateTaken: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

// Drug Interaction Check
export const interactionCheckSchema = z.object({
  medicationIds: z.array(z.string().cuid()).min(2).max(20),
})

// Type exports
export type TemperatureLogInput = z.infer<typeof temperatureLogSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type WeightLogInput = z.infer<typeof weightLogSchema>
export type MilestoneInput = z.infer<typeof milestoneSchema>
export type CaregiverTaskInput = z.infer<typeof caregiverTaskSchema>
export type LabMarker = z.infer<typeof labMarkerSchema>
export type LabResultInput = z.infer<typeof labResultSchema>
export type MedicalDocumentInput = z.infer<typeof medicalDocumentSchema>
export type InteractionCheckInput = z.infer<typeof interactionCheckSchema>
```

---

## Sync Ops Extensions

Add to `syncOpSchema.type`:
```
'LOG_TEMP', 'DELETE_TEMP',
'CREATE_CONTACT', 'UPDATE_CONTACT', 'DELETE_CONTACT',
'LOG_WEIGHT', 'DELETE_WEIGHT',
'CREATE_MILESTONE', 'UPDATE_MILESTONE', 'DELETE_MILESTONE',
'CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK', 'COMPLETE_TASK',
'CREATE_LAB', 'UPDATE_LAB', 'DELETE_LAB'
```

Add to `syncOpSchema.entityType`:
```
'TEMPERATURE_LOG', 'CONTACT', 'WEIGHT_LOG', 'MILESTONE', 'CAREGIVER_TASK', 'LAB_RESULT'
```

---

## API Endpoints

### Feature 1: Temperature Log
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/temperature` | List logs (query: from, to, limit) |
| POST | `/api/workspaces/[id]/temperature` | Create log |
| DELETE | `/api/workspaces/[id]/temperature/[tempId]` | Soft delete |

### Feature 2: Contact Directory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/contacts` | List contacts (query: category) |
| POST | `/api/workspaces/[id]/contacts` | Create contact |
| PATCH | `/api/workspaces/[id]/contacts/[contactId]` | Update contact |
| DELETE | `/api/workspaces/[id]/contacts/[contactId]` | Soft delete |

### Feature 3: Weight Log
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/weight` | List logs (query: from, to, limit) |
| POST | `/api/workspaces/[id]/weight` | Create log |
| DELETE | `/api/workspaces/[id]/weight/[weightId]` | Soft delete |

### Feature 4: Treatment Timeline
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/milestones` | List milestones |
| POST | `/api/workspaces/[id]/milestones` | Create milestone |
| PATCH | `/api/workspaces/[id]/milestones/[milestoneId]` | Update (inc. status) |
| DELETE | `/api/workspaces/[id]/milestones/[milestoneId]` | Soft delete |

### Feature 5: Caregiver Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/tasks` | List tasks (query: status, assignedTo) |
| POST | `/api/workspaces/[id]/tasks` | Create task |
| PATCH | `/api/workspaces/[id]/tasks/[taskId]` | Update task |
| POST | `/api/workspaces/[id]/tasks/[taskId]/complete` | Mark complete |
| DELETE | `/api/workspaces/[id]/tasks/[taskId]` | Soft delete |

### Feature 6: Lab Results
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/lab-results` | List results (query: from, to) |
| GET | `/api/workspaces/[id]/lab-results/trends` | Trend data for specific marker |
| POST | `/api/workspaces/[id]/lab-results` | Create result |
| PATCH | `/api/workspaces/[id]/lab-results/[labId]` | Update result |
| DELETE | `/api/workspaces/[id]/lab-results/[labId]` | Soft delete |

### Feature 7: Medical Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces/[id]/documents` | List documents (metadata only) |
| POST | `/api/workspaces/[id]/documents` | Upload (multipart/form-data) |
| GET | `/api/workspaces/[id]/documents/[docId]` | Download file |
| DELETE | `/api/workspaces/[id]/documents/[docId]` | Soft delete |

### Feature 8: Drug Interactions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workspaces/[id]/medications/check-interactions` | Check all meds |
| GET | `/api/workspaces/[id]/medications/interactions` | Get cached results |

---

## UI/Page Design

### Navigation Change

The bottom nav currently has 5 items. With 8 new features, the "More" (Settings) tab becomes a hub. The new features are accessed via:

- **Today page** surfaces: Temperature, Weight (quick log cards), upcoming tasks, next milestone
- **Bottom nav** stays as-is (Today, Appts, Meds, Symptoms, More)
- **"More" page** (`/settings`) becomes a menu with sections:
  - Account & Settings (existing)
  - **Health Tracking**: Temperature, Weight, Lab Results
  - **Care Team**: Contact Directory, Caregiver Tasks
  - **Treatment**: Timeline, Medical Documents
  - **Safety**: Drug Interactions

### Feature 1: Temperature Log — `/temperature`

**Page structure:**
- Header: "Temperature" with History icon (right)
- Quick log card: big number input (keyboard type=decimal), method selector (4 pill buttons: Oral/Forehead/Ear/Armpit), optional notes, "Log Temperature" button
- **Fever alert banner**: if last reading >= 38.0°C, show red alert card: "FEVER DETECTED — 38.3°C" with "Call Clinic" button using `tel:` link from workspace.clinicPhone
- Last 7 days: mini chart (horizontal bar or sparkline showing daily temps)
- Recent readings: list of TemperatureCard components

**Components:**
- `src/components/temperature/TempQuickLog.tsx` — number input, method pills, submit
- `src/components/temperature/TempCard.tsx` — single reading display
- `src/components/temperature/TempChart.tsx` — 7-day chart (pure CSS bars, no lib needed)
- `src/components/temperature/FeverAlert.tsx` — red alert banner with call button

**Key UX:**
- Default unit based on locale (°C for AU). Display toggle °C/°F.
- 38.0°C threshold → yellow warning. 38.5°C → red emergency.
- Number input: show decimal keyboard on mobile via `inputMode="decimal"`

### Feature 2: Contact Directory — `/contacts`

**Page structure:**
- Header: "Care Team" with Plus icon (right)
- Category filter tabs: All / Oncology / Hospital / Pharmacy / Insurance / Family
- Emergency contacts section at top (if any marked isEmergency)
- Contact cards: avatar circle (first letter), name, role, big green CALL button
- Tap card → expand to show all details

**Components:**
- `src/components/contacts/ContactCard.tsx` — name, role, call button, expandable
- `src/components/contacts/ContactForm.tsx` — modal form for create/edit
- `src/components/contacts/CategoryTabs.tsx` — horizontal scroll filter

### Feature 3: Weight Log — `/weight`

**Page structure:**
- Header: "Weight" with History icon
- Quick log: large number input (kg), small toggle for kg/lbs, notes, "Log Weight" button
- Trend card: 30-day line chart (CSS-based or simple SVG)
- Alert card: if weight changed >2kg in 24hrs, show warning
- Recent readings: list

**Components:**
- `src/components/weight/WeightQuickLog.tsx`
- `src/components/weight/WeightCard.tsx`
- `src/components/weight/WeightChart.tsx` — simple SVG line chart
- `src/components/weight/WeightAlert.tsx` — rapid change warning

### Feature 4: Treatment Timeline — `/timeline`

**Page structure:**
- Header: "Treatment Journey" with Plus icon
- Progress bar at top: "Cycle 4 of 6 — 67% Complete" (calculated from completed/total milestones)
- Vertical timeline: milestones sorted by plannedDate
  - Left: date
  - Center: dot (green=completed, blue=scheduled, orange=delayed, gray=cancelled)
  - Right: title, type badge, notes
- Bottom: "Add Milestone" button

**Components:**
- `src/components/timeline/TimelineView.tsx` — vertical timeline layout
- `src/components/timeline/MilestoneCard.tsx` — single milestone
- `src/components/timeline/ProgressBar.tsx` — overall progress
- `src/components/timeline/MilestoneForm.tsx` — modal for create/edit

**Key UX:**
- Completed milestones have a subtle celebration effect (checkmark)
- Auto-scroll to "now" position in timeline
- Color by type: blue=chemo, orange=surgery, purple=radiation, green=scan

### Feature 5: Caregiver Tasks — `/tasks`

**Page structure:**
- Header: "Tasks" with Plus icon
- Filter tabs: My Tasks / All / Done
- Task list grouped by priority (Urgent at top)
- Each task: title, assignee avatar, due date, category chip, priority indicator
- Swipe right to complete (or tap checkbox)
- FAB or bottom "Add Task" button

**Components:**
- `src/components/tasks/TaskCard.tsx` — task with checkbox, assignee, due date
- `src/components/tasks/TaskForm.tsx` — modal with assignee picker (workspace members)
- `src/components/tasks/TaskFilters.tsx` — status/assignee filter

**Key UX:**
- "Quick add" templates: "Pick up prescription", "Drive to appointment", "Prepare meals"
- Overdue tasks highlighted in accent/red
- Completion shows brief success animation

### Feature 6: Lab Results — `/lab-results`

**Page structure:**
- Header: "Lab Results" with Plus icon
- Tab: Recent / Trends
- **Recent tab:** List of lab result cards sorted by date, showing panel name, date, flag count
- **Trends tab:** Marker selector (dropdown: WBC, RBC, Platelets, Hemoglobin, etc.) → SVG line chart with reference range shaded
- Add result: modal with panel template selector (CBC template pre-fills common markers)

**Components:**
- `src/components/labs/LabResultCard.tsx` — panel summary with flagged values highlighted
- `src/components/labs/LabResultForm.tsx` — panel selector + marker rows (marker/value/unit/range)
- `src/components/labs/LabTrendChart.tsx` — SVG chart with ref range shading
- `src/components/labs/MarkerRow.tsx` — single marker with flag coloring

**Key UX:**
- Pre-built panel templates: CBC (WBC, RBC, Hemoglobin, Hematocrit, Platelets), CMP, Liver, Tumor Markers
- Flag colors: green=normal, yellow=borderline, red=out of range, dark red=critical
- "Share with doctor" → links to print page

### Feature 7: Medical Documents — `/documents`

**Page structure:**
- Header: "Documents" with Plus icon (upload)
- Category filter: All / Lab Reports / Scans / Insurance / Prescriptions
- Document grid: 2 columns, thumbnail (icon by type), title, date, category badge
- Tap → full-screen viewer (PDF in iframe, images native)
- Upload: file picker, category select, title, date, notes

**Components:**
- `src/components/documents/DocumentCard.tsx` — thumbnail, title, category badge
- `src/components/documents/DocumentUpload.tsx` — file picker modal
- `src/components/documents/DocumentViewer.tsx` — full-screen view

**Key UX:**
- Max file size: 10MB
- Accepted types: PDF, JPG, PNG
- Expiry badge on insurance cards approaching expiry
- No offline sync for documents (too large) — show "Requires internet" badge

### Feature 8: Drug Interaction Checker — `/meds` (integrated)

**Not a separate page.** Integrated into the medications section:
- "Check Interactions" button on meds list page
- Results shown as a modal/sheet with severity-colored cards
- Warning banner on individual medication detail pages if interactions exist

**Implementation approach (simplified, no external API for v1):**
- Ship with a local lookup table of ~200 common chemo drug interactions (JSON file)
- `src/lib/interactions/checker.ts` — pure function that takes med names, returns known interactions
- `src/lib/interactions/data.ts` — curated interaction database
- Can upgrade to external API (OpenFDA/RxNorm) later

**Components:**
- `src/components/medications/InteractionCheck.tsx` — button + results modal
- `src/components/medications/InteractionCard.tsx` — severity badge, description
- `src/components/medications/InteractionBanner.tsx` — warning on med detail

---

## Implementation Order & Tasks

### Batch 1: Schema & Infrastructure (do first)

- [ ] **Prisma schema migration** `priority:1` `time:30min`
  - files: `prisma/schema.prisma`
  - Add all 8 models + User/Workspace/Medication relation updates
  - Run `npx prisma migrate dev --name add-eight-features`
  - Verify migration succeeds

- [ ] **Zod validation schemas** `priority:1` `time:20min`
  - files: `src/lib/validation/schemas.ts`
  - Add all 8 schema definitions and type exports

- [ ] **Dexie DB version 3** `priority:1` `time:20min`
  - files: `src/lib/sync/db.ts`
  - Add interfaces and version 3 stores

- [ ] **Sync ops expansion** `priority:1` `time:15min`
  - files: `src/lib/sync/manager.ts`, `src/lib/validation/schemas.ts`
  - Add new entity types and op types to sync schema

### Batch 2: Low Complexity Features (build fast)

- [ ] **Feature 1: Temperature Log** `priority:2` `deps:Batch 1` `time:3hr`
  - API: `src/app/api/workspaces/[id]/temperature/route.ts`
  - API: `src/app/api/workspaces/[id]/temperature/[tempId]/route.ts`
  - Components: `src/components/temperature/TempQuickLog.tsx`
  - Components: `src/components/temperature/TempCard.tsx`
  - Components: `src/components/temperature/TempChart.tsx`
  - Components: `src/components/temperature/FeverAlert.tsx`
  - Page: `src/app/(app)/temperature/page.tsx`
  - Page: `src/app/(app)/temperature/history/page.tsx`

- [ ] **Feature 2: Contact Directory** `priority:2` `deps:Batch 1` `time:3hr`
  - API: `src/app/api/workspaces/[id]/contacts/route.ts`
  - API: `src/app/api/workspaces/[id]/contacts/[contactId]/route.ts`
  - Components: `src/components/contacts/ContactCard.tsx`
  - Components: `src/components/contacts/ContactForm.tsx`
  - Components: `src/components/contacts/CategoryTabs.tsx`
  - Page: `src/app/(app)/contacts/page.tsx`

- [ ] **Feature 3: Weight Log** `priority:2` `deps:Batch 1` `time:2.5hr`
  - API: `src/app/api/workspaces/[id]/weight/route.ts`
  - API: `src/app/api/workspaces/[id]/weight/[weightId]/route.ts`
  - Components: `src/components/weight/WeightQuickLog.tsx`
  - Components: `src/components/weight/WeightCard.tsx`
  - Components: `src/components/weight/WeightChart.tsx`
  - Components: `src/components/weight/WeightAlert.tsx`
  - Page: `src/app/(app)/weight/page.tsx`
  - Page: `src/app/(app)/weight/history/page.tsx`

### Batch 3: Medium Complexity Features

- [ ] **Feature 4: Treatment Timeline** `priority:3` `deps:Batch 1` `time:4hr`
  - API: `src/app/api/workspaces/[id]/milestones/route.ts`
  - API: `src/app/api/workspaces/[id]/milestones/[milestoneId]/route.ts`
  - Components: `src/components/timeline/TimelineView.tsx`
  - Components: `src/components/timeline/MilestoneCard.tsx`
  - Components: `src/components/timeline/ProgressBar.tsx`
  - Components: `src/components/timeline/MilestoneForm.tsx`
  - Page: `src/app/(app)/timeline/page.tsx`

- [ ] **Feature 5: Caregiver Tasks** `priority:3` `deps:Batch 1` `time:4hr`
  - API: `src/app/api/workspaces/[id]/tasks/route.ts`
  - API: `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts`
  - API: `src/app/api/workspaces/[id]/tasks/[taskId]/complete/route.ts`
  - Components: `src/components/tasks/TaskCard.tsx`
  - Components: `src/components/tasks/TaskForm.tsx`
  - Components: `src/components/tasks/TaskFilters.tsx`
  - Page: `src/app/(app)/tasks/page.tsx`

### Batch 4: High Complexity Features

- [ ] **Feature 6: Lab Results** `priority:4` `deps:Batch 1` `time:5hr`
  - Lib: `src/lib/labs/panels.ts` (CBC, CMP, Liver panel templates)
  - API: `src/app/api/workspaces/[id]/lab-results/route.ts`
  - API: `src/app/api/workspaces/[id]/lab-results/trends/route.ts`
  - API: `src/app/api/workspaces/[id]/lab-results/[labId]/route.ts`
  - Components: `src/components/labs/LabResultCard.tsx`
  - Components: `src/components/labs/LabResultForm.tsx`
  - Components: `src/components/labs/LabTrendChart.tsx`
  - Components: `src/components/labs/MarkerRow.tsx`
  - Page: `src/app/(app)/lab-results/page.tsx`

- [ ] **Feature 7: Medical Documents** `priority:4` `deps:Batch 1` `time:4hr`
  - API: `src/app/api/workspaces/[id]/documents/route.ts` (multipart upload)
  - API: `src/app/api/workspaces/[id]/documents/[docId]/route.ts` (download + delete)
  - Components: `src/components/documents/DocumentCard.tsx`
  - Components: `src/components/documents/DocumentUpload.tsx`
  - Components: `src/components/documents/DocumentViewer.tsx`
  - Page: `src/app/(app)/documents/page.tsx`

- [ ] **Feature 8: Drug Interactions** `priority:4` `deps:Batch 1` `time:3hr`
  - Lib: `src/lib/interactions/data.ts` (curated interaction database)
  - Lib: `src/lib/interactions/checker.ts` (lookup logic)
  - API: `src/app/api/workspaces/[id]/medications/check-interactions/route.ts`
  - Components: `src/components/medications/InteractionCheck.tsx`
  - Components: `src/components/medications/InteractionCard.tsx`
  - Components: `src/components/medications/InteractionBanner.tsx`

### Batch 5: Integration & Polish

- [ ] **Update Settings/More page** `priority:5` `time:1hr`
  - files: `src/app/(app)/settings/page.tsx`
  - Add navigation links to all new features grouped by section

- [ ] **Update Today dashboard** `priority:5` `time:2hr`
  - files: `src/app/(app)/today/page.tsx`
  - Add cards: latest temp, pending tasks, next milestone, weight trend
  - Fever alert banner at top if applicable

- [ ] **Update EmptyState component** `priority:5` `time:15min`
  - files: `src/components/ui/states.tsx`
  - Add new icon types: temperature, contacts, weight, timeline, tasks, labs, documents

- [ ] **Tests** `priority:5` `time:2hr`
  - Temperature threshold logic
  - Weight change alert calculations
  - Lab result flag detection
  - Drug interaction checker
  - All Zod schemas validation

---

## Total Estimated Time

| Batch | Time |
|-------|------|
| Batch 1: Schema & Infrastructure | ~1.5hr |
| Batch 2: Temperature + Contacts + Weight | ~8.5hr |
| Batch 3: Timeline + Tasks | ~8hr |
| Batch 4: Labs + Documents + Interactions | ~12hr |
| Batch 5: Integration & Polish | ~5hr |
| **Total** | **~35hr** |

With parallel work on independent features, achievable in 4-5 focused days.
