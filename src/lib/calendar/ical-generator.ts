import { format, addHours } from 'date-fns'

interface Appointment {
  id: string
  title: string
  datetime: Date | string
  location: string | null
  notes: string | null
}

interface Medication {
  id: string
  name: string
  scheduleType: string
  scheduleData: {
    type: string
    times?: string[]
    hours?: number
    startTime?: string
    time?: string
    days?: number[]
  }
  active: boolean
}

/**
 * Generate an iCalendar format string for appointments
 */
export function generateICalendar(
  appointments: Appointment[],
  workspaceName: string
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NextStep//Health Management//EN',
    `X-WR-CALNAME:${escapeICalText(workspaceName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const appt of appointments) {
    const startDate = new Date(appt.datetime)
    const endDate = addHours(startDate, 1) // Default 1 hour duration

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${appt.id}@nextstep`)
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`)
    lines.push(`DTSTART:${formatICalDate(startDate)}`)
    lines.push(`DTEND:${formatICalDate(endDate)}`)
    lines.push(`SUMMARY:${escapeICalText(appt.title)}`)

    if (appt.location) {
      lines.push(`LOCATION:${escapeICalText(appt.location)}`)
    }

    if (appt.notes) {
      lines.push(`DESCRIPTION:${escapeICalText(appt.notes)}`)
    }

    // Add reminder 1 day before
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-P1D')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:Reminder: ${escapeICalText(appt.title)}`)
    lines.push('END:VALARM')

    // Add reminder 2 hours before
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-PT2H')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:${escapeICalText(appt.title)} in 2 hours`)
    lines.push('END:VALARM')

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Generate medication schedule events for the current day
 * This is useful for daily reminders but not recommended for calendar sync
 */
export function generateMedicationEvents(
  medications: Medication[],
  workspaceName: string,
  targetDate: Date = new Date()
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NextStep//Medications//EN',
    `X-WR-CALNAME:${escapeICalText(workspaceName)} - Medications`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  const dateStr = format(targetDate, 'yyyy-MM-dd')

  for (const med of medications) {
    if (!med.active) continue

    const times = getMedicationTimes(med)

    for (const time of times) {
      if (time === 'As needed') continue

      const [hours, minutes] = time.split(':').map(Number)
      const startDate = new Date(targetDate)
      startDate.setHours(hours, minutes, 0, 0)
      const endDate = new Date(startDate)
      endDate.setMinutes(endDate.getMinutes() + 15)

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:med-${med.id}-${dateStr}-${time}@nextstep`)
      lines.push(`DTSTAMP:${formatICalDate(new Date())}`)
      lines.push(`DTSTART:${formatICalDate(startDate)}`)
      lines.push(`DTEND:${formatICalDate(endDate)}`)
      lines.push(`SUMMARY:Take ${escapeICalText(med.name)}`)
      lines.push('CATEGORIES:MEDICATION')

      lines.push('BEGIN:VALARM')
      lines.push('TRIGGER:PT0M')
      lines.push('ACTION:DISPLAY')
      lines.push(`DESCRIPTION:Time to take ${escapeICalText(med.name)}`)
      lines.push('END:VALARM')

      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

function getMedicationTimes(med: Medication): string[] {
  const { scheduleType, scheduleData } = med

  switch (scheduleType) {
    case 'FIXED_TIMES':
      return scheduleData.times || []
    case 'INTERVAL':
      const times: string[] = []
      const startHour = parseInt(scheduleData.startTime?.split(':')[0] || '8')
      const hours = scheduleData.hours || 4
      for (let h = startHour; h < 24; h += hours) {
        const hourStr = h.toString().padStart(2, '0')
        times.push(`${hourStr}:00`)
      }
      return times
    case 'WEEKDAYS':
      return scheduleData.time ? [scheduleData.time] : []
    case 'PRN':
      return ['As needed']
    default:
      return []
  }
}

function formatICalDate(date: Date): string {
  // Format: YYYYMMDDTHHMMSSZ
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
