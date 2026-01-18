import { db, generateTempId, type SyncOp } from './db'
import type { LocalAppointment, LocalMedication, LocalNote, LocalDoseLog } from './db'

const SYNC_INTERVAL = 30000 // 30 seconds
const MAX_RETRIES = 3

interface SyncState {
  isSyncing: boolean
  lastSyncAt: number | null
  error: string | null
  hasConflict: boolean
}

let syncState: SyncState = {
  isSyncing: false,
  lastSyncAt: null,
  error: null,
  hasConflict: false,
}

let syncInterval: ReturnType<typeof setInterval> | null = null
let listeners: ((state: SyncState) => void)[] = []

export function getSyncState(): SyncState {
  return { ...syncState }
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function notifyListeners() {
  listeners.forEach((l) => l({ ...syncState }))
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    // Redirect to login
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  return response
}

export async function pullChanges(workspaceId: string): Promise<boolean> {
  try {
    // Get current cursor
    const meta = await db.syncMeta.get(workspaceId)
    const cursor = meta?.cursor || 0

    const response = await fetchWithAuth(`/api/sync?workspaceId=${workspaceId}&since=${cursor}`)

    if (!response.ok) {
      throw new Error('Sync fetch failed')
    }

    const data = await response.json()

    // Update local database
    await db.transaction('rw', [db.appointments, db.medications, db.notes, db.doseLogs, db.workspaces, db.syncMeta], async () => {
      // Update workspace
      if (data.workspace) {
        await db.workspaces.put({
          ...data.workspace,
          updatedAt: data.workspace.updatedAt || new Date().toISOString(),
        })
      }

      // Update appointments
      for (const appt of data.appointments || []) {
        const existing = await db.appointments.get(appt.id)
        // Last-write-wins: server is authoritative
        if (!existing || new Date(appt.syncedAt) > new Date(existing.syncedAt)) {
          await db.appointments.put({
            ...appt,
            datetime: appt.datetime,
            syncedAt: appt.syncedAt,
          })
        }
      }

      // Update medications
      for (const med of data.medications || []) {
        const existing = await db.medications.get(med.id)
        if (!existing || new Date(med.syncedAt) > new Date(existing.syncedAt)) {
          await db.medications.put({
            ...med,
            syncedAt: med.syncedAt,
          })
        }
      }

      // Update notes
      for (const note of data.notes || []) {
        const existing = await db.notes.get(note.id)
        if (!existing || new Date(note.syncedAt) > new Date(existing.syncedAt)) {
          await db.notes.put({
            ...note,
            syncedAt: note.syncedAt,
          })
        }
      }

      // Append dose logs (append-only, never overwrite)
      for (const dose of data.doseLogs || []) {
        const existing = await db.doseLogs.get(dose.id)
        if (!existing) {
          await db.doseLogs.add({
            ...dose,
            takenAt: dose.takenAt,
            syncedAt: dose.syncedAt,
          })
        } else if (dose.undoneAt && !existing.undoneAt) {
          // Update undo status
          await db.doseLogs.update(dose.id, {
            undoneAt: dose.undoneAt,
            undoneBy: dose.undoneBy,
          })
        }
      }

      // Update sync cursor
      await db.syncMeta.put({
        id: workspaceId,
        workspaceId,
        cursor: data.cursor,
        lastSyncAt: Date.now(),
      })
    })

    syncState.hasConflict = data.hasConflicts
    return true
  } catch (error) {
    console.error('Pull changes error:', error)
    return false
  }
}

export async function pushChanges(workspaceId: string): Promise<boolean> {
  try {
    const ops = await db.outbox.where('workspaceId').equals(workspaceId).toArray()

    if (ops.length === 0) {
      return true
    }

    const response = await fetchWithAuth('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        ops: ops.map((op) => ({
          id: op.id,
          type: op.type,
          entityType: op.entityType,
          entityId: op.entityId,
          data: op.data,
          timestamp: op.timestamp,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error('Sync push failed')
    }

    const data = await response.json()

    // Process results and remove successful ops from outbox
    await db.transaction('rw', [db.outbox, db.appointments, db.notes], async () => {
      for (const result of data.results) {
        if (result.success) {
          // Find the op
          const op = ops.find((o) => o.id === result.opId)
          if (op && op.entityId?.startsWith('temp_') && result.entityId) {
            // Update local entity with real ID
            if (op.entityType === 'APPOINTMENT') {
              const local = await db.appointments.get(op.entityId)
              if (local) {
                await db.appointments.delete(op.entityId)
                await db.appointments.put({ ...local, id: result.entityId })
              }
            } else if (op.entityType === 'NOTE') {
              const local = await db.notes.get(op.entityId)
              if (local) {
                await db.notes.delete(op.entityId)
                await db.notes.put({ ...local, id: result.entityId })
              }
            }
          }

          // Remove from outbox
          await db.outbox.delete(result.opId)
        } else {
          // Increment retry count or remove if max retries
          const op = await db.outbox.get(result.opId)
          if (op) {
            if (op.retries >= MAX_RETRIES) {
              await db.outbox.delete(result.opId)
            } else {
              await db.outbox.update(result.opId, { retries: op.retries + 1 })
            }
          }
        }
      }
    })

    return true
  } catch (error) {
    console.error('Push changes error:', error)
    return false
  }
}

export async function sync(workspaceId: string): Promise<void> {
  if (syncState.isSyncing) {
    return
  }

  syncState.isSyncing = true
  syncState.error = null
  notifyListeners()

  try {
    // Push first, then pull
    const pushSuccess = await pushChanges(workspaceId)
    const pullSuccess = await pullChanges(workspaceId)

    if (pushSuccess && pullSuccess) {
      syncState.lastSyncAt = Date.now()
      syncState.error = null
    } else {
      syncState.error = 'Sync partially failed'
    }
  } catch (error) {
    syncState.error = error instanceof Error ? error.message : 'Sync failed'
  } finally {
    syncState.isSyncing = false
    notifyListeners()
  }
}

export function startAutoSync(workspaceId: string) {
  if (syncInterval) {
    clearInterval(syncInterval)
  }

  // Initial sync
  sync(workspaceId)

  // Set up interval
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      sync(workspaceId)
    }
  }, SYNC_INTERVAL)

  // Sync when coming back online
  window.addEventListener('online', () => sync(workspaceId))
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Helper functions for adding to outbox

export async function addToOutbox(op: Omit<SyncOp, 'id' | 'retries'>): Promise<void> {
  await db.outbox.add({
    ...op,
    id: generateTempId(),
    retries: 0,
  })
}

// Convenience functions for local operations + outbox

export async function createLocalAppointment(
  workspaceId: string,
  data: Omit<LocalAppointment, 'id' | 'workspaceId' | 'version' | 'syncedAt' | 'deletedAt'>
): Promise<LocalAppointment> {
  const id = generateTempId()
  const appointment: LocalAppointment = {
    ...data,
    id,
    workspaceId,
    version: 1,
    syncedAt: new Date().toISOString(),
    deletedAt: null,
  }

  await db.appointments.add(appointment)
  await addToOutbox({
    workspaceId,
    type: 'CREATE',
    entityType: 'APPOINTMENT',
    entityId: id,
    data: {
      title: data.title,
      datetime: data.datetime,
      location: data.location,
      mapUrl: data.mapUrl,
      notes: data.notes,
    },
    timestamp: Date.now(),
  })

  return appointment
}

export async function updateLocalAppointment(
  appointment: LocalAppointment,
  updates: Partial<Pick<LocalAppointment, 'title' | 'datetime' | 'location' | 'mapUrl' | 'notes'>>
): Promise<void> {
  await db.appointments.update(appointment.id, {
    ...updates,
    version: appointment.version + 1,
    syncedAt: new Date().toISOString(),
  })

  await addToOutbox({
    workspaceId: appointment.workspaceId,
    type: 'UPDATE',
    entityType: 'APPOINTMENT',
    entityId: appointment.id,
    data: updates,
    timestamp: Date.now(),
  })
}

export async function deleteLocalAppointment(appointment: LocalAppointment): Promise<void> {
  await db.appointments.update(appointment.id, {
    deletedAt: new Date().toISOString(),
    version: appointment.version + 1,
    syncedAt: new Date().toISOString(),
  })

  await addToOutbox({
    workspaceId: appointment.workspaceId,
    type: 'DELETE',
    entityType: 'APPOINTMENT',
    entityId: appointment.id,
    timestamp: Date.now(),
  })
}

export async function createLocalNote(
  workspaceId: string,
  data: { type: 'QUESTION' | 'GENERAL'; content: string }
): Promise<LocalNote> {
  const id = generateTempId()
  const note: LocalNote = {
    id,
    workspaceId,
    type: data.type,
    content: data.content,
    askedAt: null,
    deletedAt: null,
    version: 1,
    syncedAt: new Date().toISOString(),
  }

  await db.notes.add(note)
  await addToOutbox({
    workspaceId,
    type: 'CREATE',
    entityType: 'NOTE',
    entityId: id,
    data,
    timestamp: Date.now(),
  })

  return note
}

export async function logDose(
  workspaceId: string,
  medicationId: string,
  medication: { id: string; name: string }
): Promise<LocalDoseLog> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const doseLog: LocalDoseLog = {
    id,
    medicationId,
    workspaceId,
    takenAt: now,
    undoneAt: null,
    syncedAt: now,
    medication,
  }

  await db.doseLogs.add(doseLog)
  await addToOutbox({
    workspaceId,
    type: 'TAKE_DOSE',
    entityType: 'DOSE_LOG',
    entityId: id,
    data: { medicationId, takenAt: now },
    timestamp: Date.now(),
  })

  return doseLog
}

export async function undoDose(doseLog: LocalDoseLog): Promise<void> {
  const now = new Date().toISOString()
  await db.doseLogs.update(doseLog.id, { undoneAt: now })

  await addToOutbox({
    workspaceId: doseLog.workspaceId,
    type: 'UNDO_DOSE',
    entityType: 'DOSE_LOG',
    entityId: doseLog.id,
    timestamp: Date.now(),
  })
}

export async function markQuestionAsked(note: LocalNote): Promise<void> {
  const now = new Date().toISOString()
  await db.notes.update(note.id, { askedAt: now })

  await addToOutbox({
    workspaceId: note.workspaceId,
    type: 'MARK_ASKED',
    entityType: 'NOTE',
    entityId: note.id,
    timestamp: Date.now(),
  })
}
