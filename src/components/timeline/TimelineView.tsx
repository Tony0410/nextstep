'use client'

import { format } from 'date-fns'
import { MilestoneCard } from './MilestoneCard'

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

interface TimelineViewProps {
  milestones: MilestoneData[]
  onEdit?: (milestone: MilestoneData) => void
  onStatusChange?: (id: string, status: string) => void
}

const STATUS_DOT_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  SCHEDULED: 'bg-blue-500',
  DELAYED: 'bg-orange-500',
  CANCELLED: 'bg-secondary-400',
}

export function TimelineView({ milestones, onEdit, onStatusChange }: TimelineViewProps) {
  const sorted = [...milestones].sort(
    (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
  )

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {sorted.map((milestone) => {
          const dotColor = STATUS_DOT_COLORS[milestone.status] || STATUS_DOT_COLORS.SCHEDULED
          const dateStr = format(new Date(milestone.plannedDate), 'MMM d, yyyy')

          return (
            <div key={milestone.id} className="relative flex gap-4">
              {/* Date + dot */}
              <div className="flex-shrink-0 w-10 flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full ${dotColor} border-2 border-surface z-10`} />
              </div>

              {/* Card */}
              <div className="flex-1 -mt-1">
                <p className="text-xs text-secondary-400 mb-1">{dateStr}</p>
                <MilestoneCard
                  milestone={milestone}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
