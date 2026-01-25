import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import {
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  differenceInMinutes,
  getDay,
} from 'date-fns'
import type {
  Medication,
  DoseLog,
  MedicationDueStatus,
  ScheduleData,
  FixedTimesSchedule,
  IntervalSchedule,
  WeekdaysSchedule,
  PRNSchedule,
} from './types'

const TIMEZONE = process.env.TZ || 'Australia/Perth'
const OVERDUE_GRACE_MINUTES = 60

/**
 * Parse a time string (HH:mm) into hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Set a date to a specific time of day in the configured timezone
 */
function setTimeInTimezone(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr)
  const zonedDate = toZonedTime(date, TIMEZONE)
  const dayStart = startOfDay(zonedDate)
  const withTime = setMinutes(setHours(dayStart, hours), minutes)
  return fromZonedTime(withTime, TIMEZONE)
}

/**
 * Get the last dose for a medication (excluding undone doses)
 */
function getLastDose(medicationId: string, doseLogs: DoseLog[]): DoseLog | null {
  const validDoses = doseLogs
    .filter((d) => d.medicationId === medicationId && !d.undoneAt)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())

  return validDoses[0] || null
}

/**
 * Get doses for a medication on a specific day
 */
function getDosesOnDay(
  medicationId: string,
  day: Date,
  doseLogs: DoseLog[]
): DoseLog[] {
  const dayStart = startOfDay(toZonedTime(day, TIMEZONE))
  const dayEnd = addDays(dayStart, 1)

  return doseLogs.filter((d) => {
    if (d.medicationId !== medicationId || d.undoneAt) return false
    const doseZoned = toZonedTime(d.takenAt, TIMEZONE)
    return doseZoned >= dayStart && doseZoned < dayEnd
  })
}

/**
 * Calculate next due time for FIXED_TIMES schedule
 */
function calculateFixedTimesDue(
  med: Medication,
  schedule: FixedTimesSchedule,
  now: Date,
  doseLogs: DoseLog[]
): Date | null {
  const nowZoned = toZonedTime(now, TIMEZONE)
  const todaysDoses = getDosesOnDay(med.id, now, doseLogs)
  const takenTimes = new Set(
    todaysDoses.map((d) => {
      const z = toZonedTime(d.takenAt, TIMEZONE)
      return `${z.getHours().toString().padStart(2, '0')}:${z.getMinutes().toString().padStart(2, '0')}`
    })
  )

  // Sort times chronologically
  const sortedTimes = [...schedule.times].sort()

  // Find the next due time today that hasn't been taken
  for (const time of sortedTimes) {
    const dueTime = setTimeInTimezone(now, time)
    if (!takenTimes.has(time) && isAfter(dueTime, addMinutes(now, -OVERDUE_GRACE_MINUTES))) {
      return dueTime
    }
  }

  // All today's doses taken or missed, return first time tomorrow
  const tomorrow = addDays(now, 1)
  return setTimeInTimezone(tomorrow, sortedTimes[0])
}

/**
 * Calculate next due time for INTERVAL schedule
 */
function calculateIntervalDue(
  med: Medication,
  schedule: IntervalSchedule,
  now: Date,
  doseLogs: DoseLog[]
): Date | null {
  const lastDose = getLastDose(med.id, doseLogs)

  if (lastDose) {
    // Next dose is interval hours after last dose
    return addHours(lastDose.takenAt, schedule.hours)
  }

  // No doses yet - start from the startTime today or tomorrow
  const startToday = setTimeInTimezone(now, schedule.startTime)

  if (isAfter(startToday, now)) {
    return startToday
  }

  // Calculate how many intervals have passed since start time today
  const minutesSinceStart = differenceInMinutes(now, startToday)
  const intervalMinutes = schedule.hours * 60

  if (intervalMinutes <= 0) {
    return startToday
  }

  const intervalsPassed = Math.floor(minutesSinceStart / intervalMinutes)
  const nextDue = addMinutes(startToday, (intervalsPassed + 1) * intervalMinutes)

  return nextDue
}

/**
 * Calculate next due time for WEEKDAYS schedule
 */
function calculateWeekdaysDue(
  med: Medication,
  schedule: WeekdaysSchedule,
  now: Date,
  doseLogs: DoseLog[]
): Date | null {
  const nowZoned = toZonedTime(now, TIMEZONE)
  const todayDayOfWeek = getDay(nowZoned) // 0 = Sunday

  // Check if today is a scheduled day
  if (schedule.days.includes(todayDayOfWeek)) {
    const todaysDoses = getDosesOnDay(med.id, now, doseLogs)
    if (todaysDoses.length === 0) {
      const dueToday = setTimeInTimezone(now, schedule.time)
      if (isAfter(dueToday, addMinutes(now, -OVERDUE_GRACE_MINUTES))) {
        return dueToday
      }
    }
  }

  // Find the next scheduled day
  for (let i = 1; i <= 7; i++) {
    const checkDate = addDays(now, i)
    const checkZoned = toZonedTime(checkDate, TIMEZONE)
    const checkDayOfWeek = getDay(checkZoned)

    if (schedule.days.includes(checkDayOfWeek)) {
      return setTimeInTimezone(checkDate, schedule.time)
    }
  }

  return null
}

/**
 * Calculate PRN availability
 */
function calculatePRNStatus(
  med: Medication,
  schedule: PRNSchedule,
  now: Date,
  doseLogs: DoseLog[]
): { availableAt: Date | null; available: boolean; lastTakenAt: Date | null } {
  const lastDose = getLastDose(med.id, doseLogs)

  if (!lastDose) {
    return { availableAt: null, available: true, lastTakenAt: null }
  }

  const availableAt = addHours(lastDose.takenAt, schedule.minHoursBetween)
  const available = isBefore(availableAt, now)

  return {
    availableAt: available ? null : availableAt,
    available,
    lastTakenAt: lastDose.takenAt,
  }
}

/**
 * Check if medication is within its active date range
 */
function isMedicationActive(med: Medication, now: Date): boolean {
  if (!med.active) return false

  const nowZoned = toZonedTime(now, TIMEZONE)
  const today = startOfDay(nowZoned)

  if (med.startDate && isBefore(today, startOfDay(toZonedTime(med.startDate, TIMEZONE)))) {
    return false
  }

  if (med.endDate && isAfter(today, startOfDay(toZonedTime(med.endDate, TIMEZONE)))) {
    return false
  }

  return true
}

/**
 * Calculate the due status for a single medication
 */
export function calculateMedicationDueStatus(
  med: Medication,
  now: Date,
  doseLogs: DoseLog[]
): MedicationDueStatus {
  const schedule = med.scheduleData as ScheduleData
  const lastDose = getLastDose(med.id, doseLogs)

  // Base status
  const status: MedicationDueStatus = {
    medication: med,
    nextDueAt: null,
    isOverdue: false,
    overdueMinutes: 0,
    isPRN: schedule.type === 'PRN',
    prnAvailableAt: null,
    prnAvailable: false,
    lastTakenAt: lastDose?.takenAt || null,
  }

  // Check if medication is active
  if (!isMedicationActive(med, now)) {
    return status
  }

  // Calculate based on schedule type
  switch (schedule.type) {
    case 'FIXED_TIMES':
      status.nextDueAt = calculateFixedTimesDue(med, schedule, now, doseLogs)
      break

    case 'INTERVAL':
      status.nextDueAt = calculateIntervalDue(med, schedule, now, doseLogs)
      break

    case 'WEEKDAYS':
      status.nextDueAt = calculateWeekdaysDue(med, schedule, now, doseLogs)
      break

    case 'PRN': {
      const prnStatus = calculatePRNStatus(med, schedule, now, doseLogs)
      status.prnAvailableAt = prnStatus.availableAt
      status.prnAvailable = prnStatus.available
      status.lastTakenAt = prnStatus.lastTakenAt
      // PRN meds don't have a "due" time
      return status
    }
  }

  // Calculate overdue status
  if (status.nextDueAt && isBefore(status.nextDueAt, now)) {
    const overdue = differenceInMinutes(now, status.nextDueAt)
    if (overdue > OVERDUE_GRACE_MINUTES) {
      status.isOverdue = true
      status.overdueMinutes = overdue
    }
  }

  return status
}

/**
 * Calculate due status for all medications and sort by priority
 */
export function calculateAllMedicationsDue(
  medications: Medication[],
  now: Date,
  doseLogs: DoseLog[]
): MedicationDueStatus[] {
  const statuses = medications.map((med) =>
    calculateMedicationDueStatus(med, now, doseLogs)
  )

  // Sort by priority:
  // 1. Overdue (most overdue first)
  // 2. Due now or soon (by due time)
  // 3. PRN available
  // 4. PRN in cooldown
  // 5. Future doses
  return statuses.sort((a, b) => {
    // Overdue first, sorted by how overdue
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    if (a.isOverdue && b.isOverdue) {
      return b.overdueMinutes - a.overdueMinutes
    }

    // Non-PRN meds with due times
    if (!a.isPRN && !b.isPRN && a.nextDueAt && b.nextDueAt) {
      return a.nextDueAt.getTime() - b.nextDueAt.getTime()
    }

    // PRN available before PRN in cooldown
    if (a.isPRN && b.isPRN) {
      if (a.prnAvailable && !b.prnAvailable) return -1
      if (!a.prnAvailable && b.prnAvailable) return 1
    }

    // Non-PRN before PRN
    if (!a.isPRN && b.isPRN) return -1
    if (a.isPRN && !b.isPRN) return 1

    return 0
  })
}

/**
 * Get medications that are due within the next X minutes
 */
export function getMedicationsDueSoon(
  medications: Medication[],
  now: Date,
  doseLogs: DoseLog[],
  withinMinutes: number = 60
): MedicationDueStatus[] {
  const allStatuses = calculateAllMedicationsDue(medications, now, doseLogs)
  const cutoff = addMinutes(now, withinMinutes)

  return allStatuses.filter((status) => {
    if (status.isOverdue) return true
    if (status.isPRN && status.prnAvailable) return true
    if (status.nextDueAt && isBefore(status.nextDueAt, cutoff)) return true
    return false
  })
}

/**
 * Format time remaining until a date
 */
export function formatTimeUntil(targetDate: Date, now: Date): string {
  const minutes = differenceInMinutes(targetDate, now)

  if (minutes < 0) {
    const overdue = Math.abs(minutes)
    if (overdue < 60) return `${overdue}m overdue`
    const hours = Math.floor(overdue / 60)
    const mins = overdue % 60
    return mins > 0 ? `${hours}h ${mins}m overdue` : `${hours}h overdue`
  }

  if (minutes < 1) return 'Now'
  if (minutes < 60) return `in ${minutes}m`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`
}
