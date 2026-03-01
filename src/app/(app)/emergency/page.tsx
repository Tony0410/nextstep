'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit2, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { EmergencyCard } from '@/components/emergency/EmergencyCard'
import { LoadingState } from '@/components/ui'
import { useApp } from '../provider'

export default function EmergencyPage() {
  const router = useRouter()
  const { currentWorkspace } = useApp()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch workspace from IndexedDB for offline access
  const workspace = useLiveQuery(
    () => db.workspaces.get(currentWorkspace.id),
    [currentWorkspace.id]
  )

  // Fetch active medications
  const medications = useLiveQuery(
    () =>
      db.medications
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((m) => m.active && !m.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  if (!workspace) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <LoadingState message="Loading emergency info..." />
      </div>
    )
  }

  const emergencyInfo = {
    patientName: workspace.patientName,
    patientDOB: workspace.patientDOB,
    bloodType: workspace.bloodType,
    allergies: workspace.allergies,
    medicalConditions: workspace.medicalConditions,
    primaryPhysician: workspace.primaryPhysician,
    physicianPhone: workspace.physicianPhone,
    clinicPhone: workspace.clinicPhone,
    emergencyPhone: workspace.emergencyPhone,
  }

  const hasInfo = emergencyInfo.patientName || emergencyInfo.bloodType ||
    emergencyInfo.allergies || emergencyInfo.medicalConditions

  const medsList = medications?.map(m => ({
    name: m.name,
    instructions: m.instructions,
  })) || []

  return (
    <div className={`min-h-screen paper-texture transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-alert-500 to-alert-600 text-white safe-area-top sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back</span>
          </button>
          
          {currentWorkspace.role !== 'VIEWER' && (
            <button
              onClick={() => router.push('/settings/emergency')}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <span className="font-medium">Edit</span>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Edit2 className="w-5 h-5" />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 pb-24">
        {hasInfo ? (
          <div className="animate-fade-up">
            <EmergencyCard info={emergencyInfo} medications={medsList} />
          </div>
        ) : (
          <div className="section-warm text-center py-12 animate-fade-up">
            <div className="w-20 h-20 rounded-full bg-alert-100 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-alert-400" />
            </div>
            
            <h2 className="font-display text-2xl text-secondary-900 mb-3">
              No Emergency Info Set
            </h2>
            
            <p className="text-secondary-600 mb-8 max-w-sm mx-auto">
              Add important medical information that could be crucial in an emergency situation.
            </p>
            
            {currentWorkspace.role !== 'VIEWER' && (
              <button
                onClick={() => router.push('/settings/emergency')}
                className="btn-primary"
              >
                Add Emergency Info
              </button>
            )}
          </div>
        )}
      </div>

      {/* Offline indicator */}
      <div className="fixed bottom-6 left-6 right-6">
        <div className="bg-primary-50 border border-primary-200 rounded-card p-4 text-center shadow-elevated">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <p className="text-sm text-primary-700 font-medium">
              This information is available offline
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
