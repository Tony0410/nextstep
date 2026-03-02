'use client'

import { useState } from 'react'
import { Thermometer } from 'lucide-react'
import { Button, showToast } from '@/components/ui'

const METHODS = [
  { value: 'oral', label: 'Oral' },
  { value: 'forehead', label: 'Forehead' },
  { value: 'ear', label: 'Ear' },
  { value: 'armpit', label: 'Armpit' },
]

interface TempQuickLogProps {
  workspaceId: string
  onLogged?: () => void
}

export function TempQuickLog({ workspaceId, onLogged }: TempQuickLogProps) {
  const [temp, setTemp] = useState('')
  const [method, setMethod] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const tempValue = parseFloat(temp)
    if (isNaN(tempValue) || tempValue < 30 || tempValue > 45) {
      showToast('Enter a valid temperature (30-45°C)', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/temperature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempCelsius: tempValue,
          method: method || null,
          notes: notes.trim() || null,
        }),
      })
      if (!response.ok) throw new Error('Failed to log temperature')
      showToast('Temperature logged', 'success')
      setTemp('')
      setMethod(null)
      setNotes('')
      onLogged?.()
    } catch {
      showToast('Failed to log temperature', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Temperature Input */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Temperature</label>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="36.5"
            className="w-full px-4 py-4 text-3xl font-bold text-center border border-border rounded-card focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-secondary-400">°C</span>
        </div>
      </div>

      {/* Method Selection */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Method</label>
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(method === m.value ? null : m.value)}
              className={`py-2 px-3 rounded-button text-sm font-medium transition-all border ${
                method === m.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border text-secondary-600 hover:border-secondary-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any symptoms, time of day..."
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none"
        />
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} fullWidth loading={saving}>
        <Thermometer className="w-5 h-5 mr-2" />
        Log Temperature
      </Button>
    </div>
  )
}
