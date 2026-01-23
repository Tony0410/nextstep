'use client'

interface ActivityFilterProps {
  entityType: string
  onEntityTypeChange: (type: string) => void
}

const ENTITY_TYPES = [
  { value: '', label: 'All' },
  { value: 'MEDICATION', label: 'Medications' },
  { value: 'APPOINTMENT', label: 'Appointments' },
  { value: 'NOTE', label: 'Notes' },
  { value: 'DOSE_LOG', label: 'Doses' },
]

export function ActivityFilter({ entityType, onEntityTypeChange }: ActivityFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {ENTITY_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => onEntityTypeChange(type.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            entityType === type.value
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  )
}
