'use client'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'ONCOLOGY', label: 'Oncology' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OTHER', label: 'Other' },
]

interface CategoryTabsProps {
  selected: string
  onChange: (category: string) => void
}

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-button text-sm font-medium transition-all border ${
            selected === cat.value
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-border text-secondary-600 hover:border-secondary-300'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
