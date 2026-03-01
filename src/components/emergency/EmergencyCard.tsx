'use client'

import { Phone, User, Droplets, AlertTriangle, Activity, Stethoscope, HeartPulse, FileText } from 'lucide-react'
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
    <div className="bg-surface border-2 border-alert-200 rounded-card-lg overflow-hidden shadow-elevated">
      {/* Header */}
      <div className="bg-gradient-to-r from-alert-500 to-alert-600 text-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display text-2xl">Emergency Information</h2>
            <p className="text-alert-100 text-sm">Critical medical details for emergencies</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Patient Info */}
        {info.patientName && (
          <div className="flex items-start gap-4 bg-cream-50 rounded-card p-4 border border-cream-200">
            <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-cream-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-secondary-500 uppercase tracking-wide font-semibold mb-1">
                Patient
              </p>
              <p className="font-display text-xl text-secondary-900">{info.patientName}</p>
              {info.patientDOB && (
                <p className="text-sm text-secondary-600 mt-1">
                  Born: {formatDate(info.patientDOB)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Blood Type - Large and prominent */}
        {info.bloodType && (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-alert-100 to-alert-200 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-alert-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500 uppercase tracking-wide font-semibold">
                Blood Type
              </p>
              <p className="text-3xl font-display text-alert-600">{info.bloodType}</p>
            </div>
          </div>
        )}

        {/* Allergies - High visibility */}
        {info.allergies && (
          <div className="bg-alert-50 border-l-4 border-alert-500 rounded-r-card p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-alert-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-alert-700 font-bold uppercase tracking-wide mb-2">
                  Allergies
                </p>
                <p className="text-secondary-900 font-medium text-lg">{info.allergies}</p>
              </div>
            </div>
          </div>
        )}

        {/* Medical Conditions */}
        {info.medicalConditions && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-secondary-500 uppercase tracking-wide font-semibold mb-1">
                Medical Conditions
              </p>
              <p className="text-secondary-900">{info.medicalConditions}</p>
            </div>
          </div>
        )}

        {/* Current Medications */}
        {variant === 'full' && medications && medications.length > 0 && (
          <div className="border-t-2 border-cream-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary-500" />
              <p className="text-sm text-secondary-700 font-semibold uppercase tracking-wide">
                Current Medications
              </p>
            </div>
            <div className="bg-cream-50 rounded-card p-4 border border-cream-200">
              <ul className="space-y-3">
                {medications.map((med, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-secondary-900">{med.name}</span>
                      {med.instructions && (
                        <span className="text-secondary-600"> — {med.instructions}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Doctor Info */}
        {info.primaryPhysician && (
          <div className="border-t-2 border-cream-200 pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-secondary-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-secondary-500 uppercase tracking-wide font-semibold mb-1">
                  Primary Physician
                </p>
                <p className="font-display text-lg text-secondary-900">{info.primaryPhysician}</p>
                {info.physicianPhone && (
                  <a
                    href={`tel:${info.physicianPhone}`}
                    className="inline-flex items-center gap-2 mt-2 text-primary-600 font-medium hover:text-primary-700 hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {info.physicianPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {(info.clinicPhone || info.emergencyPhone) && (
          <div className="border-t-2 border-cream-200 pt-6">
            <p className="text-sm text-secondary-700 font-semibold uppercase tracking-wide mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-alert-500" />
              Emergency Contacts
            </p>
            <div className="grid gap-3">
              {info.clinicPhone && (
                <a
                  href={`tel:${info.clinicPhone}`}
                  className="flex items-center gap-4 p-4 bg-alert-50 rounded-card border border-alert-200 hover:bg-alert-100 hover:border-alert-300 hover:shadow-soft transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-alert-500 to-alert-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 text-lg">Call Clinic</p>
                    <p className="text-alert-600 font-medium">{info.clinicPhone}</p>
                  </div>
                </a>
              )}

              {info.emergencyPhone && (
                <a
                  href={`tel:${info.emergencyPhone}`}
                  className="flex items-center gap-4 p-4 bg-cream-50 rounded-card border border-cream-200 hover:bg-cream-100 hover:border-cream-300 hover:shadow-soft transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900 text-lg">Emergency Contact</p>
                    <p className="text-secondary-600 font-medium">{info.emergencyPhone}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
