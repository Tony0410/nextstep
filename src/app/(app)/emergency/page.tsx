'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { EmergencyCard } from '@/components/emergency/EmergencyCard'
import { Button, LoadingState } from '@/components/ui'
import { useApp } from '../provider'

export default function EmergencyPage() {
  const router = useRouter()
  const { currentWorkspace } = useApp()

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
    return <LoadingState message="Loading emergency info..." />
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
    <div className="min-h-screen bg-red-50">
      {/* Header */}
      <div className="bg-red-600 text-white safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/90 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          {currentWorkspace.role !== 'VIEWER' && (
            <button
              onClick={() => router.push('/settings/emergency')}
              className="flex items-center gap-2 text-white/90 hover:text-white"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {hasInfo ? (
          <EmergencyCard info={emergencyInfo} medications={medsList} />
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Edit2 className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-2">
              No Emergency Info Set
            </h2>
            <p className="text-secondary-600 mb-4">
              Add important medical information for emergencies.
            </p>
            {currentWorkspace.role !== 'VIEWER' && (
              <Button onClick={() => router.push('/settings/emergency')}>
                Add Emergency Info
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Offline indicator */}
      <div className="fixed bottom-4 left-4 right-4">
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
          <p className="text-sm text-green-800 font-medium">
            This information is available offline
          </p>
        </div>
      </div>
    </div>
  )
}
