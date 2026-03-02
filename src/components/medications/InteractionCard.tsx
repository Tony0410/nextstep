'use client'

import { AlertTriangle, AlertOctagon, Info, XOctagon } from 'lucide-react'

interface InteractionData {
  drug1Name: string
  drug2Name: string
  severity: string
  description: string
  recommendation: string
}

interface InteractionCardProps {
  interaction: InteractionData
}

const SEVERITY_CONFIG: Record<string, {
  bg: string
  border: string
  text: string
  badge: string
  label: string
  Icon: typeof AlertTriangle
}> = {
  CONTRAINDICATED: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-600 text-white',
    label: 'Contraindicated',
    Icon: XOctagon,
  },
  MAJOR: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-500 text-white',
    label: 'Major',
    Icon: AlertOctagon,
  },
  MODERATE: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
    label: 'Moderate',
    Icon: AlertTriangle,
  },
  MINOR: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-500 text-white',
    label: 'Minor',
    Icon: Info,
  },
}

export function InteractionCard({ interaction }: InteractionCardProps) {
  const config = SEVERITY_CONFIG[interaction.severity] || SEVERITY_CONFIG.MINOR
  const { Icon } = config

  return (
    <div className={`rounded-card border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {/* Header with severity badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
          </div>

          {/* Drug names */}
          <p className={`font-semibold text-sm ${config.text}`}>
            {interaction.drug1Name} + {interaction.drug2Name}
          </p>

          {/* Description */}
          <p className="text-sm text-secondary-700 mt-1">{interaction.description}</p>

          {/* Recommendation */}
          <div className="mt-2 bg-white/50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-secondary-600">
              <span className="font-semibold">Recommendation:</span>{' '}
              {interaction.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
