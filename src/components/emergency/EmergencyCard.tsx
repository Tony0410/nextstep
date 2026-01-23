'use client'

import { Phone, User, Droplets, AlertTriangle, Activity, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'

interface EmergencyInfo {
  patientName: string | null
  patientDOB: string | null
  bloodType: string | null
  allergies: string | null
  medicalConditions: string | null
  primaryPhysician: string | null
  physicianPhone: string | null
  clinicPhone: string | null
  emergencyPhone: string | null
}

interface EmergencyCardProps {
  info: EmergencyInfo
  medications?: { name: string; instructions: string | null }[]
  variant?: 'full' | 'compact'
}

export function EmergencyCard({ info, medications, variant = 'full' }: EmergencyCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const hasEmergencyInfo = info.patientName || info.bloodType || info.allergies ||
    info.medicalConditions || info.primaryPhysician

  if (!hasEmergencyInfo && variant === 'compact') {
    return null
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Emergency Information</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Patient Info */}
        {info.patientName && (
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Patient Name</p>
              <p className="text-lg font-bold text-secondary-900">{info.patientName}</p>
              {info.patientDOB && (
                <p className="text-sm text-secondary-600">DOB: {formatDate(info.patientDOB)}</p>
              )}
            </div>
          </div>
        )}

        {/* Blood Type */}
        {info.bloodType && (
          <div className="flex items-start gap-3">
            <Droplets className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Blood Type</p>
              <p className="text-2xl font-bold text-red-600">{info.bloodType}</p>
            </div>
          </div>
        )}

        {/* Allergies - High visibility */}
        {info.allergies && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-bold uppercase">Allergies</p>
                <p className="text-secondary-900 font-medium mt-1">{info.allergies}</p>
              </div>
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {info.medicalConditions && (
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Medical Conditions</p>
              <p className="text-secondary-900">{info.medicalConditions}</p>
            </div>
          </div>
        )}

        {/* Current Medications */}
        {variant === 'full' && medications && medications.length > 0 && (
          <div className="border-t border-red-200 pt-4">
            <p className="text-sm text-red-700 font-bold mb-2">Current Medications</p>
            <ul className="space-y-1">
              {medications.map((med, i) => (
                <li key={i} className="text-secondary-900">
                  <span className="font-medium">{med.name}</span>
                  {med.instructions && (
                    <span className="text-secondary-600"> - {med.instructions}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Doctor Info */}
        {info.primaryPhysician && (
          <div className="border-t border-red-200 pt-4">
            <div className="flex items-start gap-3">
              <Stethoscope className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">Primary Physician</p>
                <p className="text-secondary-900 font-medium">{info.primaryPhysician}</p>
                {info.physicianPhone && (
                  <a
                    href={`tel:${info.physicianPhone}`}
                    className="text-primary-600 hover:underline"
                  >
                    {info.physicianPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {(info.clinicPhone || info.emergencyPhone) && (
          <div className="border-t border-red-200 pt-4 space-y-3">
            <p className="text-sm text-red-700 font-bold">Emergency Contacts</p>

            {info.clinicPhone && (
              <a
                href={`tel:${info.clinicPhone}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-secondary-900">Call Clinic</p>
                  <p className="text-sm text-secondary-600">{info.clinicPhone}</p>
                </div>
              </a>
            )}

            {info.emergencyPhone && (
              <a
                href={`tel:${info.emergencyPhone}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-secondary-900">Emergency Contact</p>
                  <p className="text-sm text-secondary-600">{info.emergencyPhone}</p>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
