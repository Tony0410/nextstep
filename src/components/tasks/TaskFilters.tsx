'use client'

const FILTERS = [
  { value: 'mine', label: 'My Tasks' },
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
]

interface TaskFiltersProps {
  filter: string
  onFilterChange: (filter: string) => void
}

export function TaskFilters({ filter, onFilterChange }: TaskFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-touch ${
            filter === f.value
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-100 text-secondary-600'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
