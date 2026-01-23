'use client'

import { useState } from 'react'
import { Button, showToast } from '@/components/ui'

const SYMPTOM_TYPES = [
  { type: 'FATIGUE', emoji: '😴', label: 'Fatigue' },
  { type: 'NAUSEA', emoji: '🤢', label: 'Nausea' },
  { type: 'PAIN', emoji: '😣', label: 'Pain' },
  { type: 'APPETITE', emoji: '🍽️', label: 'Appetite' },
  { type: 'SLEEP', emoji: '😴', label: 'Sleep' },
  { type: 'MOOD', emoji: '😔', label: 'Mood' },
]

const SEVERITY_LABELS = [
  { value: 1, label: 'Minimal', color: 'bg-green-500' },
  { value: 2, label: 'Mild', color: 'bg-lime-500' },
  { value: 3, label: 'Moderate', color: 'bg-yellow-500' },
  { value: 4, label: 'Severe', color: 'bg-orange-500' },
  { value: 5, label: 'Extreme', color: 'bg-red-500' },
]

interface SymptomQuickLogProps {
  workspaceId: string
  onLogged?: () => void
}

export function SymptomQuickLog({ workspaceId, onLogged }: SymptomQuickLogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [severity, setSeverity] = useState(3)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!selectedType) {
      showToast('Please select a symptom', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          severity,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to log symptom')

      showToast('Symptom logged', 'success')
      setSelectedType(null)
      setSeverity(3)
      setNotes('')
      onLogged?.()
    } catch {
      showToast('Failed to log symptom', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Symptom Type Selection */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          How are you feeling?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SYMPTOM_TYPES.map((symptom) => (
            <button
              key={symptom.type}
              type="button"
              onClick={() => setSelectedType(symptom.type)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                selectedType === symptom.type
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-border hover:border-secondary-300 hover:bg-muted'
              }`}
            >
              <span className="text-2xl">{symptom.emoji}</span>
              <span className="text-xs font-medium text-secondary-700">{symptom.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Slider */}
      {selectedType && (
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Severity: <span className="font-bold">{SEVERITY_LABELS[severity - 1].label}</span>
          </label>
          <div className="flex items-center gap-2">
            {SEVERITY_LABELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSeverity(level.value)}
                className={`flex-1 h-10 rounded-lg transition-all ${level.color} ${
                  severity === level.value
                    ? 'ring-2 ring-offset-2 ring-secondary-900 scale-110'
                    : 'opacity-40 hover:opacity-70'
                }`}
              >
                <span className="sr-only">{level.label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-secondary-500">
            <span>Minimal</span>
            <span>Extreme</span>
          </div>
        </div>
      )}

      {/* Notes */}
      {selectedType && (
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none"
          />
        </div>
      )}

      {/* Submit */}
      {selectedType && (
        <Button onClick={handleSubmit} fullWidth loading={saving}>
          Log Symptom
        </Button>
      )}
    </div>
  )
}
