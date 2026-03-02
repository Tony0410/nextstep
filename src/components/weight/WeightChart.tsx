'use client'

import { useMemo } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface WeightReading {
  weightKg: number
  recordedAt: string
}

interface WeightChartProps {
  readings: WeightReading[]
  days?: number
}

export function WeightChart({ readings, days = 30 }: WeightChartProps) {
  const chartData = useMemo(() => {
    const now = new Date()
    const points: { date: string; label: string; weight: number | null }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const dayReadings = readings.filter((r) => {
        const d = new Date(r.recordedAt)
        return d >= dayStart && d <= dayEnd
      })

      const avg = dayReadings.length > 0
        ? dayReadings.reduce((sum, r) => sum + r.weightKg, 0) / dayReadings.length
        : null

      points.push({ date: format(date, 'MMM d'), label: format(date, 'd'), weight: avg })
    }

    return points
  }, [readings, days])

  const validPoints = chartData.filter((p) => p.weight !== null)
  if (validPoints.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-secondary-400">
        Need at least 2 readings to show trend
      </div>
    )
  }

  const weights = validPoints.map((p) => p.weight!)
  const minW = Math.min(...weights) - 1
  const maxW = Math.max(...weights) + 1
  const range = maxW - minW || 1

  const width = 300
  const height = 120
  const padding = { top: 10, right: 10, bottom: 20, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Build SVG path from valid points
  let pathPoints: { x: number; y: number; weight: number }[] = []
  validPoints.forEach((p) => {
    const idx = chartData.indexOf(p)
    const x = padding.left + (idx / (chartData.length - 1)) * chartW
    const y = padding.top + chartH - ((p.weight! - minW) / range) * chartH
    pathPoints.push({ x, y, weight: p.weight! })
  })

  const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Line */}
        <path d={pathD} fill="none" stroke="currentColor" className="text-primary-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {pathPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" className="fill-primary-500" />
        ))}
        {/* Min/Max labels */}
        <text x={padding.left} y={height - 2} className="text-[8px] fill-secondary-400">{minW.toFixed(0)}kg</text>
        <text x={width - padding.right} y={height - 2} className="text-[8px] fill-secondary-400" textAnchor="end">{maxW.toFixed(0)}kg</text>
      </svg>
      <div className="flex justify-between text-xs text-secondary-400 mt-1 px-1">
        <span>{chartData[0]?.date}</span>
        <span>{chartData[chartData.length - 1]?.date}</span>
      </div>
    </div>
  )
}
