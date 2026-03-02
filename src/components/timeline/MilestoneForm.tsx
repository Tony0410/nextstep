'use client'

import { useState } from 'react'
import { Modal, Button, Input, Select, showToast } from '@/components/ui'
import { Textarea } from '@/components/ui/input'

const TYPES = [
  { value: 'CHEMO_CYCLE', label: 'Chemo Cycle' },
  { value: 'SURGERY', label: 'Surgery' },
  { value: 'RADIATION', label: 'Radiation' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'OTHER', label: 'Other' },
]

const STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface MilestoneFormData {
  title: string
  type: string
  plannedDate: string
  status: string
  description: string
  notes: string
}

interface MilestoneFormProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  workspaceId: string
  initialData?: Partial<MilestoneFormData> & { id?: string }
}

export function MilestoneForm({ isOpen, onClose, onSaved, workspaceId, initialData }: MilestoneFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<MilestoneFormData>({
    title: initialData?.title || '',
    type: initialData?.type || 'CHEMO_CYCLE',
    plannedDate: initialData?.plannedDate
      ? new Date(initialData.plannedDate).toISOString().slice(0, 16)
      : '',
    status: initialData?.status || 'SCHEDULED',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    if (!form.plannedDate) {
      showToast('Planned date is required', 'error')
      return
    }

    setSaving(true)
    try {
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/milestones/${initialData!.id}`
        : `/api/workspaces/${workspaceId}/milestones`
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          plannedDate: new Date(form.plannedDate).toISOString(),
          status: form.status,
          description: form.description.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save milestone')
      showToast(isEdit ? 'Milestone updated' : 'Milestone added', 'success')
      onSaved()
      onClose()
    } catch {
      showToast('Failed to save milestone', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof MilestoneFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Milestone' : 'Add Milestone'}>
      <div className="space-y-4">
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Chemo Cycle 3"
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
          options={TYPES}
        />
        <Input
          label="Planned Date *"
          type="datetime-local"
          value={form.plannedDate}
          onChange={(e) => update('plannedDate', e.target.value)}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
          options={STATUSES}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Details about this milestone..."
          rows={2}
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Additional notes..."
          rows={2}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button onClick={handleSave} fullWidth loading={saving}>
            {isEdit ? 'Update' : 'Add Milestone'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
