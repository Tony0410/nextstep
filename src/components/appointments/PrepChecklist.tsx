'use client'

import { useState, useEffect } from 'react'
import { Check, Square } from 'lucide-react'
import { clsx } from 'clsx'

import { Card, showToast } from '@/components/ui'
import {
  DEFAULT_PREP_ITEMS,
  CATEGORY_LABELS,
  groupItemsByCategory,
  type PrepItem,
} from '@/lib/appointments/prep-generator'

interface ChecklistState {
  [itemId: string]: boolean
}

interface PrepChecklistProps {
  workspaceId: string
  appointmentId: string
}

export function PrepChecklist({ workspaceId, appointmentId }: PrepChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<ChecklistState>({})
  const [loading, setLoading] = useState(true)
  const [customItems, setCustomItems] = useState<PrepItem[]>([])

  // Load checklist state from server
  useEffect(() => {
    async function loadChecklist() {
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceId}/appointments/${appointmentId}/checklist`
        )
        if (response.ok) {
          const data = await response.json()
          setCheckedItems(data.checkedItems || {})
          setCustomItems(data.customItems || [])
        }
      } catch (err) {
        console.error('Failed to load checklist:', err)
      } finally {
        setLoading(false)
      }
    }

    loadChecklist()
  }, [workspaceId, appointmentId])

  const handleToggle = async (itemId: string) => {
    const newChecked = !checkedItems[itemId]
    const newState = { ...checkedItems, [itemId]: newChecked }
    setCheckedItems(newState)

    // Save to server
    try {
      await fetch(
        `/api/workspaces/${workspaceId}/appointments/${appointmentId}/checklist`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedItems: newState }),
        }
      )
    } catch (err) {
      console.error('Failed to save checklist:', err)
      showToast('Failed to save', 'error')
    }
  }

  const allItems = [...DEFAULT_PREP_ITEMS, ...customItems]
  const groupedItems = groupItemsByCategory(allItems)
  const categories = ['documents', 'health', 'comfort', 'questions']

  // Calculate progress
  const totalItems = allItems.length
  const checkedCount = Object.values(checkedItems).filter(Boolean).length
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-secondary-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-secondary-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-secondary-700">Progress</span>
          <span className="text-sm font-semibold text-primary-600">
            {checkedCount} / {totalItems} items
          </span>
        </div>
        <div className="w-full bg-secondary-200 rounded-full h-3">
          <div
            className="bg-primary-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent === 100 && (
          <p className="text-sm text-green-600 font-medium mt-2 text-center">
            All set for your appointment!
          </p>
        )}
      </div>

      {/* Checklist items grouped by category */}
      {categories.map((category) => {
        const items = groupedItems[category] || []
        if (items.length === 0) return null

        return (
          <Card key={category}>
            <h3 className="text-sm font-semibold text-secondary-600 mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                    checkedItems[item.id]
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-secondary-50 hover:bg-secondary-100'
                  )}
                >
                  <div
                    className={clsx(
                      'w-6 h-6 rounded flex items-center justify-center flex-shrink-0',
                      checkedItems[item.id]
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-secondary-300'
                    )}
                  >
                    {checkedItems[item.id] && <Check className="w-4 h-4" />}
                  </div>
                  <span
                    className={clsx(
                      'flex-1',
                      checkedItems[item.id]
                        ? 'text-secondary-500 line-through'
                        : 'text-secondary-900'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
