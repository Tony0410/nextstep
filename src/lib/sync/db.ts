import Dexie, { type Table } from 'dexie'

export interface LocalAppointment {
  id: string
  workspaceId: string
  title: string
  datetime: string
  location: string | null
  mapUrl: string | null
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
}

export interface LocalMedication {
  id: string
  workspaceId: string
  name: string
  instructions: string | null
  scheduleType: string
  scheduleData: Record<string, unknown>
  startDate: string | null
  endDate: string | null
  active: boolean
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
  // Refill tracking fields
  pillCount: number | null
  pillsPerDose: number | null
  refillThreshold: number | null
  lastRefillDate: string | null
}

export interface LocalNote {
  id: string
  workspaceId: string
  type: 'QUESTION' | 'GENERAL'
  content: string
  askedAt: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  createdAt: string
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
}

export interface LocalDoseLog {
  id: string
  medicationId: string
  workspaceId: string
  takenAt: string
  undoneAt: string | null
  syncedAt: string
  medication?: { id: string; name: string }
  loggedBy?: { id: string; name: string }
  undoneBy?: { id: string; name: string } | null
}

export interface LocalWorkspace {
  id: string
  name: string
  clinicPhone: string | null
  emergencyPhone: string | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
  largeTextMode: boolean
  role?: string
  updatedAt: string
  // Emergency info fields
  patientName: string | null
  patientDOB: string | null
  bloodType: string | null
  allergies: string | null
  medicalConditions: string | null
  primaryPhysician: string | null
  physicianPhone: string | null
}

export type SymptomType = 'FATIGUE' | 'NAUSEA' | 'PAIN' | 'APPETITE' | 'SLEEP' | 'MOOD' | 'CUSTOM'

export interface LocalSymptom {
  id: string
  workspaceId: string
  type: SymptomType
  customName: string | null
  severity: number
  notes: string | null
  recordedAt: string
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
}

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
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
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
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
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
  updatedBy?: { id: string; name: string }
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
    flag: string | null
  }>
  notes: string | null
  deletedAt: string | null
  version: number
  syncedAt: string
  createdBy?: { id: string; name: string }
  updatedBy?: { id: string; name: string }
}

export type SyncOpType =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'TAKE_DOSE' | 'UNDO_DOSE' | 'MARK_ASKED' | 'UNMARK_ASKED' | 'REFILL'
  | 'LOG_SYMPTOM' | 'DELETE_SYMPTOM'
  | 'LOG_TEMP' | 'DELETE_TEMP'
  | 'CREATE_CONTACT' | 'UPDATE_CONTACT' | 'DELETE_CONTACT'
  | 'LOG_WEIGHT' | 'DELETE_WEIGHT'
  | 'CREATE_MILESTONE' | 'UPDATE_MILESTONE' | 'DELETE_MILESTONE'
  | 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'COMPLETE_TASK'
  | 'CREATE_LAB' | 'UPDATE_LAB' | 'DELETE_LAB'

export type SyncEntityType =
  | 'APPOINTMENT' | 'MEDICATION' | 'NOTE' | 'DOSE_LOG' | 'SYMPTOM'
  | 'TEMPERATURE_LOG' | 'CONTACT' | 'WEIGHT_LOG' | 'MILESTONE' | 'CAREGIVER_TASK' | 'LAB_RESULT'

export interface SyncOp {
  id: string
  workspaceId: string
  type: SyncOpType
  entityType: SyncEntityType
  entityId?: string
  data?: Record<string, unknown>
  timestamp: number
  retries: number
}

export interface SyncMeta {
  id: string
  workspaceId: string
  cursor: number
  lastSyncAt: number
}

class NextStepDB extends Dexie {
  appointments!: Table<LocalAppointment, string>
  medications!: Table<LocalMedication, string>
  notes!: Table<LocalNote, string>
  doseLogs!: Table<LocalDoseLog, string>
  workspaces!: Table<LocalWorkspace, string>
  symptoms!: Table<LocalSymptom, string>
  temperatureLogs!: Table<LocalTemperatureLog, string>
  contacts!: Table<LocalContact, string>
  weightLogs!: Table<LocalWeightLog, string>
  milestones!: Table<LocalMilestone, string>
  caregiverTasks!: Table<LocalCaregiverTask, string>
  labResults!: Table<LocalLabResult, string>
  outbox!: Table<SyncOp, string>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('NextStepDB')

    // Version 1: Original schema
    this.version(1).stores({
      appointments: 'id, workspaceId, datetime, deletedAt',
      medications: 'id, workspaceId, active, deletedAt',
      notes: 'id, workspaceId, type, deletedAt',
      doseLogs: 'id, medicationId, workspaceId, takenAt',
      workspaces: 'id',
      outbox: 'id, workspaceId, timestamp',
      syncMeta: 'id, workspaceId',
    })

    // Version 2: Add symptoms table, extend workspace & medication fields
    this.version(2).stores({
      appointments: 'id, workspaceId, datetime, deletedAt',
      medications: 'id, workspaceId, active, deletedAt',
      notes: 'id, workspaceId, type, deletedAt',
      doseLogs: 'id, medicationId, workspaceId, takenAt',
      workspaces: 'id',
      symptoms: 'id, workspaceId, type, recordedAt, deletedAt',
      outbox: 'id, workspaceId, timestamp',
      syncMeta: 'id, workspaceId',
    })

    // Version 3: Add temperature, contacts, weight, milestones, tasks, lab results
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
  }
}

export const db = new NextStepDB()

// Helper to generate temporary IDs for offline-created items
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Helper to check if an ID is temporary
export function isTempId(id: string): boolean {
  return id.startsWith('temp_')
}
