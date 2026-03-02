'use client'

import { AlertTriangle } from 'lucide-react'

interface WeightAlertProps {
  currentKg: number
  previousKg: number
  timeframeHours: number
}

export function WeightAlert({ currentKg, previousKg, timeframeHours }: WeightAlertProps) {
  const diff = Math.abs(currentKg - previousKg)
  if (diff < 2) return null

  const direction = currentKg > previousKg ? 'gained' : 'lost'

  return (
    <div className="rounded-card p-4 border-2 bg-orange-50 border-orange-300">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-orange-800">Rapid Weight Change</h3>
          <p className="text-sm text-orange-700 mt-1">
            {direction} {diff.toFixed(1)} kg in the last {timeframeHours < 24 ? `${timeframeHours} hours` : `${Math.round(timeframeHours / 24)} days`}.
            Rapid changes may indicate fluid retention or other concerns — consider contacting your care team.
          </p>
        </div>
      </div>
    </div>
  )
}
