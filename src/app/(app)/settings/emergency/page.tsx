'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

import { Input, Textarea, Select, Button, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'

const BLOOD_TYPES = [
  { value: '', label: 'Select blood type' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'Unknown', label: 'Unknown' },
]

export default function EmergencySettingsPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [patientName, setPatientName] = useState('')
  const [patientDOB, setPatientDOB] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medicalConditions, setMedicalConditions] = useState('')
  const [primaryPhysician, setPrimaryPhysician] = useState('')
  const [physicianPhone, setPhysicianPhone] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/api/workspaces/${currentWorkspace.id}/emergency-info`)
        if (response.ok) {
          const data = await response.json()
          setPatientName(data.patientName || '')
          setPatientDOB(data.patientDOB ? format(new Date(data.patientDOB), 'yyyy-MM-dd') : '')
          setBloodType(data.bloodType || '')
          setAllergies(data.allergies || '')
          setMedicalConditions(data.medicalConditions || '')
          setPrimaryPhysician(data.primaryPhysician || '')
          setPhysicianPhone(data.physicianPhone || '')
          setClinicPhone(data.clinicPhone || '')
          setEmergencyPhone(data.emergencyPhone || '')
        }
      } catch (err) {
        console.error('Failed to load emergency info:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentWorkspace.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/emergency-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim() || null,
          patientDOB: patientDOB ? new Date(patientDOB).toISOString() : null,
          bloodType: bloodType || null,
          allergies: allergies.trim() || null,
          medicalConditions: medicalConditions.trim() || null,
          primaryPhysician: primaryPhysician.trim() || null,
          physicianPhone: physicianPhone.trim() || null,
          clinicPhone: clinicPhone.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      await refreshData()
      showToast('Emergency information saved', 'success')
      router.back()
    } catch (err) {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Emergency Info" showBack />
      <PageContainer className="pt-4 space-y-6 pb-24">
        <p className="text-secondary-600">
          This information will be available offline in emergencies. Fill in what you know.
        </p>

        {/* Patient Information */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Patient Information
          </h2>
          <div className="space-y-4">
            <Input
              label="Patient Name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
              disabled={loading}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={patientDOB}
              onChange={(e) => setPatientDOB(e.target.value)}
              disabled={loading}
            />
            <Select
              label="Blood Type"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              options={BLOOD_TYPES}
              disabled={loading}
            />
          </div>
        </section>

        {/* Medical Information */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Medical Information
          </h2>
          <div className="space-y-4">
            <Textarea
              label="Allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="List any allergies (medications, food, environmental)"
              rows={3}
              disabled={loading}
            />
            <Textarea
              label="Medical Conditions"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="List ongoing conditions (e.g., Cancer - receiving chemotherapy)"
              rows={3}
              disabled={loading}
            />
          </div>
        </section>

        {/* Healthcare Provider */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Healthcare Provider
          </h2>
          <div className="space-y-4">
            <Input
              label="Primary Physician"
              value={primaryPhysician}
              onChange={(e) => setPrimaryPhysician(e.target.value)}
              placeholder="Doctor's name"
              disabled={loading}
            />
            <Input
              label="Physician Phone"
              type="tel"
              value={physicianPhone}
              onChange={(e) => setPhysicianPhone(e.target.value)}
              placeholder="e.g., 08 9400 1234"
              disabled={loading}
            />
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Emergency Contacts
          </h2>
          <div className="space-y-4">
            <Input
              label="Clinic Phone"
              type="tel"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              placeholder="e.g., 08 9400 1234"
              disabled={loading}
            />
            <Input
              label="Emergency Contact (Family)"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="e.g., 0412 345 678"
              disabled={loading}
            />
          </div>
        </section>
      </PageContainer>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border safe-bottom">
        <Button onClick={handleSave} fullWidth loading={saving} disabled={loading}>
          Save Emergency Info
        </Button>
      </div>
    </>
  )
}
