'use client'

import { format, subDays, startOfDay, isSameDay } from 'date-fns'

interface Symptom {
  id: string
  type: string
  severity: number
  recordedAt: string
}

interface SymptomChartProps {
  symptoms: Symptom[]
  days?: number
  type?: string
}

const SEVERITY_COLORS = [
  '#22c55e', // 1 - green
  '#84cc16', // 2 - lime
  '#eab308', // 3 - yellow
  '#f97316', // 4 - orange
  '#ef4444', // 5 - red
]

export function SymptomChart({ symptoms, days = 7, type }: SymptomChartProps) {
  // Generate date range
  const today = startOfDay(new Date())
  const dates = Array.from({ length: days }, (_, i) => subDays(today, days - 1 - i))

  // Filter by type if specified
  const filtered = type
    ? symptoms.filter(s => s.type === type)
    : symptoms

  // Group symptoms by date and calculate average severity
  const dataByDate = dates.map(date => {
    const daySymptoms = filtered.filter(s =>
      isSameDay(new Date(s.recordedAt), date)
    )
    const avgSeverity = daySymptoms.length > 0
      ? daySymptoms.reduce((sum, s) => sum + s.severity, 0) / daySymptoms.length
      : 0
    return {
      date,
      avgSeverity,
      count: daySymptoms.length,
    }
  })

  const maxHeight = 100

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-500">
        No symptom data to display
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Chart */}
      <div className="flex items-end gap-1 h-32">
        {dataByDate.map((day, i) => {
          const height = day.avgSeverity > 0 ? (day.avgSeverity / 5) * maxHeight : 4
          const colorIndex = day.avgSeverity > 0 ? Math.round(day.avgSeverity) - 1 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: day.avgSeverity > 0 ? SEVERITY_COLORS[colorIndex] : '#e5e7eb',
                  minHeight: day.avgSeverity > 0 ? '8px' : '4px',
                }}
                title={day.avgSeverity > 0 ? `Avg: ${day.avgSeverity.toFixed(1)}` : 'No data'}
              />
            </div>
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex gap-1">
        {dataByDate.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-secondary-500">
              {format(day.date, 'EEE')}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 text-xs text-secondary-500 pt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS[0] }} />
          <span>Minimal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS[2] }} />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS[4] }} />
          <span>Extreme</span>
        </div>
      </div>
    </div>
  )
}
