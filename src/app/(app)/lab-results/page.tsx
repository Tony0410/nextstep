'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, TestTubes } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, ConfirmModal, showToast, Select } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { LabResultCard } from '@/components/labs/LabResultCard'
import { LabResultForm } from '@/components/labs/LabResultForm'
import { LabTrendChart } from '@/components/labs/LabTrendChart'
import { useApp } from '../provider'

const COMMON_MARKERS = [
  'WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'Platelets',
  'Neutrophils', 'Glucose', 'Creatinine', 'AST', 'ALT',
  'CEA', 'CA 19-9',
]

export default function LabResultsPage() {
  const { currentWorkspace, refreshData } = useApp()
  const [serverData, setServerData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editResult, setEditResult] = useState<any>(null)
  const [tab, setTab] = useState<'recent' | 'trends'>('recent')
  const [trendMarker, setTrendMarker] = useState(COMMON_MARKERS[0])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const localData = useLiveQuery(
    () =>
      db.labResults
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((r) => !r.deletedAt)
        .reverse()
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/lab-results?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setServerData(data.labResults)
      }
    } catch (err) {
      console.error('Failed to fetch lab results:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaved = () => {
    fetchData()
    refreshData()
    setEditResult(null)
  }

  const handleEdit = (result: any) => {
    setEditResult(result)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/lab-results/${deleteId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      showToast('Lab result deleted', 'success')
      fetchData()
      refreshData()
      setDeleteId(null)
    } catch {
      showToast('Failed to delete lab result', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const results = serverData.length > 0 ? serverData : localData || []

  // Collect unique markers from results for the trend selector
  const allMarkers = new Set<string>()
  results.forEach((r: any) => {
    (r.results || []).forEach((m: any) => allMarkers.add(m.marker))
  })
  const markerOptions = Array.from(allMarkers).map((m) => ({ value: m, label: m }))
  if (markerOptions.length === 0) {
    COMMON_MARKERS.forEach((m) => markerOptions.push({ value: m, label: m }))
  }

  if (loading && !localData) {
    return (
      <>
        <Header title="Lab Results" />
        <PageContainer><LoadingState message="Loading lab results..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Lab Results"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add',
          onClick: () => { setEditResult(null); setShowForm(true) },
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['recent', 'trends'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all min-h-touch ${
                tab === t
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-secondary-600'
              }`}
            >
              {t === 'recent' ? 'Recent' : 'Trends'}
            </button>
          ))}
        </div>

        {tab === 'recent' ? (
          /* Recent results */
          <section>
            {results.length === 0 ? (
              <Card variant="outline" className="text-center py-8">
                <TestTubes className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
                <p className="text-secondary-500">No lab results yet</p>
                <p className="text-sm text-secondary-400 mt-1">
                  Tap + to record your blood work results
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result: any) => (
                  <LabResultCard key={result.id} result={result} onEdit={handleEdit} />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Trends view */
          <section className="space-y-4">
            <Select
              label="Select Marker"
              value={trendMarker}
              onChange={(e) => setTrendMarker(e.target.value)}
              options={markerOptions}
            />
            <Card>
              <div className="p-4">
                <LabTrendChart marker={trendMarker} workspaceId={currentWorkspace.id} />
              </div>
            </Card>
          </section>
        )}
      </PageContainer>

      {/* Form Modal */}
      <LabResultForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditResult(null) }}
        onSaved={handleSaved}
        workspaceId={currentWorkspace.id}
        initialData={editResult || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Lab Result"
        message="Are you sure you want to delete this lab result?"
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
