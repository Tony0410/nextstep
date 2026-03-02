'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardList } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, ConfirmModal, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { useApp } from '../provider'

export default function TasksPage() {
  const { currentWorkspace, refreshData } = useApp()
  const [serverTasks, setServerTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const localTasks = useLiveQuery(
    () =>
      db.caregiverTasks
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((t) => !t.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/tasks?limit=200`)
      if (response.ok) {
        const data = await response.json()
        setServerTasks(data.tasks)
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id])

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members?.map((m: any) => ({ id: m.userId || m.id, name: m.user?.name || m.name })) || [])
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    fetchTasks()
    fetchMembers()
  }, [fetchTasks, fetchMembers])

  const handleSaved = () => {
    fetchTasks()
    refreshData()
    setEditTask(null)
  }

  const handleComplete = async (taskId: string) => {
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/tasks/${taskId}/complete`,
        { method: 'POST' }
      )
      if (!response.ok) throw new Error('Failed to complete task')
      showToast('Task completed!', 'success')
      fetchTasks()
      refreshData()
    } catch {
      showToast('Failed to complete task', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/tasks/${deleteId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete task')
      showToast('Task deleted', 'success')
      fetchTasks()
      refreshData()
      setDeleteId(null)
    } catch {
      showToast('Failed to delete task', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (task: any) => {
    setEditTask(task)
    setShowForm(true)
  }

  const allTasks = serverTasks.length > 0 ? serverTasks : localTasks || []

  // Apply filters
  const filteredTasks = allTasks.filter((t: any) => {
    if (filter === 'done') return t.status === 'DONE'
    if (filter === 'mine') return t.status !== 'DONE' && t.status !== 'CANCELLED'
    // 'all' shows active tasks (not done/cancelled)
    return t.status !== 'DONE' && t.status !== 'CANCELLED'
  })

  // Group active tasks by priority
  const urgentTasks = filteredTasks.filter((t: any) => t.priority === 'URGENT')
  const highTasks = filteredTasks.filter((t: any) => t.priority === 'HIGH')
  const normalTasks = filteredTasks.filter((t: any) => t.priority === 'NORMAL')
  const lowTasks = filteredTasks.filter((t: any) => t.priority === 'LOW')
  const doneTasks = filter === 'done' ? filteredTasks : []

  const activeCount = allTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED').length
  const doneCount = allTasks.filter((t: any) => t.status === 'DONE').length

  if (loading && !localTasks) {
    return (
      <>
        <Header title="Tasks" />
        <PageContainer><LoadingState message="Loading tasks..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Tasks"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add',
          onClick: () => { setEditTask(null); setShowForm(true) },
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Summary */}
        <div className="flex gap-3">
          <Card className="flex-1 text-center py-3">
            <p className="text-2xl font-bold text-primary-600">{activeCount}</p>
            <p className="text-xs text-secondary-500">Active</p>
          </Card>
          <Card className="flex-1 text-center py-3">
            <p className="text-2xl font-bold text-green-600">{doneCount}</p>
            <p className="text-xs text-secondary-500">Done</p>
          </Card>
        </div>

        {/* Filters */}
        <TaskFilters filter={filter} onFilterChange={setFilter} />

        {/* Task Lists */}
        {filter === 'done' ? (
          <section>
            {doneTasks.length === 0 ? (
              <Card variant="outline" className="text-center py-8">
                <p className="text-secondary-500">No completed tasks yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {doneTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} onEdit={handleEdit} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {filteredTasks.length === 0 ? (
              <Card variant="outline" className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
                <p className="text-secondary-500">No tasks yet</p>
                <p className="text-sm text-secondary-400 mt-1">
                  Add tasks to coordinate care with your team
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                {urgentTasks.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">
                      Urgent
                    </h2>
                    <div className="space-y-3">
                      {urgentTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {highTasks.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3">
                      High Priority
                    </h2>
                    <div className="space-y-3">
                      {highTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {normalTasks.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-secondary-600 uppercase tracking-wide mb-3">
                      Normal
                    </h2>
                    <div className="space-y-3">
                      {normalTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {lowTasks.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-secondary-400 uppercase tracking-wide mb-3">
                      Low Priority
                    </h2>
                    <div className="space-y-3">
                      {lowTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </PageContainer>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTask(null) }}
        onSaved={handleSaved}
        workspaceId={currentWorkspace.id}
        members={members}
        initialData={editTask || undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
