'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pill, Clock, ChevronRight, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, logDose, undoDose } from '@/lib/sync'
import { calculateAllMedicationsDue, formatTimeUntil } from '@/lib/schedule'
import type { Medication, DoseLog, MedicationDueStatus } from '@/lib/schedule'
import { Card, Button, LoadingState, EmptyState, showUndoToast, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../provider'

export default function MedsPage() {
  const router = useRouter()
  const { currentWorkspace } = useApp()
  const [now, setNow] = useState(() => new Date())

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch data from IndexedDB
  const medications = useLiveQuery(
    () =>
      db.medications
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((m) => !m.deletedAt)
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
      const meds = medications
        .filter((m) => m.active)
        .map((m) => ({
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

  // Inactive medications
  const inactiveMeds = medications?.filter((m) => !m.active) || []

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

  if (!medications) {
    return (
      <>
        <Header
          title="Medications"
          rightAction={{
            icon: <Plus className="w-6 h-6 text-secondary-700" />,
            label: 'Add medication',
            onClick: () => router.push('/meds/new'),
          }}
        />
        <PageContainer>
          <LoadingState message="Loading medications..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Medications"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add medication',
          onClick: () => router.push('/meds/new'),
        }}
      />
      <PageContainer className="pt-4">
        {/* History link */}
        <button
          onClick={() => router.push('/meds/history')}
          className="flex items-center gap-2 text-primary-600 font-medium mb-4"
        >
          <History className="w-4 h-4" />
          View dose history
        </button>

        {medications.length === 0 ? (
          <EmptyState
            type="medications"
            title="No medications"
            description="Add medications you need to track."
            action={{
              label: 'Add Medication',
              onClick: () => router.push('/meds/new'),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Active medications */}
            {medStatuses.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-secondary-600 mb-3">
                  Active Medications
                </h2>
                <div className="space-y-3">
                  {medStatuses.map((status) => (
                    <MedicationCard
                      key={status.medication.id}
                      status={status}
                      now={now}
                      onTake={() => handleTakeMed(status)}
                      onClick={() => router.push(`/meds/${status.medication.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Inactive medications */}
            {inactiveMeds.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-secondary-400 mb-3">
                  Inactive Medications
                </h2>
                <div className="space-y-3">
                  {inactiveMeds.map((med) => (
                    <Card
                      key={med.id}
                      onClick={() => router.push(`/meds/${med.id}`)}
                      className="opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-secondary-700">{med.name}</h3>
                          <p className="text-sm text-secondary-400">Inactive</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-secondary-300" />
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageContainer>
    </>
  )
}

interface MedicationCardProps {
  status: MedicationDueStatus
  now: Date
  onTake: () => void
  onClick: () => void
}

function MedicationCard({ status, now, onTake, onClick }: MedicationCardProps) {
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
    <Card className={isOverdue ? 'overdue' : ''} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900">{medication.name}</h3>
          <p className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-secondary-500'}`}>
            <Clock className="w-3.5 h-3.5" />
            {getTimeLabel()}
            {isPRN && ' • PRN'}
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
    </Card>
  )
}
