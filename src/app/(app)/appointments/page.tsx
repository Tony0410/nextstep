'use client'

import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Plus, Calendar, MapPin, Clock, ChevronRight, CalendarDays } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, EmptyState, Button } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../provider'

const TIMEZONE = 'Australia/Perth'

export default function AppointmentsPage() {
  const router = useRouter()
  const { currentWorkspace } = useApp()

  const appointments = useLiveQuery(
    () =>
      db.appointments
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((a) => !a.deletedAt)
        .sortBy('datetime'),
    [currentWorkspace.id]
  )

  // Group appointments by date
  const groupedAppointments = appointments?.reduce(
    (groups, appt) => {
      const date = toZonedTime(parseISO(appt.datetime), TIMEZONE)
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd')

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date,
          appointments: [],
        }
      }
      groups[dateKey].appointments.push(appt)
      return groups
    },
    {} as Record<string, { date: Date; appointments: typeof appointments }>
  )

  const sortedDates = Object.keys(groupedAppointments || {}).sort()

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d')
  }

  if (!appointments) {
    return (
      <>
        <Header
          title="Appointments"
          rightAction={{
            icon: <CalendarDays className="w-6 h-6 text-secondary-700" />,
            label: 'Calendar view',
            onClick: () => router.push('/appointments/calendar'),
          }}
        />
        <PageContainer>
          <LoadingState message="Loading appointments..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Appointments"
        rightAction={{
          icon: <CalendarDays className="w-6 h-6 text-secondary-700" />,
          label: 'Calendar view',
          onClick: () => router.push('/appointments/calendar'),
        }}
      />
      <PageContainer className="pt-4">
        {appointments.length === 0 ? (
          <EmptyState
            type="appointments"
            title="No appointments"
            description="Add your upcoming appointments to keep track of them."
            action={{
              label: 'Add Appointment',
              onClick: () => router.push('/appointments/new'),
            }}
          />
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const group = groupedAppointments![dateKey]
              const isPast = group.date < startOfDay(new Date())

              return (
                <div key={dateKey}>
                  <h2
                    className={`text-sm font-semibold mb-3 ${
                      isPast ? 'text-secondary-400' : 'text-secondary-600'
                    }`}
                  >
                    {formatDateHeader(group.date)}
                  </h2>
                  <div className="space-y-3">
                    {group.appointments.map((appt) => (
                      <Card
                        key={appt.id}
                        onClick={() => router.push(`/appointments/${appt.id}`)}
                        className={`${isPast ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isPast
                                ? 'bg-secondary-100'
                                : 'bg-primary-100'
                            }`}
                          >
                            <Calendar
                              className={`w-5 h-5 ${
                                isPast
                                  ? 'text-secondary-400'
                                  : 'text-primary-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-secondary-900 truncate">
                              {appt.title}
                            </h3>
                            <p className="text-sm text-secondary-500 flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {format(
                                toZonedTime(parseISO(appt.datetime), TIMEZONE),
                                'h:mm a'
                              )}
                            </p>
                            {appt.location && (
                              <p className="text-sm text-secondary-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{appt.location}</span>
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-secondary-300" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add appointment FAB */}
        <div className="fixed bottom-20 right-4 z-30">
          <Button
            onClick={() => router.push('/appointments/new')}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
