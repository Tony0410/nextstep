'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Pill, Clock, Trash2, History, X, Edit2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, logDose, undoDose } from '@/lib/sync'
import type { LocalDoseLog } from '@/lib/sync'
import { Card, Button, LoadingState, Modal, showToast, showUndoToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { RefillTracker } from '@/components/medications/RefillTracker'
import { useApp } from '../../provider'

// Unwrapping params for Next.js 14/15 compatibility
// In Next.js 15 params is a Promise, in 14 it's an object.
// We can use a simple `use` polyfill or just await it if we were in an async component, 
// but this is a client component. 
// For client components, params is passed as is.
// If types say Promise, we might need to use `use` but `use` is experimental in React 18.
// Let's assume params is an object for now as per Next 14 standard behavior for pages.
// If it is a promise (Next 15), we need `use`. 
// Safest way: check if it has .then? 
// Actually, let's just assume object for Next 14.

export default function MedicationDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  // Simple unwrap if it's a promise (though likely it's an object in Next 14)
  const [medicationId, setMedicationId] = useState<string>('')

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p) => setMedicationId(p.id))
    } else {
      setMedicationId(params.id)
    }
  }, [params])

  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch medication from IndexedDB
  const medication = useLiveQuery(
    () => (medicationId ? db.medications.get(medicationId) : undefined),
    [medicationId]
  )

  // Fetch recent dose logs
  const doseLogs = useLiveQuery(
    () =>
      medicationId
        ? db.doseLogs
            .where('medicationId')
            .equals(medicationId)
            .reverse()
            .limit(10)
            .toArray()
        : [],
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

  const handleDeleteDose = async (dose: LocalDoseLog) => {
    try {
      await undoDose(dose)
      showToast('Dose removed', 'success')
    } catch {
      showToast('Failed to remove dose', 'error')
    }
  }

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
    if (!medication || !medication.scheduleData) return ''
    const data = medication.scheduleData as Record<string, unknown>
    switch (medication.scheduleType) {
      case 'FIXED_TIMES':
        return `Daily at ${(Array.isArray(data.times) ? data.times : []).join(', ')}`
      case 'INTERVAL':
        return `Every ${data.hours || '?'} hours (starting ${data.startTime || '?'})`
      case 'WEEKDAYS':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const selectedDays = (Array.isArray(data.days) ? data.days : [])
          .map((d: number) => days[d])
          .join(', ')
        return `${selectedDays} at ${data.time || '?'}`
      case 'PRN':
        return `As needed (min ${data.minHoursBetween || '?'}h between doses)`
      default:
        return medication.scheduleType
    }
  }

  if (!medicationId || !medication) {
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
                icon: <Edit2 className="w-5 h-5 text-primary-600" />,
                label: 'Edit',
                onClick: () => router.push(`/meds/${medication.id}/edit`),
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
                  <li key={dose.id} className="px-4 py-3 flex items-center justify-between group">
                    <div>
                      <p className="text-sm font-medium text-secondary-900">
                        {format(new Date(dose.takenAt), 'EEEE, MMM d')}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {format(new Date(dose.takenAt), 'h:mm a')}
                        {dose.loggedBy && ` by ${dose.loggedBy.name}`}
                      </p>
                    </div>
                    {currentWorkspace.role !== 'VIEWER' && (
                      <button
                        onClick={() => handleDeleteDose(dose)}
                        className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove dose"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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

        {/* Delete Action */}
        {currentWorkspace.role !== 'VIEWER' && (
          <div className="pt-4 pb-8">
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 w-full"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Medication
            </Button>
          </div>
        )}
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
