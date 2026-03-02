'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Milestone } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { ProgressBar } from '@/components/timeline/ProgressBar'
import { TimelineView } from '@/components/timeline/TimelineView'
import { MilestoneForm } from '@/components/timeline/MilestoneForm'
import { useApp } from '../provider'
import { showToast } from '@/components/ui'

export default function TimelinePage() {
  const { currentWorkspace, refreshData } = useApp()
  const [serverData, setServerData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null)

  const localData = useLiveQuery(
    () =>
      db.milestones
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((m) => !m.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setServerData(data.milestones)
      }
    } catch (err) {
      console.error('Failed to fetch milestones:', err)
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
    setShowForm(false)
    setEditingMilestone(null)
  }

  const handleEdit = (milestone: any) => {
    setEditingMilestone(milestone)
    setShowForm(true)
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/milestones/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      if (!response.ok) throw new Error('Failed to update status')
      showToast('Status updated', 'success')
      fetchData()
      refreshData()
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  const milestones = serverData.length > 0 ? serverData : localData || []

  if (loading && !localData) {
    return (
      <>
        <Header title="Treatment Journey" />
        <PageContainer><LoadingState message="Loading milestones..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Treatment Journey"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add Milestone',
          onClick: () => {
            setEditingMilestone(null)
            setShowForm(true)
          },
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Progress Bar */}
        {milestones.length > 0 && (
          <section>
            <ProgressBar milestones={milestones} />
          </section>
        )}

        {/* Timeline */}
        {milestones.length === 0 ? (
          <Card variant="outline" className="text-center py-8">
            <Milestone className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
            <p className="text-secondary-500">No milestones yet</p>
            <p className="text-sm text-secondary-400 mt-1">Track your treatment journey by adding milestones</p>
          </Card>
        ) : (
          <section>
            <TimelineView
              milestones={milestones}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
            />
          </section>
        )}
      </PageContainer>

      {/* Form Modal */}
      <MilestoneForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingMilestone(null)
        }}
        onSaved={handleSaved}
        workspaceId={currentWorkspace.id}
        initialData={editingMilestone}
      />
    </>
  )
}
