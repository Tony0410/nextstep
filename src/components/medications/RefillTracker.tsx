'use client'

import { useState } from 'react'
import { Pill, Plus, Minus, RefreshCw } from 'lucide-react'
import { Button, Input, Modal, showToast } from '@/components/ui'

interface RefillTrackerProps {
  medicationId: string
  workspaceId: string
  medicationName: string
  pillCount: number | null
  pillsPerDose: number | null
  refillThreshold: number | null
  onRefill?: () => void
}

export function RefillTracker({
  medicationId,
  workspaceId,
  medicationName,
  pillCount,
  pillsPerDose = 1,
  refillThreshold = 7,
  onRefill,
}: RefillTrackerProps) {
  const [showRefillModal, setShowRefillModal] = useState(false)
  const [refillAmount, setRefillAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const isLow = pillCount !== null && refillThreshold !== null && pillCount <= refillThreshold
  const dosesRemaining = pillCount !== null && pillsPerDose !== null
    ? Math.floor(pillCount / pillsPerDose)
    : null

  const handleRefill = async () => {
    const amount = parseInt(refillAmount, 10)
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/medications/${medicationId}/refill`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        }
      )

      if (!response.ok) throw new Error('Failed to refill')

      showToast(`Added ${amount} pills to ${medicationName}`, 'success')
      setShowRefillModal(false)
      setRefillAmount('')
      onRefill?.()
    } catch {
      showToast('Failed to record refill', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (pillCount === null) {
    return null
  }

  return (
    <>
      <div className={`rounded-lg p-4 ${isLow ? 'bg-orange-50 border border-orange-200' : 'bg-secondary-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLow ? 'bg-orange-100' : 'bg-secondary-100'}`}>
              <Pill className={`w-5 h-5 ${isLow ? 'text-orange-600' : 'text-secondary-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-secondary-900">
                {pillCount} pills remaining
              </p>
              {dosesRemaining !== null && (
                <p className={`text-sm ${isLow ? 'text-orange-600 font-medium' : 'text-secondary-500'}`}>
                  {dosesRemaining} doses left
                  {isLow && ' • Refill soon'}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={isLow ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowRefillModal(true)}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refill
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        title={`Refill ${medicationName}`}
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Enter the number of pills you're adding.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRefillAmount(String(Math.max(0, (parseInt(refillAmount) || 0) - 10)))}
              className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center hover:bg-secondary-200 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <Input
              type="number"
              value={refillAmount}
              onChange={(e) => setRefillAmount(e.target.value)}
              placeholder="0"
              className="text-center text-2xl font-bold"
              min={0}
            />
            <button
              type="button"
              onClick={() => setRefillAmount(String((parseInt(refillAmount) || 0) + 10))}
              className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center hover:bg-secondary-200 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-secondary-500 text-center">
            Current: {pillCount} pills
            {refillAmount && parseInt(refillAmount) > 0 && (
              <> → After refill: {pillCount + parseInt(refillAmount)} pills</>
            )}
          </p>
          <Button onClick={handleRefill} fullWidth loading={saving}>
            Record Refill
          </Button>
        </div>
      </Modal>
    </>
  )
}
