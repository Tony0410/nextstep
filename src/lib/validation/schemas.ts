import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
})

// Workspace schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  clinicPhone: z.string().max(50).nullable().optional(),
  emergencyPhone: z.string().max(50).nullable().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  largeTextMode: z.boolean().optional(),
  // Emergency info fields
  patientName: z.string().max(100).nullable().optional(),
  patientDOB: z.string().datetime().nullable().optional(),
  bloodType: z.string().max(10).nullable().optional(),
  allergies: z.string().max(1000).nullable().optional(),
  medicalConditions: z.string().max(2000).nullable().optional(),
  primaryPhysician: z.string().max(100).nullable().optional(),
  physicianPhone: z.string().max(50).nullable().optional(),
})

export const emergencyInfoSchema = z.object({
  patientName: z.string().max(100).nullable().optional(),
  patientDOB: z.string().datetime().nullable().optional(),
  bloodType: z.string().max(10).nullable().optional(),
  allergies: z.string().max(1000).nullable().optional(),
  medicalConditions: z.string().max(2000).nullable().optional(),
  primaryPhysician: z.string().max(100).nullable().optional(),
  physicianPhone: z.string().max(50).nullable().optional(),
  clinicPhone: z.string().max(50).nullable().optional(),
  emergencyPhone: z.string().max(50).nullable().optional(),
})

export const inviteSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
  expiresInDays: z.number().min(1).max(30).default(7),
})

// Appointment schemas
export const appointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  datetime: z.string().datetime(),
  location: z.string().max(500).nullable().optional(),
  mapUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// Medication schedule schemas
const fixedTimesScheduleSchema = z.object({
  type: z.literal('FIXED_TIMES'),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1).max(24),
})

const intervalScheduleSchema = z.object({
  type: z.literal('INTERVAL'),
  hours: z.number().min(1).max(72),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
})

const weekdaysScheduleSchema = z.object({
  type: z.literal('WEEKDAYS'),
  days: z.array(z.number().min(0).max(6)).min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
})

const prnScheduleSchema = z.object({
  type: z.literal('PRN'),
  minHoursBetween: z.number().min(0.5).max(72),
})

export const scheduleDataSchema = z.discriminatedUnion('type', [
  fixedTimesScheduleSchema,
  intervalScheduleSchema,
  weekdaysScheduleSchema,
  prnScheduleSchema,
])

export const medicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  instructions: z.string().max(1000).nullable().optional(),
  scheduleType: z.enum(['FIXED_TIMES', 'INTERVAL', 'WEEKDAYS', 'PRN']),
  scheduleData: scheduleDataSchema,
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
})

// Dose log schemas
export const doseLogSchema = z.object({
  medicationId: z.string().cuid(),
  takenAt: z.string().datetime().optional(), // Defaults to now
})

export const undoDoseSchema = z.object({
  doseLogId: z.string().cuid(),
})

// Note schemas
export const noteSchema = z.object({
  type: z.enum(['QUESTION', 'GENERAL']),
  content: z.string().min(1, 'Content is required').max(5000),
})

export const markQuestionAskedSchema = z.object({
  noteId: z.string().cuid(),
})

// Sync schemas
export const syncQuerySchema = z.object({
  workspaceId: z.string().cuid(),
  since: z.coerce.number().optional(),
})

export const syncOpSchema = z.object({
  id: z.string(),
  type: z.enum(['CREATE', 'UPDATE', 'DELETE', 'TAKE_DOSE', 'UNDO_DOSE', 'MARK_ASKED', 'UNMARK_ASKED', 'REFILL', 'LOG_SYMPTOM', 'DELETE_SYMPTOM']),
  entityType: z.enum(['APPOINTMENT', 'MEDICATION', 'NOTE', 'DOSE_LOG', 'SYMPTOM']),
  entityId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.number(),
})

export const syncOpsSchema = z.object({
  workspaceId: z.string().cuid(),
  ops: z.array(syncOpSchema),
})

// Symptom schemas
export const symptomTypeEnum = z.enum(['FATIGUE', 'NAUSEA', 'PAIN', 'APPETITE', 'SLEEP', 'MOOD', 'CUSTOM'])

export const symptomSchema = z.object({
  type: symptomTypeEnum,
  customName: z.string().max(100).nullable().optional(),
  severity: z.number().min(1).max(5),
  notes: z.string().max(2000).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
})

// Medication refill schema
export const refillSchema = z.object({
  pillCount: z.number().min(0).optional(),
  pillsPerDose: z.number().min(1).default(1).optional(),
  refillThreshold: z.number().min(0).default(7).optional(),
  lastRefillDate: z.string().datetime().nullable().optional(),
})

export const medicationWithRefillSchema = medicationSchema.extend({
  pillCount: z.number().min(0).nullable().optional(),
  pillsPerDose: z.number().min(1).nullable().optional(),
  refillThreshold: z.number().min(0).nullable().optional(),
  lastRefillDate: z.string().datetime().nullable().optional(),
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type EmergencyInfoInput = z.infer<typeof emergencyInfoSchema>
export type InviteInput = z.infer<typeof inviteSchema>
export type AppointmentInput = z.infer<typeof appointmentSchema>
export type MedicationInput = z.infer<typeof medicationSchema>
export type MedicationWithRefillInput = z.infer<typeof medicationWithRefillSchema>
export type ScheduleDataInput = z.infer<typeof scheduleDataSchema>
export type DoseLogInput = z.infer<typeof doseLogSchema>
export type NoteInput = z.infer<typeof noteSchema>
export type SymptomInput = z.infer<typeof symptomSchema>
export type SymptomType = z.infer<typeof symptomTypeEnum>
export type SyncOp = z.infer<typeof syncOpSchema>
