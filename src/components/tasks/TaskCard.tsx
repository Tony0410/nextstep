'use client'

import { format, isPast } from 'date-fns'
import { CheckCircle2, Circle, User } from 'lucide-react'

interface TaskData {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  dueDate: string | null
  completedAt: string | null
  assignedTo?: { id: string; name: string } | null
  createdBy?: { id: string; name: string }
}

interface TaskCardProps {
  task: TaskData
  onComplete?: (id: string) => void
  onEdit?: (task: TaskData) => void
}

const CATEGORY_BADGES: Record<string, string> = {
  MEDICAL: 'bg-blue-100 text-blue-700',
  ERRANDS: 'bg-purple-100 text-purple-700',
  MEALS: 'bg-orange-100 text-orange-700',
  EMOTIONAL: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-secondary-100 text-secondary-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  MEDICAL: 'Medical',
  ERRANDS: 'Errands',
  MEALS: 'Meals',
  EMOTIONAL: 'Emotional',
  OTHER: 'Other',
}

const PRIORITY_DOTS: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  NORMAL: 'bg-blue-500',
  LOW: 'bg-secondary-400',
}

const PRIORITY_BORDERS: Record<string, string> = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  NORMAL: 'border-l-blue-500',
  LOW: 'border-l-secondary-300',
}

export function TaskCard({ task, onComplete, onEdit }: TaskCardProps) {
  const isDone = task.status === 'DONE'
  const isOverdue = task.dueDate && !isDone && isPast(new Date(task.dueDate))
  const priorityDot = PRIORITY_DOTS[task.priority] || PRIORITY_DOTS.NORMAL
  const priorityBorder = PRIORITY_BORDERS[task.priority] || PRIORITY_BORDERS.NORMAL
  const categoryBadge = CATEGORY_BADGES[task.category] || CATEGORY_BADGES.OTHER
  const categoryLabel = CATEGORY_LABELS[task.category] || task.category

  return (
    <div
      className={`bg-surface rounded-lg border border-border border-l-4 ${priorityBorder} p-4 cursor-pointer hover:shadow-card-hover transition-shadow`}
      onClick={() => onEdit?.(task)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (!isDone) onComplete?.(task.id)
          }}
          className="flex-shrink-0 mt-0.5"
          aria-label={isDone ? 'Completed' : 'Mark as done'}
        >
          {isDone ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <Circle className="w-6 h-6 text-secondary-300" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold truncate ${isDone ? 'line-through text-secondary-400' : 'text-secondary-900'}`}>
              {task.title}
            </h3>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot}`} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryBadge}`}>
              {categoryLabel}
            </span>

            {task.dueDate && (
              <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-secondary-500'}`}>
                {isOverdue ? 'Overdue: ' : 'Due: '}
                {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assignedTo && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700">
                  {task.assignedTo.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-secondary-500">{task.assignedTo.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
