'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Phone, MapPin, Clock, ChevronRight, Pill, Calendar, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, logDose, undoDose } from '@/lib/sync'
import { calculateAllMedicationsDue, formatTimeUntil } from '@/lib/schedule'
import type { Medication, DoseLog, MedicationDueStatus } from '@/lib/schedule'
import { Card, CardTitle, Button, LoadingState, EmptyState, showUndoToast, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../provider'

const TIMEZONE = 'Australia/Perth'

export default function TodayPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [now, setNow] = useState(() => new Date())
  const [quickNote, setQuickNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch data from IndexedDB
  const appointments = useLiveQuery(
    () =>
      db.appointments
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((a) => !a.deletedAt && new Date(a.datetime) >= now)
        .sortBy('datetime'),
    [currentWorkspace.id, now]
  )

  const medications = useLiveQuery(
    () =>
      db.medications
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((m) => m.active && !m.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  const doseLogs = useLiveQuery(
    () =>
      db.doseLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .toArray(),
    [currentWorkspace.id]
  )

  // Calculate medication due statuses
  const [medStatuses, setMedStatuses] = useState<MedicationDueStatus[]>([])

  useEffect(() => {
    if (medications && doseLogs) {
      const meds = medications.map((m) => ({
        ...m,
        scheduleData: m.scheduleData as Medication['scheduleData'],
        startDate: m.startDate ? new Date(m.startDate) : null,
        endDate: m.endDate ? new Date(m.endDate) : null,
      })) as Medication[]

      const logs = doseLogs.map((d) => ({
        ...d,
        takenAt: new Date(d.takenAt),
        undoneAt: d.undoneAt ? new Date(d.undoneAt) : null,
      })) as DoseLog[]

      const statuses = calculateAllMedicationsDue(meds, now, logs)
      setMedStatuses(statuses)
    }
  }, [medications, doseLogs, now])

  // Get next appointment
  const nextAppointment = appointments?.[0]

  // Get meds due soon (due within 2 hours or overdue)
  const medsDueSoon = medStatuses
    .filter((s) => {
      if (s.isOverdue) return true
      if (s.isPRN && s.prnAvailable) return true
      if (s.nextDueAt) {
        const minutesUntil = (s.nextDueAt.getTime() - now.getTime()) / 1000 / 60
        return minutesUntil <= 120
      }
      return false
    })
    .slice(0, 5)

  const handleTakeMed = useCallback(
    async (status: MedicationDueStatus) => {
      try {
        const doseLog = await logDose(
          currentWorkspace.id,
          status.medication.id,
          { id: status.medication.id, name: status.medication.name }
        )

        showUndoToast(`Took ${status.medication.name}`, async () => {
          await undoDose(doseLog)
          showToast('Dose undone', 'info')
        })
      } catch {
        showToast('Failed to log dose', 'error')
      }
    },
    [currentWorkspace.id]
  )

  const handleAddQuickNote = async () => {
    if (!quickNote.trim()) return

    setIsAddingNote(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GENERAL',
          content: quickNote.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to add note')

      setQuickNote('')
      showToast('Note added', 'success')
      await refreshData()
    } catch {
      showToast('Failed to add note', 'error')
    } finally {
      setIsAddingNote(false)
    }
  }

  const formatAppointmentDate = (datetime: string) => {
    const date = toZonedTime(new Date(datetime), TIMEZONE)
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
    return format(date, 'EEE, MMM d \'at\' h:mm a')
  }

  if (!appointments || !medications) {
    return (
      <>
        <Header title="Today" />
        <PageContainer>
          <LoadingState message="Loading your day..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Today" />
      <PageContainer className="pt-4 space-y-6">
        {/* Greeting */}
        <div className="mb-2">
          <p className="text-secondary-500 text-sm">
            {format(toZonedTime(now, TIMEZONE), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Call Clinic Button */}
        {currentWorkspace.clinicPhone && (
          <a
            href={`tel:${currentWorkspace.clinicPhone}`}
            className="flex items-center gap-3 p-4 bg-primary-50 rounded-card border border-primary-100 hover:bg-primary-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-primary-800">Call Clinic</p>
              <p className="text-sm text-primary-600">{currentWorkspace.clinicPhone}</p>
            </div>
          </a>
        )}

        {/* Next Appointment */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-secondary-900">Next Appointment</h2>
            <button
              onClick={() => router.push('/appointments')}
              className="text-sm text-primary-600 font-medium flex items-center"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {nextAppointment ? (
            <Card
              className="card-appointment"
              onClick={() => router.push(`/appointments/${nextAppointment.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-secondary-900 truncate">
                    {nextAppointment.title}
                  </h3>
                  <p className="text-sm text-secondary-600 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {formatAppointmentDate(nextAppointment.datetime)}
                  </p>
                  {nextAppointment.location && (
                    <p className="text-sm text-secondary-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{nextAppointment.location}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-secondary-400" />
              </div>
              {nextAppointment.mapUrl && (
                <a
                  href={nextAppointment.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary-600 font-medium hover:text-primary-700"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Maps
                </a>
              )}
            </Card>
          ) : (
            <Card variant="outline" className="text-center py-6">
              <Calendar className="w-8 h-8 text-secondary-300 mx-auto mb-2" />
              <p className="text-secondary-500">No upcoming appointments</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => router.push('/appointments/new')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add one
              </Button>
            </Card>
          )}
        </section>

        {/* Meds Due */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-secondary-900">Medications</h2>
            <button
              onClick={() => router.push('/meds')}
              className="text-sm text-primary-600 font-medium flex items-center"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {medsDueSoon.length > 0 ? (
            <div className="space-y-3">
              {medsDueSoon.map((status) => (
                <MedicationCard
                  key={status.medication.id}
                  status={status}
                  now={now}
                  onTake={() => handleTakeMed(status)}
                />
              ))}
            </div>
          ) : medications.length > 0 ? (
            <Card variant="outline" className="text-center py-6">
              <Pill className="w-8 h-8 text-secondary-300 mx-auto mb-2" />
              <p className="text-secondary-500">All caught up! No meds due soon.</p>
            </Card>
          ) : (
            <EmptyState
              type="medications"
              title="No medications"
              description="Add medications to track when to take them."
              action={{
                label: 'Add Medication',
                onClick: () => router.push('/meds/new'),
              }}
            />
          )}
        </section>

        {/* Quick Note */}
        <section>
          <h2 className="text-lg font-semibold text-secondary-900 mb-3">Quick Note</h2>
          <Card padding="sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Jot down a thought..."
                className="flex-1 px-3 py-2.5 border border-border rounded-button text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickNote.trim()) {
                    handleAddQuickNote()
                  }
                }}
              />
              <Button
                onClick={handleAddQuickNote}
                disabled={!quickNote.trim() || isAddingNote}
                loading={isAddingNote}
              >
                Add
              </Button>
            </div>
          </Card>
        </section>
      </PageContainer>
    </>
  )
}

interface MedicationCardProps {
  status: MedicationDueStatus
  now: Date
  onTake: () => void
}

function MedicationCard({ status, now, onTake }: MedicationCardProps) {
  const { medication, isOverdue, isPRN, prnAvailable, prnAvailableAt, nextDueAt } = status

  const getTimeLabel = () => {
    if (isOverdue && nextDueAt) {
      return formatTimeUntil(nextDueAt, now)
    }
    if (isPRN) {
      if (prnAvailable) {
        return 'Available now'
      }
      if (prnAvailableAt) {
        return `Available ${formatTimeUntil(prnAvailableAt, now)}`
      }
      return 'As needed'
    }
    if (nextDueAt) {
      return formatTimeUntil(nextDueAt, now)
    }
    return ''
  }

  const canTake = !isPRN || prnAvailable

  return (
    <Card className={isOverdue ? 'overdue' : ''}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900">{medication.name}</h3>
          <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-secondary-500'}`}>
            {getTimeLabel()}
            {isPRN && ' • As needed'}
          </p>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onTake()
          }}
          variant="success"
          size="md"
          disabled={!canTake}
        >
          Taken
        </Button>
      </div>
      {medication.instructions && (
        <p className="text-sm text-secondary-500 mt-2 ml-13">
          {medication.instructions}
        </p>
      )}
    </Card>
  )
}
