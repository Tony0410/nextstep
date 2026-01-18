export type ScheduleType = 'FIXED_TIMES' | 'INTERVAL' | 'WEEKDAYS' | 'PRN'

export interface FixedTimesSchedule {
  type: 'FIXED_TIMES'
  times: string[] // HH:mm format
}

export interface IntervalSchedule {
  type: 'INTERVAL'
  hours: number
  startTime: string // HH:mm format - when to start counting from each day
}

export interface WeekdaysSchedule {
  type: 'WEEKDAYS'
  days: number[] // 0-6 (Sunday-Saturday)
  time: string // HH:mm format
}

export interface PRNSchedule {
  type: 'PRN'
  minHoursBetween: number
}

export type ScheduleData =
  | FixedTimesSchedule
  | IntervalSchedule
  | WeekdaysSchedule
  | PRNSchedule

export interface Medication {
  id: string
  name: string
  instructions: string | null
  scheduleType: ScheduleType
  scheduleData: ScheduleData
  startDate: Date | null
  endDate: Date | null
  active: boolean
}

export interface DoseLog {
  id: string
  medicationId: string
  takenAt: Date
  undoneAt: Date | null
}

export interface MedicationDueStatus {
  medication: Medication
  nextDueAt: Date | null
  isOverdue: boolean
  overdueMinutes: number
  isPRN: boolean
  prnAvailableAt: Date | null // For PRN meds, when it becomes available
  prnAvailable: boolean
  lastTakenAt: Date | null
}
