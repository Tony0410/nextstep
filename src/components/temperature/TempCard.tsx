'use client'

import { format } from 'date-fns'
import { Thermometer } from 'lucide-react'

interface TempReading {
  id: string
  tempCelsius: number
  method: string | null
  notes: string | null
  recordedAt: string
  createdBy?: { id: string; name: string }
}

interface TempCardProps {
  reading: TempReading
}

function getTempColor(temp: number): string {
  if (temp >= 38.5) return 'text-red-600 bg-red-50 border-red-200'
  if (temp >= 38.0) return 'text-orange-600 bg-orange-50 border-orange-200'
  if (temp >= 37.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-green-600 bg-green-50 border-green-200'
}

export function TempCard({ reading }: TempCardProps) {
  const colorClass = getTempColor(reading.tempCelsius)

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${colorClass}`}>
          <Thermometer className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${reading.tempCelsius >= 38.0 ? 'text-red-600' : 'text-secondary-900'}`}>
              {reading.tempCelsius.toFixed(1)}°C
            </span>
            {reading.method && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600 capitalize">
                {reading.method}
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
