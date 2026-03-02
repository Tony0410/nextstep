'use client'

import { format } from 'date-fns'
import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface MilestoneData {
  id: string
  type: string
  title: string
  description: string | null
  plannedDate: string
  actualDate: string | null
  status: string
  notes: string | null
}

interface MilestoneCardProps {
  milestone: MilestoneData
  onEdit?: (milestone: MilestoneData) => void
  onStatusChange?: (id: string, status: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  SCHEDULED: 'bg-blue-500',
  DELAYED: 'bg-orange-500',
  CANCELLED: 'bg-secondary-400',
}

const TYPE_BADGES: Record<string, string> = {
  CHEMO_CYCLE: 'bg-blue-100 text-blue-700',
  SURGERY: 'bg-orange-100 text-orange-700',
  RADIATION: 'bg-purple-100 text-purple-700',
  SCAN: 'bg-green-100 text-green-700',
  CONSULTATION: 'bg-secondary-100 text-secondary-700',
  OTHER: 'bg-secondary-100 text-secondary-700',
}

const TYPE_LABELS: Record<string, string> = {
  CHEMO_CYCLE: 'Chemo Cycle',
  SURGERY: 'Surgery',
  RADIATION: 'Radiation',
  SCAN: 'Scan',
  CONSULTATION: 'Consultation',
  OTHER: 'Other',
}

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function MilestoneCard({ milestone, onEdit, onStatusChange }: MilestoneCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const statusColor = STATUS_COLORS[milestone.status] || STATUS_COLORS.SCHEDULED
  const typeBadge = TYPE_BADGES[milestone.type] || TYPE_BADGES.OTHER
  const typeLabel = TYPE_LABELS[milestone.type] || milestone.type
  const dateStr = format(new Date(milestone.plannedDate), 'MMM d, yyyy')

  return (
    <div
      className="bg-surface rounded-lg border border-border p-4 cursor-pointer hover:shadow-card-hover transition-shadow"
      onClick={() => onEdit?.(milestone)}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-1">
          {milestone.status === 'COMPLETED' ? (
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className={`w-6 h-6 rounded-full ${statusColor} opacity-60`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-secondary-900 truncate">{milestone.title}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge}`}>
              {typeLabel}
            </span>
          </div>
          <p className="text-sm text-secondary-500">{dateStr}</p>
          {milestone.notes && (
            <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{milestone.notes}</p>
          )}
        </div>

        {/* Quick status change */}
        {onStatusChange && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowStatusMenu(!showStatusMenu)
              }}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Change status"
            >
              <ChevronDown className="w-4 h-4 text-secondary-400" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-8 z-10 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(milestone.id, opt.value)
                      setShowStatusMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      milestone.status === opt.value ? 'font-semibold text-primary-600' : 'text-secondary-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
