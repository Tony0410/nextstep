'use client'

import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, showToast } from '@/components/ui'

const CATEGORIES = [
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'ERRANDS', label: 'Errands' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'EMOTIONAL', label: 'Emotional Support' },
  { value: 'OTHER', label: 'Other' },
]

const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
]

const STATUSES = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const QUICK_TEMPLATES = [
  { title: 'Pick up prescription', category: 'ERRANDS' },
  { title: 'Drive to appointment', category: 'ERRANDS' },
  { title: 'Prepare meals', category: 'MEALS' },
]

interface TaskFormData {
  title: string
  description: string
  category: string
  priority: string
  status: string
  assignedToId: string
  dueDate: string
}

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  workspaceId: string
  members?: Array<{ id: string; name: string }>
  initialData?: Partial<TaskFormData> & { id?: string }
}

export function TaskForm({ isOpen, onClose, onSaved, workspaceId, members = [], initialData }: TaskFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<TaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'OTHER',
    priority: initialData?.priority || 'NORMAL',
    status: initialData?.status || 'TODO',
    assignedToId: initialData?.assignedToId || '',
    dueDate: initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().slice(0, 16)
      : '',
  })
  const [saving, setSaving] = useState(false)

  const handleQuickTemplate = (template: { title: string; category: string }) => {
    setForm((prev) => ({
      ...prev,
      title: template.title,
      category: template.category,
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    setSaving(true)
    try {
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/tasks/${initialData!.id}`
        : `/api/workspaces/${workspaceId}/tasks`
      const method = isEdit ? 'PATCH' : 'POST'

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }

      if (isEdit) {
        payload.status = form.status
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save task')
      showToast(isEdit ? 'Task updated' : 'Task created', 'success')
      onSaved()
      onClose()
    } catch {
      showToast('Failed to save task', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof TaskFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'}>
      <div className="space-y-4">
        {/* Quick templates (only for new tasks) */}
        {!isEdit && (
          <div>
            <p className="text-xs font-medium text-secondary-500 mb-2">Quick Add</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  onClick={() => handleQuickTemplate(t)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="What needs to be done?"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Additional details..."
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            options={CATEGORIES}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => update('priority', e.target.value)}
            options={PRIORITIES}
          />
        </div>
        <Select
          label="Assign To"
          value={form.assignedToId}
          onChange={(e) => update('assignedToId', e.target.value)}
          options={assigneeOptions}
        />
        <Input
          label="Due Date"
          type="datetime-local"
          value={form.dueDate}
          onChange={(e) => update('dueDate', e.target.value)}
        />
        {isEdit && (
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            options={STATUSES}
          />
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button onClick={handleSave} fullWidth loading={saving}>
            {isEdit ? 'Update' : 'Create Task'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
