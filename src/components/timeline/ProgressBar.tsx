'use client'

interface ProgressBarProps {
  milestones: Array<{ status: string }>
}

export function ProgressBar({ milestones }: ProgressBarProps) {
  const active = milestones.filter((m) => m.status !== 'CANCELLED')
  const completed = active.filter((m) => m.status === 'COMPLETED')
  const total = active.length
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-secondary-700">
          Cycle {completed.length} of {total} — {percent}% Complete
        </span>
      </div>
      <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
