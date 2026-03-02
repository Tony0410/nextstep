'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Phone, MapPin, Clock, ChevronRight, Pill, Calendar, Plus, AlertTriangle, ClipboardCheck, Heart, Thermometer, Weight, Milestone } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, logDose, undoDose } from '@/lib/sync'
import { calculateAllMedicationsDue, formatTimeUntil } from '@/lib/schedule'
import type { Medication, DoseLog, MedicationDueStatus } from '@/lib/schedule'
import { Card, CardTitle, Button, LoadingState, EmptyState, showUndoToast, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { RefillAlert } from '@/components/medications/RefillAlert'
import { useApp } from '../provider'

const TIMEZONE = 'Australia/Perth'

export default function TodayPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [now, setNow] = useState(() => new Date())
  const [quickNote, setQuickNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Latest temperature reading
  const latestTemp = useLiveQuery(
    () =>
      db.temperatureLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((t) => !t.deletedAt)
        .reverse()
        .sortBy('recordedAt')
        .then((logs) => logs[0] ?? null),
    [currentWorkspace.id]
  )

  // Latest weight reading
  const latestWeight = useLiveQuery(
    () =>
      db.weightLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((w) => !w.deletedAt)
        .reverse()
        .sortBy('recordedAt')
        .then((logs) => logs[0] ?? null),
    [currentWorkspace.id]
  )

  // Pending caregiver tasks (due today or overdue)
  const pendingTasks = useLiveQuery(
    () =>
      db.caregiverTasks
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((t) => !t.deletedAt && t.status !== 'DONE')
        .toArray(),
    [currentWorkspace.id]
  )

  // Calculate medication due statuses
  const [medStatuses, setMedStatuses] = useState<MedicationDueStatus[]>([])

  useEffect(() => {
    if (medications && doseLogs) {
      const meds = medications.map((m) => ({
        ...m,
        scheduleData: m.scheduleData as unknown as Medication['scheduleData'],
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
    return format(date, "EEE, MMM d 'at' h:mm a")
  }

  const getGreeting = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
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
      <PageContainer className="pt-6 pb-24 space-y-8">
        {/* Greeting Section with decorative elements */}
        <div className={`relative transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Decorative blob */}
          <div className="blob blob-primary w-32 h-32 -top-4 -left-4" />
          
          <div className="relative">
            <p className="text-secondary-500 text-sm font-medium tracking-wide uppercase mb-1">
              {format(toZonedTime(now, TIMEZONE), 'EEEE, MMMM d')}
            </p>
            <h1 className="font-display text-display-sm text-secondary-900">
              {getGreeting()}
            </h1>
            <p className="text-secondary-600 mt-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent-500" />
              <span>Take it one step at a time</span>
            </p>
          </div>
        </div>

        {/* Emergency & Call Clinic Buttons - Floating cards */}
        <div className={`flex gap-3 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Emergency Info Button */}
          <button
            onClick={() => router.push('/emergency')}
            className="flex-1 group relative overflow-hidden"
          >
            <div className="relative flex items-center gap-3 p-4 bg-alert-50/80 backdrop-blur-sm rounded-card border border-alert-200/60 hover:border-alert-300 hover:shadow-elevated transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-alert-500 to-alert-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-alert-800">Emergency</p>
                <p className="text-sm text-alert-600">Medical info</p>
              </div>
            </div>
          </button>

          {/* Call Clinic Button */}
          {currentWorkspace.clinicPhone && (
            <a
              href={`tel:${currentWorkspace.clinicPhone}`}
              className="flex-1 group"
            >
              <div className="flex items-center gap-3 p-4 bg-primary-50/80 backdrop-blur-sm rounded-card border border-primary-200/60 hover:border-primary-300 hover:shadow-elevated transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-primary-800">Call Clinic</p>
                  <p className="text-sm text-primary-600 truncate max-w-[100px]">{currentWorkspace.clinicPhone}</p>
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Next Appointment - Hero Card */}
        <section className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-secondary-900">Next Appointment</h2>
            <button
              onClick={() => router.push('/appointments')}
              className="text-sm text-primary-600 font-medium flex items-center gap-0.5 hover:text-primary-700 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {nextAppointment ? (
            <div
              className="card-appointment cursor-pointer group"
              onClick={() => router.push(`/appointments/${nextAppointment.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Calendar className="w-7 h-7 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg text-secondary-900 truncate group-hover:text-primary-700 transition-colors">
                    {nextAppointment.title}
                  </h3>
                  <p className="text-sm text-secondary-600 flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-4 h-4 text-primary-500" />
                    {formatAppointmentDate(nextAppointment.datetime)}
                  </p>
                  {nextAppointment.location && (
                    <p className="text-sm text-secondary-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-cream-600" />
                      <span className="truncate">{nextAppointment.location}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
              {nextAppointment.mapUrl && (
                <a
                  href={nextAppointment.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary-600 font-medium hover:text-primary-700 hover:underline"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Maps
                </a>
              )}
            </div>
          ) : (
            <div className="section-warm text-center py-8">
              <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-cream-600" />
              </div>
              <p className="text-secondary-600 font-medium">No upcoming appointments</p>
              <button
                onClick={() => router.push('/appointments/new')}
                className="mt-4 inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add one
              </button>
            </div>
          )}
        </section>

        {/* Prep Reminder for Tomorrow's Appointment */}
        {appointments && appointments.length > 0 && (() => {
          const tomorrowAppt = appointments.find((appt) =>
            isTomorrow(toZonedTime(new Date(appt.datetime), TIMEZONE))
          )
          if (tomorrowAppt) {
            return (
              <section className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div
                  className="bg-gradient-to-r from-cream-100 to-cream-50 border border-cream-200 rounded-card p-5 cursor-pointer hover:shadow-elevated transition-all duration-300 group"
                  onClick={() => router.push(`/appointments/${tomorrowAppt.id}/prep`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                      <ClipboardCheck className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-lg text-secondary-900">
                        Prepare for tomorrow
                      </p>
                      <p className="text-sm text-secondary-600">
                        {tomorrowAppt.title} at {format(toZonedTime(new Date(tomorrowAppt.datetime), TIMEZONE), 'h:mm a')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-accent-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </section>
            )
          }
          return null
        })()}

        {/* Refill Alerts */}
        {medications && medications.length > 0 && (
          <div className={`transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <RefillAlert
              medications={medications.map(m => ({
                id: m.id,
                name: m.name,
                pillCount: m.pillCount,
                refillThreshold: m.refillThreshold,
              }))}
            />
          </div>
        )}

        {/* Meds Due */}
        <section className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-secondary-900">Medications</h2>
            <button
              onClick={() => router.push('/meds')}
              className="text-sm text-primary-600 font-medium flex items-center gap-0.5 hover:text-primary-700 transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {medsDueSoon.length > 0 ? (
            <div className="space-y-4">
              {medsDueSoon.map((status, index) => (
                <MedicationCard
                  key={status.medication.id}
                  status={status}
                  now={now}
                  onTake={() => handleTakeMed(status)}
                  index={index}
                />
              ))}
            </div>
          ) : medications.length > 0 ? (
            <div className="section-warm text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-primary-400" />
              </div>
              <p className="text-secondary-600 font-medium">All caught up!</p>
              <p className="text-sm text-secondary-400 mt-1">No medications due soon</p>
            </div>
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

        {/* Health Snapshot Cards */}
        <section className={`transition-all duration-700 delay-[600ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="font-display text-xl text-secondary-900 mb-4">Health Snapshot</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Temperature Card */}
            <button
              onClick={() => router.push('/temperature')}
              className="bg-surface border border-border rounded-card p-4 text-left hover:shadow-elevated transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Thermometer className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-secondary-500">Temperature</p>
              {latestTemp ? (
                <p className={`text-xl font-display mt-0.5 ${
                  latestTemp.tempCelsius >= 38.0 ? 'text-red-600' : 'text-secondary-900'
                }`}>
                  {latestTemp.tempCelsius}°C
                </p>
              ) : (
                <p className="text-sm text-secondary-400 mt-0.5">No readings</p>
              )}
            </button>

            {/* Weight Card */}
            <button
              onClick={() => router.push('/weight')}
              className="bg-surface border border-border rounded-card p-4 text-left hover:shadow-elevated transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Weight className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm text-secondary-500">Weight</p>
              {latestWeight ? (
                <p className="text-xl font-display text-secondary-900 mt-0.5">
                  {latestWeight.weightKg} kg
                </p>
              ) : (
                <p className="text-sm text-secondary-400 mt-0.5">No readings</p>
              )}
            </button>

            {/* Tasks Card */}
            <button
              onClick={() => router.push('/tasks')}
              className="bg-surface border border-border rounded-card p-4 text-left hover:shadow-elevated transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5 text-accent-500" />
              </div>
              <p className="text-sm text-secondary-500">Tasks</p>
              {pendingTasks && pendingTasks.length > 0 ? (
                <p className="text-xl font-display text-secondary-900 mt-0.5">
                  {pendingTasks.length} pending
                </p>
              ) : (
                <p className="text-sm text-secondary-400 mt-0.5">All done</p>
              )}
            </button>

            {/* Timeline Card */}
            <button
              onClick={() => router.push('/timeline')}
              className="bg-surface border border-border rounded-card p-4 text-left hover:shadow-elevated transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Milestone className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-sm text-secondary-500">Timeline</p>
              <p className="text-sm text-primary-600 font-medium mt-0.5">View progress</p>
            </button>
          </div>
        </section>

        {/* Quick Note */}
        <section className={`transition-all duration-700 delay-[700ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="font-display text-xl text-secondary-900 mb-4">Quick Note</h2>
          <div className="section-warm">
            <div className="flex gap-3">
              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Jot down a thought..."
                className="input-sanctuary flex-1"
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
                className="btn-primary whitespace-nowrap"
              >
                Add
              </Button>
            </div>
          </div>
        </section>
      </PageContainer>
    </>
  )
}

interface MedicationCardProps {
  status: MedicationDueStatus
  now: Date
  onTake: () => void
  index: number
}

function MedicationCard({ status, now, onTake, index }: MedicationCardProps) {
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
    <div className={`card-medication ${isOverdue ? 'overdue' : ''} animate-fade-up`} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner transition-all duration-300 ${
          isOverdue 
            ? 'bg-gradient-to-br from-accent-100 to-accent-200' 
            : 'bg-gradient-to-br from-primary-100 to-primary-200'
        }`}>
          <Pill className={`w-7 h-7 ${isOverdue ? 'text-accent-600' : 'text-primary-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-secondary-900">{medication.name}</h3>
          <p className={`text-sm ${isOverdue ? 'text-accent-600 font-medium' : 'text-secondary-500'}`}>
            {getTimeLabel()}
            {isPRN && ' • As needed'}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTake()
          }}
          disabled={!canTake}
          className={`btn-primary text-sm px-5 py-2.5 ${!canTake ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Taken
        </button>
      </div>
      {medication.instructions && (
        <p className="text-sm text-secondary-500 mt-3 ml-[72px]">
          {medication.instructions}
        </p>
      )}
    </div>
  )
}
