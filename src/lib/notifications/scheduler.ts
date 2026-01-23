import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from './push'

interface MedicationSchedule {
  medicationId: string
  medicationName: string
  workspaceId: string
  times: string[] // HH:MM format
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(
  now: Date,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = quietStart.split(':').map(Number)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if a medication dose is due at the current time
 */
function isDue(scheduledTime: string, now: Date, toleranceMinutes = 5): boolean {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const schedMinutes = hours * 60 + minutes

  // Due if within tolerance window
  return Math.abs(nowMinutes - schedMinutes) <= toleranceMinutes
}

/**
 * Get all medication schedules that need notifications sent
 * This should be called by a cron job or similar
 */
export async function getMedicationsDue(
  now: Date = new Date()
): Promise<MedicationSchedule[]> {
  const medications = await prisma.medication.findMany({
    where: {
      active: true,
      deletedAt: null,
    },
    include: {
      workspace: {
        select: {
          id: true,
          quietHoursStart: true,
          quietHoursEnd: true,
        },
      },
    },
  })

  const due: MedicationSchedule[] = []

  for (const med of medications) {
    const scheduleData = med.scheduleData as any

    // Skip if in quiet hours
    if (
      isQuietHours(
        now,
        med.workspace.quietHoursStart,
        med.workspace.quietHoursEnd
      )
    ) {
      continue
    }

    let times: string[] = []

    switch (med.scheduleType) {
      case 'FIXED_TIMES':
        times = scheduleData.times || []
        break
      case 'INTERVAL':
        // Generate times based on interval
        const startHour = parseInt(scheduleData.startTime?.split(':')[0] || '8')
        const hours = scheduleData.hours || 4
        for (let h = startHour; h < 24; h += hours) {
          times.push(`${h.toString().padStart(2, '0')}:00`)
        }
        break
      case 'WEEKDAYS':
        // Check if today is a scheduled day
        const todayDow = now.getDay()
        if (scheduleData.days?.includes(todayDow)) {
          times = scheduleData.time ? [scheduleData.time] : []
        }
        break
      case 'PRN':
        // PRN medications don't have scheduled times
        break
    }

    // Check if any times are due now
    const dueNow = times.some((time) => isDue(time, now))
    if (dueNow) {
      due.push({
        medicationId: med.id,
        medicationName: med.name,
        workspaceId: med.workspaceId,
        times,
        quietHoursStart: med.workspace.quietHoursStart,
        quietHoursEnd: med.workspace.quietHoursEnd,
      })
    }
  }

  return due
}

/**
 * Send notifications for all due medications
 */
export async function sendDueNotifications(
  now: Date = new Date()
): Promise<{ sent: number; failed: number }> {
  const due = await getMedicationsDue(now)
  let sent = 0
  let failed = 0

  for (const med of due) {
    // Get all push subscriptions for this workspace
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { workspaceId: med.workspaceId },
    })

    for (const sub of subscriptions) {
      try {
        const success = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          {
            title: 'Medication Reminder',
            body: `Time to take ${med.medicationName}`,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: `med-${med.medicationId}`,
            data: {
              url: '/meds',
              medicationId: med.medicationId,
              action: 'take_dose',
            },
            actions: [
              { action: 'take', title: 'Mark as Taken' },
              { action: 'snooze', title: 'Snooze 15 min' },
            ],
          }
        )

        if (success) {
          sent++
        } else {
          // Subscription expired, remove it
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
          failed++
        }
      } catch (error) {
        console.error('Failed to send notification:', error)
        failed++
      }
    }
  }

  return { sent, failed }
}
