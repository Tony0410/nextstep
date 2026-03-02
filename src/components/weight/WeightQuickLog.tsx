'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import { Button, showToast } from '@/components/ui'

interface WeightQuickLogProps {
  workspaceId: string
  onLogged?: () => void
}

export function WeightQuickLog({ workspaceId, onLogged }: WeightQuickLogProps) {
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const weightValue = parseFloat(weight)
    if (isNaN(weightValue) || weightValue <= 0) {
      showToast('Enter a valid weight', 'error')
      return
    }

    const weightKg = unit === 'lbs' ? weightValue * 0.453592 : weightValue

    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg, notes: notes.trim() || null }),
      })
      if (!response.ok) throw new Error('Failed to log weight')
      showToast('Weight logged', 'success')
      setWeight('')
      setNotes('')
      onLogged?.()
    } catch {
      showToast('Failed to log weight', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Weight Input */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Weight</label>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={unit === 'kg' ? '70.0' : '154.0'}
            className="w-full px-4 py-4 text-3xl font-bold text-center border border-border rounded-card focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setUnit('kg')}
              className={`px-3 py-1 text-sm font-medium ${unit === 'kg' ? 'bg-primary-500 text-white' : 'text-secondary-500'}`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => setUnit('lbs')}
              className={`px-3 py-1 text-sm font-medium ${unit === 'lbs' ? 'bg-primary-500 text-white' : 'text-secondary-500'}`}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Morning weight, before meals..."
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 resize-none"
        />
      </div>

      <Button onClick={handleSubmit} fullWidth loading={saving}>
        <Scale className="w-5 h-5 mr-2" />
        Log Weight
      </Button>
    </div>
  )
}
