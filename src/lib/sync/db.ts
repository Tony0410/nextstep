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
}

export interface SyncOp {
  id: string
  workspaceId: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TAKE_DOSE' | 'UNDO_DOSE' | 'MARK_ASKED'
  entityType: 'APPOINTMENT' | 'MEDICATION' | 'NOTE' | 'DOSE_LOG'
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
  outbox!: Table<SyncOp, string>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('NextStepDB')

    this.version(1).stores({
      appointments: 'id, workspaceId, datetime, deletedAt',
      medications: 'id, workspaceId, active, deletedAt',
      notes: 'id, workspaceId, type, deletedAt',
      doseLogs: 'id, medicationId, workspaceId, takenAt',
      workspaces: 'id',
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
