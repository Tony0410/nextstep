'use client'

import { format } from 'date-fns'
import { Scale } from 'lucide-react'

interface WeightReading {
  id: string
  weightKg: number
  notes: string | null
  recordedAt: string
  createdBy?: { id: string; name: string }
}

interface WeightCardProps {
  reading: WeightReading
  previousKg?: number | null
}

export function WeightCard({ reading, previousKg }: WeightCardProps) {
  const diff = previousKg != null ? reading.weightKg - previousKg : null
  const lbs = (reading.weightKg * 2.20462).toFixed(1)

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-50 border border-primary-200 text-primary-600">
          <Scale className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-secondary-900">
              {reading.weightKg.toFixed(1)} kg
            </span>
            <span className="text-sm text-secondary-400">({lbs} lbs)</span>
            {diff !== null && diff !== 0 && (
              <span className={`text-sm font-medium ${diff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
              </span>
            )}
          </div>
          <p className="text-sm text-secondary-500 mt-0.5">
            {format(new Date(reading.recordedAt), "EEEE, MMM d 'at' h:mm a")}
            {reading.createdBy && ` • ${reading.createdBy.name}`}
          </p>
          {reading.notes && (
            <p className="text-sm text-secondary-600 mt-2">{reading.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
