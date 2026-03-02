'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface TrendPoint {
  date: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
}

interface LabTrendChartProps {
  marker: string
  workspaceId: string
}

export function LabTrendChart({ marker, workspaceId }: LabTrendChartProps) {
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!marker) return
    setLoading(true)
    fetch(`/api/workspaces/${workspaceId}/lab-results/trends?marker=${encodeURIComponent(marker)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.trendData) setData(json.trendData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [marker, workspaceId])

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-secondary-400 text-sm">
        Loading trend data...
      </div>
    )
  }

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-secondary-400 text-sm">
        Need at least 2 data points for a trend chart
      </div>
    )
  }

  // Calculate chart dimensions
  const chartWidth = 320
  const chartHeight = 160
  const padding = { top: 15, right: 15, bottom: 30, left: 50 }
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  // Scale calculations
  const values = data.map((d) => d.value)
  const refMin = data[0].refMin
  const refMax = data[0].refMax
  const allValues = [...values]
  if (refMin !== null) allValues.push(refMin)
  if (refMax !== null) allValues.push(refMax)

  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  const valueRange = dataMax - dataMin || 1
  const yMin = dataMin - valueRange * 0.1
  const yMax = dataMax + valueRange * 0.1
  const yRange = yMax - yMin

  const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * plotWidth
  const scaleY = (v: number) => padding.top + plotHeight - ((v - yMin) / yRange) * plotHeight

  // Build SVG path
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`)
    .join(' ')

  // Reference range rect
  const refRangeY = refMax !== null ? scaleY(refMax) : padding.top
  const refRangeHeight = refMin !== null && refMax !== null
    ? scaleY(refMin) - scaleY(refMax)
    : 0

  const unit = data[0].unit

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-sm mx-auto">
        {/* Reference range band */}
        {refMin !== null && refMax !== null && (
          <rect
            x={padding.left}
            y={refRangeY}
            width={plotWidth}
            height={refRangeHeight}
            fill="rgb(34 197 94 / 0.1)"
            stroke="rgb(34 197 94 / 0.2)"
            strokeWidth="0.5"
          />
        )}

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + frac * plotHeight
          const value = yMax - frac * yRange
          return (
            <g key={frac}>
              <line
                x1={padding.left} y1={y}
                x2={padding.left + plotWidth} y2={y}
                stroke="rgb(0 0 0 / 0.06)" strokeWidth="0.5"
              />
              <text
                x={padding.left - 5} y={y + 3}
                textAnchor="end" className="text-[8px] fill-secondary-400"
              >
                {value.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Data line */}
        <path d={linePath} fill="none" stroke="rgb(59 130 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(d.value)} r="4" fill="white" stroke="rgb(59 130 246)" strokeWidth="2" />
            {/* Date label on x-axis */}
            <text
              x={scaleX(i)} y={chartHeight - 5}
              textAnchor="middle" className="text-[7px] fill-secondary-400"
            >
              {format(new Date(d.date), 'M/d')}
            </text>
          </g>
        ))}

        {/* Unit label */}
        <text
          x={3} y={padding.top + plotHeight / 2}
          textAnchor="middle" className="text-[7px] fill-secondary-400"
          transform={`rotate(-90, 8, ${padding.top + plotHeight / 2})`}
        >
          {unit}
        </text>
      </svg>
    </div>
  )
}
