import { db, generateTempId, type SyncOp } from './db'
import type {
  LocalAppointment, LocalMedication, LocalNote, LocalDoseLog, LocalSymptom,
  LocalTemperatureLog, LocalContact, LocalWeightLog, LocalMilestone, LocalCaregiverTask, LocalLabResult,
} from './db'

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
    await db.transaction('rw', [db.appointments, db.medications, db.notes, db.doseLogs, db.symptoms, db.temperatureLogs, db.contacts, db.weightLogs, db.milestones, db.caregiverTasks, db.labResults, db.workspaces, db.syncMeta], async () => {
      // Update workspace (including emergency info fields)
      if (data.workspace) {
        await db.workspaces.put({
          ...data.workspace,
          updatedAt: data.workspace.updatedAt || new Date().toISOString(),
          // Ensure emergency fields are properly set (even if null)
          patientName: data.workspace.patientName || null,
          patientDOB: data.workspace.patientDOB || null,
          bloodType: data.workspace.bloodType || null,
          allergies: data.workspace.allergies || null,
          medicalConditions: data.workspace.medicalConditions || null,
          primaryPhysician: data.workspace.primaryPhysician || null,
          physicianPhone: data.workspace.physicianPhone || null,
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

      // Update symptoms
      for (const symptom of data.symptoms || []) {
        const existing = await db.symptoms.get(symptom.id)
        if (!existing || new Date(symptom.syncedAt) > new Date(existing.syncedAt)) {
          await db.symptoms.put({
            ...symptom,
            recordedAt: symptom.recordedAt,
            syncedAt: symptom.syncedAt,
          })
        }
      }

      // Update temperature logs
      for (const temp of data.temperatureLogs || []) {
        const existing = await db.temperatureLogs.get(temp.id)
        if (!existing || new Date(temp.syncedAt) > new Date(existing.syncedAt)) {
          await db.temperatureLogs.put({ ...temp, syncedAt: temp.syncedAt })
        }
      }

      // Update contacts
      for (const contact of data.contacts || []) {
        const existing = await db.contacts.get(contact.id)
        if (!existing || new Date(contact.syncedAt) > new Date(existing.syncedAt)) {
          await db.contacts.put({ ...contact, syncedAt: contact.syncedAt })
        }
      }

      // Update weight logs
      for (const weight of data.weightLogs || []) {
        const existing = await db.weightLogs.get(weight.id)
        if (!existing || new Date(weight.syncedAt) > new Date(existing.syncedAt)) {
          await db.weightLogs.put({ ...weight, syncedAt: weight.syncedAt })
        }
      }

      // Update milestones
      for (const milestone of data.milestones || []) {
        const existing = await db.milestones.get(milestone.id)
        if (!existing || new Date(milestone.syncedAt) > new Date(existing.syncedAt)) {
          await db.milestones.put({ ...milestone, syncedAt: milestone.syncedAt })
        }
      }

      // Update caregiver tasks
      for (const task of data.caregiverTasks || []) {
        const existing = await db.caregiverTasks.get(task.id)
        if (!existing || new Date(task.syncedAt) > new Date(existing.syncedAt)) {
          await db.caregiverTasks.put({ ...task, syncedAt: task.syncedAt })
        }
      }

      // Update lab results
      for (const lab of data.labResults || []) {
        const existing = await db.labResults.get(lab.id)
        if (!existing || new Date(lab.syncedAt) > new Date(existing.syncedAt)) {
          await db.labResults.put({ ...lab, syncedAt: lab.syncedAt })
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
        ops: ops.map((op: SyncOp) => ({
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
    await db.transaction('rw', [db.outbox, db.appointments, db.notes, db.symptoms, db.temperatureLogs, db.contacts, db.weightLogs, db.milestones, db.caregiverTasks, db.labResults], async () => {
      for (const result of data.results) {
        if (result.success) {
          // Find the op
          const op = ops.find((o: SyncOp) => o.id === result.opId)
          if (op && op.entityId?.startsWith('temp_') && result.entityId) {
            // Update local entity with real ID
            const entityTableMap: Record<string, { get: (id: string) => Promise<any>, delete: (id: string) => Promise<void>, put: (item: any) => Promise<any> }> = {
              APPOINTMENT: db.appointments as any,
              NOTE: db.notes as any,
              SYMPTOM: db.symptoms as any,
              TEMPERATURE_LOG: db.temperatureLogs as any,
              CONTACT: db.contacts as any,
              WEIGHT_LOG: db.weightLogs as any,
              MILESTONE: db.milestones as any,
              CAREGIVER_TASK: db.caregiverTasks as any,
              LAB_RESULT: db.labResults as any,
            }
            const table = entityTableMap[op.entityType]
            if (table) {
              const local = await table.get(op.entityId)
              if (local) {
                await table.delete(op.entityId)
                await table.put({ ...(local as Record<string, unknown>), id: result.entityId })
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
  const now = new Date().toISOString()
  const note: LocalNote = {
    id,
    workspaceId,
    type: data.type,
    content: data.content,
    askedAt: null,
    deletedAt: null,
    version: 1,
    syncedAt: now,
    createdAt: now,
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

  // Decrement pill count if tracking is enabled
  const localMed = await db.medications.get(medicationId)
  if (localMed && localMed.pillCount !== null && localMed.pillsPerDose !== null) {
    const newCount = Math.max(0, localMed.pillCount - (localMed.pillsPerDose || 1))
    await db.medications.update(medicationId, { pillCount: newCount })
  }

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

  // Restore pill count if tracking is enabled
  const localMed = await db.medications.get(doseLog.medicationId)
  if (localMed && localMed.pillCount !== null && localMed.pillsPerDose !== null) {
    const newCount = localMed.pillCount + (localMed.pillsPerDose || 1)
    await db.medications.update(doseLog.medicationId, { pillCount: newCount })
  }

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

export async function unmarkQuestionAsked(note: LocalNote): Promise<void> {
  await db.notes.update(note.id, { askedAt: null })

  await addToOutbox({
    workspaceId: note.workspaceId,
    type: 'UNMARK_ASKED',
    entityType: 'NOTE',
    entityId: note.id,
    timestamp: Date.now(),
  })
}

export async function logSymptom(
  workspaceId: string,
  data: {
    type: LocalSymptom['type']
    customName?: string
    severity: number
    notes?: string
  }
): Promise<LocalSymptom> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const symptom: LocalSymptom = {
    id,
    workspaceId,
    type: data.type,
    customName: data.customName || null,
    severity: data.severity,
    notes: data.notes || null,
    recordedAt: now,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.symptoms.add(symptom)
  await addToOutbox({
    workspaceId,
    type: 'LOG_SYMPTOM',
    entityType: 'SYMPTOM',
    entityId: id,
    data: {
      type: data.type,
      customName: data.customName,
      severity: data.severity,
      notes: data.notes,
      recordedAt: now,
    },
    timestamp: Date.now(),
  })

  return symptom
}

export async function deleteSymptom(symptom: LocalSymptom): Promise<void> {
  const now = new Date().toISOString()
  await db.symptoms.update(symptom.id, {
    deletedAt: now,
    version: symptom.version + 1,
    syncedAt: now,
  })

  await addToOutbox({
    workspaceId: symptom.workspaceId,
    type: 'DELETE_SYMPTOM',
    entityType: 'SYMPTOM',
    entityId: symptom.id,
    timestamp: Date.now(),
  })
}

// ============================================
// TEMPERATURE LOG
// ============================================

export async function logTemperature(
  workspaceId: string,
  data: { tempCelsius: number; method?: string; notes?: string; recordedAt?: string }
): Promise<LocalTemperatureLog> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const temp: LocalTemperatureLog = {
    id,
    workspaceId,
    recordedAt: data.recordedAt || now,
    tempCelsius: data.tempCelsius,
    method: data.method || null,
    notes: data.notes || null,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.temperatureLogs.add(temp)
  await addToOutbox({
    workspaceId,
    type: 'LOG_TEMP',
    entityType: 'TEMPERATURE_LOG',
    entityId: id,
    data: { tempCelsius: data.tempCelsius, method: data.method, notes: data.notes, recordedAt: temp.recordedAt },
    timestamp: Date.now(),
  })

  return temp
}

export async function deleteTemperatureLog(temp: LocalTemperatureLog): Promise<void> {
  const now = new Date().toISOString()
  await db.temperatureLogs.update(temp.id, { deletedAt: now, version: temp.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: temp.workspaceId,
    type: 'DELETE_TEMP',
    entityType: 'TEMPERATURE_LOG',
    entityId: temp.id,
    timestamp: Date.now(),
  })
}

// ============================================
// CONTACT
// ============================================

export async function createLocalContact(
  workspaceId: string,
  data: Omit<LocalContact, 'id' | 'workspaceId' | 'version' | 'syncedAt' | 'deletedAt'>
): Promise<LocalContact> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const contact: LocalContact = {
    ...data,
    id,
    workspaceId,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.contacts.add(contact)
  await addToOutbox({
    workspaceId,
    type: 'CREATE_CONTACT',
    entityType: 'CONTACT',
    entityId: id,
    data: {
      name: data.name, role: data.role, category: data.category,
      phone: data.phone, phone2: data.phone2, email: data.email,
      address: data.address, hours: data.hours, notes: data.notes,
      isEmergency: data.isEmergency, sortOrder: data.sortOrder,
    },
    timestamp: Date.now(),
  })

  return contact
}

export async function updateLocalContact(
  contact: LocalContact,
  updates: Partial<Pick<LocalContact, 'name' | 'role' | 'category' | 'phone' | 'phone2' | 'email' | 'address' | 'hours' | 'notes' | 'isEmergency' | 'sortOrder'>>
): Promise<void> {
  await db.contacts.update(contact.id, { ...updates, version: contact.version + 1, syncedAt: new Date().toISOString() })
  await addToOutbox({
    workspaceId: contact.workspaceId,
    type: 'UPDATE_CONTACT',
    entityType: 'CONTACT',
    entityId: contact.id,
    data: updates,
    timestamp: Date.now(),
  })
}

export async function deleteLocalContact(contact: LocalContact): Promise<void> {
  const now = new Date().toISOString()
  await db.contacts.update(contact.id, { deletedAt: now, version: contact.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: contact.workspaceId,
    type: 'DELETE_CONTACT',
    entityType: 'CONTACT',
    entityId: contact.id,
    timestamp: Date.now(),
  })
}

// ============================================
// WEIGHT LOG
// ============================================

export async function logWeight(
  workspaceId: string,
  data: { weightKg: number; notes?: string; recordedAt?: string }
): Promise<LocalWeightLog> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const weight: LocalWeightLog = {
    id,
    workspaceId,
    recordedAt: data.recordedAt || now,
    weightKg: data.weightKg,
    notes: data.notes || null,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.weightLogs.add(weight)
  await addToOutbox({
    workspaceId,
    type: 'LOG_WEIGHT',
    entityType: 'WEIGHT_LOG',
    entityId: id,
    data: { weightKg: data.weightKg, notes: data.notes, recordedAt: weight.recordedAt },
    timestamp: Date.now(),
  })

  return weight
}

export async function deleteWeightLog(weight: LocalWeightLog): Promise<void> {
  const now = new Date().toISOString()
  await db.weightLogs.update(weight.id, { deletedAt: now, version: weight.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: weight.workspaceId,
    type: 'DELETE_WEIGHT',
    entityType: 'WEIGHT_LOG',
    entityId: weight.id,
    timestamp: Date.now(),
  })
}

// ============================================
// MILESTONE
// ============================================

export async function createLocalMilestone(
  workspaceId: string,
  data: Omit<LocalMilestone, 'id' | 'workspaceId' | 'version' | 'syncedAt' | 'deletedAt'>
): Promise<LocalMilestone> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const milestone: LocalMilestone = {
    ...data,
    id,
    workspaceId,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.milestones.add(milestone)
  await addToOutbox({
    workspaceId,
    type: 'CREATE_MILESTONE',
    entityType: 'MILESTONE',
    entityId: id,
    data: {
      type: data.type, title: data.title, description: data.description,
      plannedDate: data.plannedDate, actualDate: data.actualDate,
      status: data.status, notes: data.notes,
    },
    timestamp: Date.now(),
  })

  return milestone
}

export async function updateLocalMilestone(
  milestone: LocalMilestone,
  updates: Partial<Pick<LocalMilestone, 'type' | 'title' | 'description' | 'plannedDate' | 'actualDate' | 'status' | 'notes'>>
): Promise<void> {
  await db.milestones.update(milestone.id, { ...updates, version: milestone.version + 1, syncedAt: new Date().toISOString() })
  await addToOutbox({
    workspaceId: milestone.workspaceId,
    type: 'UPDATE_MILESTONE',
    entityType: 'MILESTONE',
    entityId: milestone.id,
    data: updates,
    timestamp: Date.now(),
  })
}

export async function deleteLocalMilestone(milestone: LocalMilestone): Promise<void> {
  const now = new Date().toISOString()
  await db.milestones.update(milestone.id, { deletedAt: now, version: milestone.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: milestone.workspaceId,
    type: 'DELETE_MILESTONE',
    entityType: 'MILESTONE',
    entityId: milestone.id,
    timestamp: Date.now(),
  })
}

// ============================================
// CAREGIVER TASK
// ============================================

export async function createLocalTask(
  workspaceId: string,
  data: Omit<LocalCaregiverTask, 'id' | 'workspaceId' | 'version' | 'syncedAt' | 'deletedAt' | 'completedAt'>
): Promise<LocalCaregiverTask> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const task: LocalCaregiverTask = {
    ...data,
    id,
    workspaceId,
    completedAt: null,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.caregiverTasks.add(task)
  await addToOutbox({
    workspaceId,
    type: 'CREATE_TASK',
    entityType: 'CAREGIVER_TASK',
    entityId: id,
    data: {
      title: data.title, description: data.description, category: data.category,
      priority: data.priority, status: data.status, assignedToId: data.assignedToId,
      dueDate: data.dueDate,
    },
    timestamp: Date.now(),
  })

  return task
}

export async function updateLocalTask(
  task: LocalCaregiverTask,
  updates: Partial<Pick<LocalCaregiverTask, 'title' | 'description' | 'category' | 'priority' | 'status' | 'assignedToId' | 'dueDate'>>
): Promise<void> {
  await db.caregiverTasks.update(task.id, { ...updates, version: task.version + 1, syncedAt: new Date().toISOString() })
  await addToOutbox({
    workspaceId: task.workspaceId,
    type: 'UPDATE_TASK',
    entityType: 'CAREGIVER_TASK',
    entityId: task.id,
    data: updates,
    timestamp: Date.now(),
  })
}

export async function completeLocalTask(task: LocalCaregiverTask): Promise<void> {
  const now = new Date().toISOString()
  await db.caregiverTasks.update(task.id, { status: 'DONE', completedAt: now, version: task.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: task.workspaceId,
    type: 'COMPLETE_TASK',
    entityType: 'CAREGIVER_TASK',
    entityId: task.id,
    timestamp: Date.now(),
  })
}

export async function deleteLocalTask(task: LocalCaregiverTask): Promise<void> {
  const now = new Date().toISOString()
  await db.caregiverTasks.update(task.id, { deletedAt: now, version: task.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: task.workspaceId,
    type: 'DELETE_TASK',
    entityType: 'CAREGIVER_TASK',
    entityId: task.id,
    timestamp: Date.now(),
  })
}

// ============================================
// LAB RESULT
// ============================================

export async function createLocalLabResult(
  workspaceId: string,
  data: Omit<LocalLabResult, 'id' | 'workspaceId' | 'version' | 'syncedAt' | 'deletedAt'>
): Promise<LocalLabResult> {
  const id = generateTempId()
  const now = new Date().toISOString()
  const lab: LocalLabResult = {
    ...data,
    id,
    workspaceId,
    deletedAt: null,
    version: 1,
    syncedAt: now,
  }

  await db.labResults.add(lab)
  await addToOutbox({
    workspaceId,
    type: 'CREATE_LAB',
    entityType: 'LAB_RESULT',
    entityId: id,
    data: {
      testDate: data.testDate, panelName: data.panelName,
      labName: data.labName, results: data.results, notes: data.notes,
    },
    timestamp: Date.now(),
  })

  return lab
}

export async function deleteLocalLabResult(lab: LocalLabResult): Promise<void> {
  const now = new Date().toISOString()
  await db.labResults.update(lab.id, { deletedAt: now, version: lab.version + 1, syncedAt: now })
  await addToOutbox({
    workspaceId: lab.workspaceId,
    type: 'DELETE_LAB',
    entityType: 'LAB_RESULT',
    entityId: lab.id,
    timestamp: Date.now(),
  })
}
