'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Modal, Button, Input, Select, Textarea, showToast } from '@/components/ui'

const CATEGORIES = [
  { value: 'LAB_REPORT', label: 'Lab Report' },
  { value: 'SCAN', label: 'Scan / Imaging' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'OTHER', label: 'Other' },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png'

interface DocumentUploadProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  workspaceId: string
}

export function DocumentUpload({ isOpen, onClose, onSaved, workspaceId }: DocumentUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [dateTaken, setDateTaken] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > MAX_FILE_SIZE) {
      showToast('File too large (max 10MB)', 'error')
      return
    }

    setFile(selected)
    if (!title) {
      // Auto-fill title from filename
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '))
    }
  }

  const handleSave = async () => {
    if (!file) {
      showToast('Please select a file', 'error')
      return
    }
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('category', category)
      if (dateTaken) formData.append('dateTaken', new Date(dateTaken).toISOString())
      if (expiryDate) formData.append('expiryDate', new Date(expiryDate).toISOString())
      if (notes.trim()) formData.append('notes', notes.trim())

      const response = await fetch(`/api/workspaces/${workspaceId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      showToast('Document uploaded', 'success')
      onSaved()
      handleReset()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setTitle('')
    setCategory('OTHER')
    setDateTaken('')
    setExpiryDate('')
    setNotes('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document">
      <div className="space-y-4">
        {/* File picker */}
        <div>
          <p className="text-sm font-medium text-secondary-700 mb-2">File *</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-card p-6 text-center hover:border-primary-300 transition-colors"
          >
            {file ? (
              <div>
                <p className="font-medium text-secondary-900">{file.name}</p>
                <p className="text-xs text-secondary-400 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB · Tap to change
                </p>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-secondary-300 mx-auto mb-2" />
                <p className="text-sm text-secondary-500">Tap to select a file</p>
                <p className="text-xs text-secondary-400 mt-1">PDF, JPG, or PNG · Max 10MB</p>
              </div>
            )}
          </button>
        </div>

        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Blood work results"
        />

        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={CATEGORIES}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date Taken"
            type="date"
            value={dateTaken}
            onChange={(e) => setDateTaken(e.target.value)}
          />
          <Input
            label="Expiry Date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={2}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button onClick={handleSave} fullWidth loading={saving}>Upload</Button>
        </div>
      </div>
    </Modal>
  )
}
