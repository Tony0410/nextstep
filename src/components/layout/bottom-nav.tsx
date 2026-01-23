'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { Home, Calendar, Pill, Activity, MoreHorizontal } from 'lucide-react'

const navItems = [
  { href: '/today', label: 'Today', icon: Home },
  { href: '/appointments', label: 'Appts', icon: Calendar },
  { href: '/meds', label: 'Meds', icon: Pill },
  { href: '/symptoms', label: 'Symptoms', icon: Activity },
  { href: '/settings', label: 'More', icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border safe-area-bottom z-40">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/today' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center py-2 px-3 min-w-[64px] min-h-touch',
                'transition-colors duration-200',
                isActive
                  ? 'text-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              )}
            >
              <item.icon
                className={clsx('w-6 h-6 mb-0.5', isActive && 'stroke-[2.5]')}
              />
              <span className={clsx('text-xs', isActive && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
