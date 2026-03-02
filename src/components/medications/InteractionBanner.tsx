'use client'

import { AlertTriangle } from 'lucide-react'

interface InteractionBannerProps {
  count: number
  hasMajor: boolean
  onClick?: () => void
}

export function InteractionBanner({ count, hasMajor, onClick }: InteractionBannerProps) {
  if (count === 0) return null

  const bgColor = hasMajor ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
  const textColor = hasMajor ? 'text-red-700' : 'text-yellow-700'
  const iconColor = hasMajor ? 'text-red-500' : 'text-yellow-500'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 border rounded-card p-3 ${bgColor} transition-shadow hover:shadow-card-hover`}
    >
      <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
      <div className="text-left">
        <p className={`text-sm font-semibold ${textColor}`}>
          {count} Drug Interaction{count !== 1 ? 's' : ''} Found
        </p>
        <p className="text-xs text-secondary-500">
          {hasMajor ? 'Includes major interactions — review with your care team' : 'Tap to review details'}
        </p>
      </div>
    </button>
  )
}
