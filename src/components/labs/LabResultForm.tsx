'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Button, Input, Select, Textarea, showToast } from '@/components/ui'
import { LAB_PANELS, computeFlag, type PanelMarker } from '@/lib/labs/panels'

interface MarkerFormRow {
  marker: string
  value: string
  unit: string
  refMin: string
  refMax: string
}

interface LabResultFormProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  workspaceId: string
  initialData?: {
    id?: string
    testDate?: string
    panelName?: string
    labName?: string | null
    results?: Array<{
      marker: string
      value: number
      unit: string
      refMin: number | null
      refMax: number | null
      flag: string | null
    }>
    notes?: string | null
  }
}

function markerToRow(m: PanelMarker): MarkerFormRow {
  return {
    marker: m.marker,
    value: '',
    unit: m.unit,
    refMin: m.refMin !== null ? String(m.refMin) : '',
    refMax: m.refMax !== null ? String(m.refMax) : '',
  }
}

function emptyRow(): MarkerFormRow {
  return { marker: '', value: '', unit: '', refMin: '', refMax: '' }
}

const panelOptions = LAB_PANELS.map((p) => ({ value: p.name, label: p.name }))

export function LabResultForm({ isOpen, onClose, onSaved, workspaceId, initialData }: LabResultFormProps) {
  const isEdit = !!initialData?.id

  const [testDate, setTestDate] = useState(
    initialData?.testDate
      ? new Date(initialData.testDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [panelName, setPanelName] = useState(initialData?.panelName || LAB_PANELS[0].name)
  const [labName, setLabName] = useState(initialData?.labName || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  const [rows, setRows] = useState<MarkerFormRow[]>(() => {
    if (initialData?.results) {
      return initialData.results.map((m) => ({
        marker: m.marker,
        value: String(m.value),
        unit: m.unit,
        refMin: m.refMin !== null ? String(m.refMin) : '',
        refMax: m.refMax !== null ? String(m.refMax) : '',
      }))
    }
    const panel = LAB_PANELS.find((p) => p.name === panelName)
    return panel?.markers.length ? panel.markers.map(markerToRow) : [emptyRow()]
  })

  const handlePanelChange = (name: string) => {
    setPanelName(name)
    const panel = LAB_PANELS.find((p) => p.name === name)
    if (panel && panel.markers.length > 0) {
      setRows(panel.markers.map(markerToRow))
    }
  }

  const updateRow = (index: number, field: keyof MarkerFormRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index))

  const handleSave = async () => {
    // Validate: at least one marker with a value
    const filledRows = rows.filter((r) => r.marker.trim() && r.value.trim())
    if (filledRows.length === 0) {
      showToast('Enter at least one marker value', 'error')
      return
    }

    setSaving(true)
    try {
      const results = filledRows.map((r) => {
        const value = parseFloat(r.value)
        const refMin = r.refMin ? parseFloat(r.refMin) : null
        const refMax = r.refMax ? parseFloat(r.refMax) : null
        const flag = computeFlag(value, refMin, refMax)
        return {
          marker: r.marker.trim(),
          value,
          unit: r.unit.trim(),
          refMin,
          refMax,
          flag,
        }
      })

      const url = isEdit
        ? `/api/workspaces/${workspaceId}/lab-results/${initialData!.id}`
        : `/api/workspaces/${workspaceId}/lab-results`
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate: new Date(testDate).toISOString(),
          panelName,
          labName: labName.trim() || null,
          results,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save lab result')
      showToast(isEdit ? 'Lab result updated' : 'Lab result saved', 'success')
      onSaved()
      onClose()
    } catch {
      showToast('Failed to save lab result', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Lab Result' : 'New Lab Result'}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Panel selector */}
        {!isEdit && (
          <Select
            label="Panel Template"
            value={panelName}
            onChange={(e) => handlePanelChange(e.target.value)}
            options={panelOptions}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Test Date *"
            type="datetime-local"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />
          <Input
            label="Lab Name"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="e.g. Quest"
          />
        </div>

        {/* Marker rows */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-secondary-700">Markers</p>
            <button
              onClick={addRow}
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.marker}
                    onChange={(e) => updateRow(i, 'marker', e.target.value)}
                    placeholder="Marker name"
                    className="flex-1"
                  />
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-secondary-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(i, 'value', e.target.value)}
                    placeholder="Value"
                    inputMode="decimal"
                  />
                  <Input
                    value={row.unit}
                    onChange={(e) => updateRow(i, 'unit', e.target.value)}
                    placeholder="Unit"
                  />
                  <Input
                    value={row.refMin}
                    onChange={(e) => updateRow(i, 'refMin', e.target.value)}
                    placeholder="Min"
                    inputMode="decimal"
                  />
                  <Input
                    value={row.refMax}
                    onChange={(e) => updateRow(i, 'refMax', e.target.value)}
                    placeholder="Max"
                    inputMode="decimal"
                  />
                </div>
              </div>
            ))}
          </div>
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
          <Button onClick={handleSave} fullWidth loading={saving}>
            {isEdit ? 'Update' : 'Save Results'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
