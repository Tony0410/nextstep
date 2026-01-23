'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { Pill, Calendar, FileText, CheckCircle, XCircle, Plus, Edit2, Trash2, RefreshCw, HelpCircle } from 'lucide-react'

interface Activity {
  id: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
  user: { id: string; name: string }
}

interface ActivityItemProps {
  activity: Activity
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <Plus className="w-4 h-4" />,
  UPDATE: <Edit2 className="w-4 h-4" />,
  DELETE: <Trash2 className="w-4 h-4" />,
  TAKE_DOSE: <CheckCircle className="w-4 h-4" />,
  UNDO_DOSE: <XCircle className="w-4 h-4" />,
  MARK_ASKED: <HelpCircle className="w-4 h-4" />,
  REFILL: <RefreshCw className="w-4 h-4" />,
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  MEDICATION: <Pill className="w-5 h-5" />,
  APPOINTMENT: <Calendar className="w-5 h-5" />,
  NOTE: <FileText className="w-5 h-5" />,
  DOSE_LOG: <Pill className="w-5 h-5" />,
  WORKSPACE: <Edit2 className="w-5 h-5" />,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-600',
  UPDATE: 'bg-blue-100 text-blue-600',
  DELETE: 'bg-red-100 text-red-600',
  TAKE_DOSE: 'bg-primary-100 text-primary-600',
  UNDO_DOSE: 'bg-orange-100 text-orange-600',
  MARK_ASKED: 'bg-purple-100 text-purple-600',
  REFILL: 'bg-teal-100 text-teal-600',
}

function getActivityDescription(activity: Activity): string {
  const details = activity.details || {}
  const name = details.name || details.medicationName || details.title || 'item'

  switch (activity.action) {
    case 'CREATE':
      return `Added ${activity.entityType.toLowerCase()} "${name}"`
    case 'UPDATE':
      if (details.updated === 'emergency_info') {
        return 'Updated emergency information'
      }
      return `Updated ${activity.entityType.toLowerCase()} "${name}"`
    case 'DELETE':
      return `Deleted ${activity.entityType.toLowerCase()} "${name}"`
    case 'TAKE_DOSE':
      return `Took ${name}`
    case 'UNDO_DOSE':
      return `Undid dose of ${name}`
    case 'MARK_ASKED':
      return 'Marked question as asked'
    case 'REFILL':
      return `Refilled ${name} (+${details.amount} pills)`
    default:
      return `${activity.action} ${activity.entityType.toLowerCase()}`
  }
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const icon = ACTION_ICONS[activity.action] || <Edit2 className="w-4 h-4" />
  const entityIcon = ENTITY_ICONS[activity.entityType] || <FileText className="w-5 h-5" />
  const colorClass = ACTION_COLORS[activity.action] || 'bg-secondary-100 text-secondary-600'

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {entityIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-secondary-900">{getActivityDescription(activity)}</p>
        <p className="text-sm text-secondary-500 mt-0.5">
          {activity.user.name} • {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
    </div>
  )
}
