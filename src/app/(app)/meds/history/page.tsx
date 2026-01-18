'use client'

import { format, isToday, isYesterday, parseISO, startOfDay, subDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Pill, Clock, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, EmptyState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'

const TIMEZONE = 'Australia/Perth'

export default function MedicationHistoryPage() {
  const { currentWorkspace } = useApp()

  // Get last 7 days of doses
  const sevenDaysAgo = subDays(new Date(), 7)

  const doseLogs = useLiveQuery(
    () =>
      db.doseLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((d) => new Date(d.takenAt) >= sevenDaysAgo)
        .reverse()
        .sortBy('takenAt'),
    [currentWorkspace.id]
  )

  // Group by date
  const groupedDoses = doseLogs?.reduce(
    (groups, dose) => {
      const date = toZonedTime(parseISO(dose.takenAt), TIMEZONE)
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd')

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date,
          doses: [],
        }
      }
      groups[dateKey].doses.push(dose)
      return groups
    },
    {} as Record<string, { date: Date; doses: typeof doseLogs }>
  )

  const sortedDates = Object.keys(groupedDoses || {}).sort().reverse()

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d')
  }

  if (!doseLogs) {
    return (
      <>
        <Header title="Dose History" showBack backHref="/meds" />
        <PageContainer>
          <LoadingState message="Loading history..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Dose History" showBack backHref="/meds" />
      <PageContainer className="pt-4">
        <p className="text-sm text-secondary-500 mb-4">Last 7 days</p>

        {doseLogs.length === 0 ? (
          <EmptyState
            type="medications"
            title="No doses recorded"
            description="Doses you take will appear here."
          />
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const group = groupedDoses![dateKey]

              return (
                <div key={dateKey}>
                  <h2 className="text-sm font-semibold text-secondary-600 mb-3">
                    {formatDateHeader(group.date)}
                  </h2>
                  <Card padding="none">
                    <div className="divide-y divide-border">
                      {group.doses.map((dose) => (
                        <div
                          key={dose.id}
                          className={`flex items-center gap-3 p-4 ${
                            dose.undoneAt ? 'opacity-50' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              dose.undoneAt ? 'bg-secondary-100' : 'bg-primary-100'
                            }`}
                          >
                            <Pill
                              className={`w-4 h-4 ${
                                dose.undoneAt ? 'text-secondary-400' : 'text-primary-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium ${
                                dose.undoneAt
                                  ? 'text-secondary-400 line-through'
                                  : 'text-secondary-900'
                              }`}
                            >
                              {dose.medication?.name || 'Unknown medication'}
                            </p>
                            <p className="text-sm text-secondary-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(
                                toZonedTime(parseISO(dose.takenAt), TIMEZONE),
                                'h:mm a'
                              )}
                              {dose.loggedBy && ` • ${dose.loggedBy.name}`}
                            </p>
                          </div>
                          {dose.undoneAt && (
                            <div className="flex items-center gap-1 text-secondary-400">
                              <X className="w-4 h-4" />
                              <span className="text-xs">Undone</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </PageContainer>
    </>
  )
}
