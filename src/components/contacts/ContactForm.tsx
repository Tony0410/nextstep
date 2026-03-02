'use client'

import { useState } from 'react'
import { Modal, Button, Input, Select, showToast } from '@/components/ui'

const CATEGORIES = [
  { value: 'ONCOLOGY', label: 'Oncology' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OTHER', label: 'Other' },
]

interface ContactFormData {
  name: string
  role: string
  category: string
  phone: string
  phone2: string
  email: string
  address: string
  hours: string
  notes: string
  isEmergency: boolean
}

interface ContactFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  workspaceId: string
  initialData?: Partial<ContactFormData> & { id?: string }
}

export function ContactForm({ open, onClose, onSaved, workspaceId, initialData }: ContactFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ContactFormData>({
    name: initialData?.name || '',
    role: initialData?.role || '',
    category: initialData?.category || 'ONCOLOGY',
    phone: initialData?.phone || '',
    phone2: initialData?.phone2 || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    hours: initialData?.hours || '',
    notes: initialData?.notes || '',
    isEmergency: initialData?.isEmergency || false,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.phone.trim()) {
      showToast('Name, role, and phone are required', 'error')
      return
    }

    setSaving(true)
    try {
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/contacts/${initialData!.id}`
        : `/api/workspaces/${workspaceId}/contacts`
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          role: form.role.trim(),
          category: form.category,
          phone: form.phone.trim(),
          phone2: form.phone2.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          hours: form.hours.trim() || null,
          notes: form.notes.trim() || null,
          isEmergency: form.isEmergency,
        }),
      })

      if (!response.ok) throw new Error('Failed to save contact')
      showToast(isEdit ? 'Contact updated' : 'Contact added', 'success')
      onSaved()
      onClose()
    } catch {
      showToast('Failed to save contact', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof ContactFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <Modal isOpen={open} onClose={onClose} title={isEdit ? 'Edit Contact' : 'Add Contact'}>
      <div className="space-y-4">
        <Input label="Name *" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Dr. Smith" />
        <Input label="Role *" value={form.role} onChange={(e) => update('role', e.target.value)} placeholder="Oncologist" />
        <Select label="Category" value={form.category} onChange={(e) => update('category', e.target.value)} options={CATEGORIES} />
        <Input label="Phone *" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+61 2 1234 5678" type="tel" />
        <Input label="Secondary Phone" value={form.phone2} onChange={(e) => update('phone2', e.target.value)} placeholder="Optional" type="tel" />
        <Input label="Email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Optional" type="email" />
        <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Optional" />
        <Input label="Hours" value={form.hours} onChange={(e) => update('hours', e.target.value)} placeholder="Mon-Fri 8am-5pm" />
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Additional info..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none"
          />
        </div>
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={form.isEmergency}
            onChange={(e) => update('isEmergency', e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary-500 focus:ring-primary-200"
          />
          <span className="text-sm font-medium text-secondary-700">Mark as Emergency Contact</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button onClick={handleSave} fullWidth loading={saving}>
            {isEdit ? 'Update' : 'Add Contact'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
