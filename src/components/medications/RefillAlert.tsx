'use client'

import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RefillAlertProps {
  medications: {
    id: string
    name: string
    pillCount: number | null
    refillThreshold: number | null
  }[]
}

export function RefillAlert({ medications }: RefillAlertProps) {
  const router = useRouter()

  const lowMeds = medications.filter(
    m => m.pillCount !== null && m.refillThreshold !== null && m.pillCount <= m.refillThreshold
  )

  if (lowMeds.length === 0) {
    return null
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-orange-800">
            {lowMeds.length === 1 ? 'Medication running low' : `${lowMeds.length} medications running low`}
          </p>
          <ul className="mt-1 space-y-1">
            {lowMeds.map(med => (
              <li key={med.id}>
                <button
                  onClick={() => router.push(`/meds/${med.id}`)}
                  className="text-sm text-orange-700 hover:text-orange-900 hover:underline"
                >
                  {med.name} - {med.pillCount} pills left
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
