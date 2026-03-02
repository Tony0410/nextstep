'use client'

import { AlertTriangle, Phone } from 'lucide-react'
import { Button } from '@/components/ui'

interface FeverAlertProps {
  tempCelsius: number
  clinicPhone?: string | null
}

export function FeverAlert({ tempCelsius, clinicPhone }: FeverAlertProps) {
  if (tempCelsius < 38.0) return null

  const isCritical = tempCelsius >= 38.5

  return (
    <div className={`rounded-card p-4 border-2 ${
      isCritical
        ? 'bg-red-50 border-red-300'
        : 'bg-orange-50 border-orange-300'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
          isCritical ? 'text-red-600' : 'text-orange-600'
        }`} />
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${
            isCritical ? 'text-red-800' : 'text-orange-800'
          }`}>
            {isCritical ? 'HIGH FEVER DETECTED' : 'FEVER DETECTED'}
          </h3>
          <p className={`text-sm mt-1 ${
            isCritical ? 'text-red-700' : 'text-orange-700'
          }`}>
            {tempCelsius.toFixed(1)}°C — {isCritical
              ? 'Contact your care team immediately.'
              : 'Monitor closely and contact your clinic if it persists.'}
          </p>
          {clinicPhone && (
            <Button
              variant={isCritical ? 'danger' : 'primary'}
              size="sm"
              className="mt-3"
              onClick={() => window.location.href = `tel:${clinicPhone}`}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Clinic
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
