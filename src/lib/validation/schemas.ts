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
  type: z.enum([
    'CREATE', 'UPDATE', 'DELETE', 'TAKE_DOSE', 'UNDO_DOSE', 'MARK_ASKED', 'UNMARK_ASKED', 'REFILL',
    'LOG_SYMPTOM', 'DELETE_SYMPTOM',
    'LOG_TEMP', 'DELETE_TEMP',
    'CREATE_CONTACT', 'UPDATE_CONTACT', 'DELETE_CONTACT',
    'LOG_WEIGHT', 'DELETE_WEIGHT',
    'CREATE_MILESTONE', 'UPDATE_MILESTONE', 'DELETE_MILESTONE',
    'CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK', 'COMPLETE_TASK',
    'CREATE_LAB', 'UPDATE_LAB', 'DELETE_LAB',
  ]),
  entityType: z.enum([
    'APPOINTMENT', 'MEDICATION', 'NOTE', 'DOSE_LOG', 'SYMPTOM',
    'TEMPERATURE_LOG', 'CONTACT', 'WEIGHT_LOG', 'MILESTONE', 'CAREGIVER_TASK', 'LAB_RESULT',
  ]),
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

// ============================================
// TEMPERATURE LOG
// ============================================

export const temperatureLogSchema = z.object({
  tempCelsius: z.number().min(30).max(45),
  method: z.enum(['oral', 'forehead', 'ear', 'armpit']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
})

// ============================================
// CONTACT DIRECTORY
// ============================================

export const contactCategoryEnum = z.enum(['ONCOLOGY', 'HOSPITAL', 'PHARMACY', 'INSURANCE', 'FAMILY', 'OTHER'])

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().min(1, 'Role is required').max(100),
  category: contactCategoryEnum,
  phone: z.string().min(1, 'Phone is required').max(50),
  phone2: z.string().max(50).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  hours: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  isEmergency: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

// ============================================
// WEIGHT LOG
// ============================================

export const weightLogSchema = z.object({
  weightKg: z.number().min(1).max(500),
  notes: z.string().max(500).nullable().optional(),
  recordedAt: z.string().datetime().optional(),
})

// ============================================
// TREATMENT MILESTONE
// ============================================

export const milestoneTypeEnum = z.enum(['CHEMO_CYCLE', 'SURGERY', 'RADIATION', 'SCAN', 'CONSULTATION', 'OTHER'])
export const milestoneStatusEnum = z.enum(['SCHEDULED', 'COMPLETED', 'DELAYED', 'CANCELLED'])

export const milestoneSchema = z.object({
  type: milestoneTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  plannedDate: z.string().datetime(),
  actualDate: z.string().datetime().nullable().optional(),
  status: milestoneStatusEnum.default('SCHEDULED'),
  notes: z.string().max(2000).nullable().optional(),
})

// ============================================
// CAREGIVER TASK
// ============================================

export const taskCategoryEnum = z.enum(['MEDICAL', 'ERRANDS', 'MEALS', 'EMOTIONAL', 'OTHER'])
export const taskPriorityEnum = z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW'])
export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])

export const caregiverTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  category: taskCategoryEnum,
  priority: taskPriorityEnum.default('NORMAL'),
  status: taskStatusEnum.default('TODO'),
  assignedToId: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

// ============================================
// LAB RESULT
// ============================================

export const labFlagEnum = z.enum(['LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH'])

export const labMarkerSchema = z.object({
  marker: z.string().min(1).max(50),
  value: z.number(),
  unit: z.string().max(20),
  refMin: z.number().nullable().optional(),
  refMax: z.number().nullable().optional(),
  flag: labFlagEnum.nullable().optional(),
})

export const labResultSchema = z.object({
  testDate: z.string().datetime(),
  panelName: z.string().min(1).max(200),
  labName: z.string().max(200).nullable().optional(),
  results: z.array(labMarkerSchema).min(1),
  notes: z.string().max(2000).nullable().optional(),
})

// ============================================
// MEDICAL DOCUMENT (metadata only — file sent as multipart)
// ============================================

export const documentCategoryEnum = z.enum(['LAB_REPORT', 'SCAN', 'INSURANCE', 'ID_CARD', 'PRESCRIPTION', 'OTHER'])

export const medicalDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: documentCategoryEnum,
  dateTaken: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

// ============================================
// DRUG INTERACTION CHECK
// ============================================

export const interactionCheckSchema = z.object({
  medicationIds: z.array(z.string().cuid()).min(2).max(20),
})

export const interactionSeverityEnum = z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED'])

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
export type TemperatureLogInput = z.infer<typeof temperatureLogSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type ContactCategory = z.infer<typeof contactCategoryEnum>
export type WeightLogInput = z.infer<typeof weightLogSchema>
export type MilestoneInput = z.infer<typeof milestoneSchema>
export type MilestoneType = z.infer<typeof milestoneTypeEnum>
export type MilestoneStatus = z.infer<typeof milestoneStatusEnum>
export type CaregiverTaskInput = z.infer<typeof caregiverTaskSchema>
export type TaskCategory = z.infer<typeof taskCategoryEnum>
export type TaskPriority = z.infer<typeof taskPriorityEnum>
export type TaskStatus = z.infer<typeof taskStatusEnum>
export type LabMarker = z.infer<typeof labMarkerSchema>
export type LabFlag = z.infer<typeof labFlagEnum>
export type LabResultInput = z.infer<typeof labResultSchema>
export type MedicalDocumentInput = z.infer<typeof medicalDocumentSchema>
export type DocumentCategory = z.infer<typeof documentCategoryEnum>
export type InteractionCheckInput = z.infer<typeof interactionCheckSchema>
export type InteractionSeverity = z.infer<typeof interactionSeverityEnum>
