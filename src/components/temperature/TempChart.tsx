'use client'

import { useMemo } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface TempReading {
  tempCelsius: number
  recordedAt: string
}

interface TempChartProps {
  readings: TempReading[]
  days?: number
}

export function TempChart({ readings, days = 7 }: TempChartProps) {
  const chartData = useMemo(() => {
    const now = new Date()
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const dayReadings = readings.filter((r) => {
        const d = new Date(r.recordedAt)
        return d >= dayStart && d <= dayEnd
      })

      const avg = dayReadings.length > 0
        ? dayReadings.reduce((sum, r) => sum + r.tempCelsius, 0) / dayReadings.length
        : null

      result.push({
        label: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        avg,
        count: dayReadings.length,
      })
    }

    return result
  }, [readings, days])

  const maxTemp = 40
  const minTemp = 35

  return (
    <div className="py-2">
      <div className="flex items-end gap-2 h-32">
        {chartData.map((day, i) => {
          const heightPercent = day.avg
            ? Math.max(5, ((day.avg - minTemp) / (maxTemp - minTemp)) * 100)
            : 0

          const barColor = day.avg
            ? day.avg >= 38.5 ? 'bg-red-400' : day.avg >= 38.0 ? 'bg-orange-400' : day.avg >= 37.5 ? 'bg-yellow-400' : 'bg-primary-400'
            : 'bg-secondary-100'

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-secondary-600">
                {day.avg ? `${day.avg.toFixed(1)}°` : '—'}
              </span>
              <div className="w-full flex items-end" style={{ height: '80px' }}>
                <div
                  className={`w-full rounded-t-md transition-all ${barColor}`}
                  style={{ height: `${heightPercent}%`, minHeight: day.avg ? '4px' : '0' }}
                />
              </div>
              <span className="text-xs text-secondary-500">{day.label}</span>
            </div>
          )
        })}
      </div>
      {/* Fever threshold line label */}
      <div className="flex items-center gap-2 mt-3 text-xs text-secondary-400">
        <div className="w-3 h-0.5 bg-red-300" />
        <span>38.0°C fever threshold</span>
      </div>
    </div>
  )
}
