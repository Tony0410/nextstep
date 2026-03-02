'use client'

import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { Card } from '@/components/ui'
import { MarkerRow } from './MarkerRow'

interface MarkerData {
  marker: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
  flag: string | null
}

interface LabResultData {
  id: string
  testDate: string
  panelName: string
  labName: string | null
  results: MarkerData[]
  notes: string | null
  createdBy?: { id: string; name: string }
}

interface LabResultCardProps {
  result: LabResultData
  onEdit?: (result: LabResultData) => void
}

export function LabResultCard({ result, onEdit }: LabResultCardProps) {
  const markers = result.results || []
  const flaggedCount = markers.filter((m) => m.flag).length
  const criticalCount = markers.filter((m) => m.flag?.startsWith('CRITICAL')).length

  return (
    <Card
      className="cursor-pointer hover:shadow-card-hover transition-shadow"
      onClick={() => onEdit?.(result)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary-900">{result.panelName}</h3>
              <p className="text-xs text-secondary-500">
                {format(new Date(result.testDate), 'MMM d, yyyy')}
                {result.labName && ` · ${result.labName}`}
              </p>
            </div>
          </div>
          {/* Flag summary */}
          <div className="flex gap-1.5">
            {criticalCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {criticalCount} critical
              </span>
            )}
            {flaggedCount > 0 && flaggedCount !== criticalCount && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                {flaggedCount - criticalCount} flagged
              </span>
            )}
            {flaggedCount === 0 && markers.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                All normal
              </span>
            )}
          </div>
        </div>

        {/* Marker rows */}
        <div className="space-y-1">
          {markers.map((m, i) => (
            <MarkerRow key={`${m.marker}-${i}`} marker={m} />
          ))}
        </div>

        {/* Notes */}
        {result.notes && (
          <p className="text-xs text-secondary-500 mt-3 italic">{result.notes}</p>
        )}
      </div>
    </Card>
  )
}
