'use client'

import { clsx } from 'clsx'
import { Calendar, Pill, FileText, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12', className)}>
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-secondary-500">{message}</p>
    </div>
  )
}

interface EmptyStateProps {
  type: 'appointments' | 'medications' | 'notes' | 'general'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  type,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const icons = {
    appointments: Calendar,
    medications: Pill,
    notes: FileText,
    general: AlertCircle,
  }

  const Icon = icons[type]

  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-secondary-400" />
      </div>
      <h3 className="text-lg font-semibold text-secondary-900 mb-1">{title}</h3>
      {description && (
        <p className="text-secondary-500 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We had trouble loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-secondary-900 mb-1">{title}</h3>
      <p className="text-secondary-500 max-w-xs mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  )
}

interface SyncBannerProps {
  hasConflict: boolean
  onDismiss: () => void
}

export function SyncBanner({ hasConflict, onDismiss }: SyncBannerProps) {
  if (!hasConflict) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          Updated on another device
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-sm text-amber-600 hover:text-amber-800 font-medium"
      >
        Dismiss
      </button>
    </div>
  )
}
