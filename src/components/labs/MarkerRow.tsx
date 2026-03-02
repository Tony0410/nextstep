'use client'

interface MarkerData {
  marker: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
  flag: string | null
}

interface MarkerRowProps {
  marker: MarkerData
}

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'L' },
  HIGH: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'H' },
  CRITICAL_LOW: { bg: 'bg-red-50', text: 'text-red-700', label: 'LL' },
  CRITICAL_HIGH: { bg: 'bg-red-50', text: 'text-red-700', label: 'HH' },
}

export function MarkerRow({ marker: m }: MarkerRowProps) {
  const flagStyle = m.flag ? FLAG_STYLES[m.flag] : null
  const hasRange = m.refMin !== null || m.refMax !== null
  const rangeText = hasRange
    ? `${m.refMin ?? '—'} – ${m.refMax ?? '—'}`
    : '—'

  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${flagStyle?.bg || ''}`}>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${flagStyle?.text || 'text-secondary-900'}`}>
          {m.marker}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold tabular-nums ${flagStyle?.text || 'text-secondary-900'}`}>
          {m.value} {m.unit}
        </span>
        <span className="text-xs text-secondary-400 w-24 text-right tabular-nums">
          {rangeText}
        </span>
        {flagStyle && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${flagStyle.bg} ${flagStyle.text}`}>
            {flagStyle.label}
          </span>
        )}
        {!flagStyle && hasRange && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-600">
            N
          </span>
        )}
      </div>
    </div>
  )
}
