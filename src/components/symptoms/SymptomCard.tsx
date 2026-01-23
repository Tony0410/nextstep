'use client'

import { format, formatDistanceToNow } from 'date-fns'

const SYMPTOM_INFO: Record<string, { emoji: string; label: string }> = {
  FATIGUE: { emoji: '😴', label: 'Fatigue' },
  NAUSEA: { emoji: '🤢', label: 'Nausea' },
  PAIN: { emoji: '😣', label: 'Pain' },
  APPETITE: { emoji: '🍽️', label: 'Appetite' },
  SLEEP: { emoji: '😴', label: 'Sleep' },
  MOOD: { emoji: '😔', label: 'Mood' },
  CUSTOM: { emoji: '📝', label: 'Custom' },
}

const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800 border-green-200',
  2: 'bg-lime-100 text-lime-800 border-lime-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  4: 'bg-orange-100 text-orange-800 border-orange-200',
  5: 'bg-red-100 text-red-800 border-red-200',
}

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Mild',
  3: 'Moderate',
  4: 'Severe',
  5: 'Extreme',
}

interface Symptom {
  id: string
  type: string
  customName: string | null
  severity: number
  notes: string | null
  recordedAt: string
  createdBy?: { id: string; name: string }
}

interface SymptomCardProps {
  symptom: Symptom
  compact?: boolean
}

export function SymptomCard({ symptom, compact = false }: SymptomCardProps) {
  const info = SYMPTOM_INFO[symptom.type] || SYMPTOM_INFO.CUSTOM
  const displayName = symptom.type === 'CUSTOM' && symptom.customName
    ? symptom.customName
    : info.label

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${SEVERITY_COLORS[symptom.severity]}`}>
        <span className="text-lg">{info.emoji}</span>
        <span className="font-medium">{displayName}</span>
        <span className="text-xs opacity-75">
          {formatDistanceToNow(new Date(symptom.recordedAt), { addSuffix: true })}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${SEVERITY_COLORS[symptom.severity]}`}>
          <span className="text-2xl">{info.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-secondary-900">{displayName}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[symptom.severity]}`}>
              {SEVERITY_LABELS[symptom.severity]}
            </span>
          </div>
          <p className="text-sm text-secondary-500 mt-0.5">
            {format(new Date(symptom.recordedAt), 'EEEE, MMM d \'at\' h:mm a')}
            {symptom.createdBy && ` • ${symptom.createdBy.name}`}
          </p>
          {symptom.notes && (
            <p className="text-sm text-secondary-600 mt-2">{symptom.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
