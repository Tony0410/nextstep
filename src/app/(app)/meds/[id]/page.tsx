'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Pill, Clock, Edit2, Trash2, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, logDose, undoDose } from '@/lib/sync'
import { Card, Button, LoadingState, Modal, showToast, showUndoToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { RefillTracker } from '@/components/medications/RefillTracker'
import { useApp } from '../../provider'

export default function MedicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: medicationId } = use(params)
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch medication from IndexedDB
  const medication = useLiveQuery(
    () => db.medications.get(medicationId),
    [medicationId]
  )

  // Fetch recent dose logs
  const doseLogs = useLiveQuery(
    () =>
      db.doseLogs
        .where('medicationId')
        .equals(medicationId)
        .reverse()
        .limit(10)
        .toArray(),
    [medicationId]
  )

  const handleRefresh = useCallback(async () => {
    await refreshData()
  }, [refreshData])

  const handleTakeDose = useCallback(async () => {
    if (!medication) return
    try {
      const doseLog = await logDose(
        currentWorkspace.id,
        medication.id,
        { id: medication.id, name: medication.name }
      )
      showUndoToast(`Took ${medication.name}`, async () => {
        await undoDose(doseLog)
        showToast('Dose undone', 'info')
      })
    } catch {
      showToast('Failed to log dose', 'error')
    }
  }, [medication, currentWorkspace.id])

  const handleDelete = async () => {
    if (!medication) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/medications/${medication.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      await refreshData()
      showToast('Medication deleted', 'success')
      router.push('/meds')
    } catch {
      showToast('Failed to delete medication', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const formatSchedule = () => {
    if (!medication) return ''
    const data = medication.scheduleData as Record<string, unknown>
    switch (medication.scheduleType) {
      case 'FIXED_TIMES':
        return `Daily at ${(data.times as string[]).join(', ')}`
      case 'INTERVAL':
        return `Every ${data.hours} hours (starting ${data.startTime})`
      case 'WEEKDAYS':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const selectedDays = (data.days as number[]).map(d => days[d]).join(', ')
        return `${selectedDays} at ${data.time}`
      case 'PRN':
        return `As needed (min ${data.minHoursBetween}h between doses)`
      default:
        return medication.scheduleType
    }
  }

  if (!medication) {
    return (
      <>
        <Header title="Medication" showBack />
        <PageContainer>
          <LoadingState message="Loading medication..." />
        </PageContainer>
      </>
    )
  }

  const recentDoses = doseLogs?.filter(d => !d.undoneAt) || []

  return (
    <>
      <Header
        title={medication.name}
        showBack
        rightAction={
          currentWorkspace.role !== 'VIEWER'
            ? {
                icon: <Trash2 className="w-6 h-6 text-red-600" />,
                label: 'Delete',
                onClick: () => setShowDeleteModal(true),
              }
            : undefined
        }
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Status Card */}
        <Card className={medication.active ? '' : 'opacity-60'}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-secondary-900">
                {medication.name}
              </h2>
              <p className="text-sm text-secondary-600 flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" />
                {formatSchedule()}
              </p>
              {medication.instructions && (
                <p className="text-sm text-secondary-500 mt-2">
                  {medication.instructions}
                </p>
              )}
              {!medication.active && (
                <p className="text-sm text-orange-600 font-medium mt-2">
                  Inactive
                </p>
              )}
            </div>
          </div>
          {currentWorkspace.role !== 'VIEWER' && medication.active && (
            <Button
              onClick={handleTakeDose}
              variant="success"
              fullWidth
              className="mt-4"
            >
              Mark as Taken
            </Button>
          )}
        </Card>

        {/* Refill Tracker */}
        {medication.pillCount !== null && (
          <RefillTracker
            medicationId={medication.id}
            workspaceId={currentWorkspace.id}
            medicationName={medication.name}
            pillCount={medication.pillCount}
            pillsPerDose={medication.pillsPerDose}
            refillThreshold={medication.refillThreshold}
            onRefill={handleRefresh}
          />
        )}

        {/* Recent Doses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-secondary-600">Recent Doses</h3>
            <button
              onClick={() => router.push('/meds/history')}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              <History className="w-4 h-4" />
              Full history
            </button>
          </div>
          {recentDoses.length > 0 ? (
            <Card padding="none">
              <ul className="divide-y divide-border">
                {recentDoses.map((dose) => (
                  <li key={dose.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-secondary-900">
                        {format(new Date(dose.takenAt), 'EEEE, MMM d')}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {format(new Date(dose.takenAt), 'h:mm a')}
                        {dose.loggedBy && ` by ${dose.loggedBy.name}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card variant="outline" className="text-center py-6">
              <p className="text-secondary-500">No doses logged yet</p>
            </Card>
          )}
        </section>
      </PageContainer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Medication"
      >
        <p className="text-secondary-600 mb-4">
          Are you sure you want to delete "{medication.name}"? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
