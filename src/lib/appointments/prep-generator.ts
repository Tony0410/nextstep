// Default checklist items for appointment preparation
export interface PrepItem {
  id: string
  label: string
  category: 'documents' | 'health' | 'comfort' | 'questions'
}

export const DEFAULT_PREP_ITEMS: PrepItem[] = [
  // Documents
  { id: 'insurance-card', label: 'Insurance card', category: 'documents' },
  { id: 'photo-id', label: 'Photo ID', category: 'documents' },
  { id: 'medication-list', label: 'Current medication list', category: 'documents' },
  { id: 'test-results', label: 'Recent test results', category: 'documents' },
  { id: 'referral', label: 'Referral letter (if needed)', category: 'documents' },

  // Health
  { id: 'take-meds', label: 'Take morning medications', category: 'health' },
  { id: 'symptoms-notes', label: 'Write down recent symptoms', category: 'health' },
  { id: 'blood-pressure', label: 'Record blood pressure', category: 'health' },

  // Comfort
  { id: 'snacks', label: 'Pack snacks and water', category: 'comfort' },
  { id: 'phone-charger', label: 'Phone charger', category: 'comfort' },
  { id: 'book-entertainment', label: 'Book or entertainment', category: 'comfort' },
  { id: 'comfortable-clothes', label: 'Comfortable clothing', category: 'comfort' },

  // Questions
  { id: 'questions-list', label: 'Prepare questions for doctor', category: 'questions' },
  { id: 'side-effects', label: 'Note medication side effects', category: 'questions' },
  { id: 'concerns', label: 'List any concerns', category: 'questions' },
]

export const CATEGORY_LABELS: Record<string, string> = {
  documents: 'Documents to Bring',
  health: 'Health Preparation',
  comfort: 'Comfort Items',
  questions: 'Questions & Notes',
}

export function getDefaultChecklistItems(): PrepItem[] {
  return [...DEFAULT_PREP_ITEMS]
}

export function groupItemsByCategory(items: PrepItem[]): Record<string, PrepItem[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, PrepItem[]>
  )
}
