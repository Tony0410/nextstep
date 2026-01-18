'use client'

import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { ChevronLeft, Plus } from 'lucide-react'

interface HeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
  rightAction?: {
    icon?: React.ReactNode
    label?: string
    onClick: () => void
  }
  className?: string
}

export function Header({
  title,
  showBack = false,
  backHref,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header
      className={clsx(
        'sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-border z-30',
        'safe-area-top',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Left side */}
        <div className="w-10">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6 text-secondary-700" />
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-secondary-900 truncate">
          {title}
        </h1>

        {/* Right side */}
        <div className="w-10 flex justify-end">
          {rightAction && (
            <button
              onClick={rightAction.onClick}
              className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
              aria-label={rightAction.label}
            >
              {rightAction.icon || <Plus className="w-6 h-6 text-secondary-700" />}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function PageContainer({ children, className, noPadding = false }: PageContainerProps) {
  return (
    <main
      className={clsx(
        'min-h-screen bg-background pb-20', // pb-20 for bottom nav
        !noPadding && 'px-4',
        className
      )}
    >
      <div className="max-w-lg mx-auto">{children}</div>
    </main>
  )
}
