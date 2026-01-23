'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { Printer } from 'lucide-react'

import { Button, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'
import '@/styles/print.css'

interface Medication {
  id: string
  name: string
  instructions: string | null
  scheduleType: string
  active: boolean
}

interface Symptom {
  id: string
  type: string
  customName: string | null
  severity: number
  notes: string | null
  recordedAt: string
}

interface Note {
  id: string
  type: string
  content: string
  askedAt: string | null
}

const SYMPTOM_LABELS: Record<string, string> = {
  FATIGUE: 'Fatigue',
  NAUSEA: 'Nausea',
  PAIN: 'Pain',
  APPETITE: 'Appetite Changes',
  SLEEP: 'Sleep Issues',
  MOOD: 'Mood Changes',
  CUSTOM: 'Other',
}

const SEVERITY_LABELS = ['Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme']

export default function DoctorVisitPrintPage() {
  const { currentWorkspace } = useApp()
  const [medications, setMedications] = useState<Medication[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [questions, setQuestions] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch medications
        const medsResponse = await fetch(
          `/api/workspaces/${currentWorkspace.id}/medications`
        )
        if (medsResponse.ok) {
          const data = await medsResponse.json()
          setMedications(data.medications.filter((m: Medication) => m.active))
        }

        // Fetch symptoms from last 30 days
        const symptomsResponse = await fetch(
          `/api/workspaces/${currentWorkspace.id}/symptoms?limit=50`
        )
        if (symptomsResponse.ok) {
          const data = await symptomsResponse.json()
          const thirtyDaysAgo = subDays(new Date(), 30)
          setSymptoms(
            data.symptoms.filter(
              (s: Symptom) => new Date(s.recordedAt) >= thirtyDaysAgo
            )
          )
        }

        // Fetch questions (unasked notes)
        const notesResponse = await fetch(
          `/api/workspaces/${currentWorkspace.id}/notes`
        )
        if (notesResponse.ok) {
          const data = await notesResponse.json()
          setQuestions(
            data.notes.filter(
              (n: Note) => n.type === 'QUESTION' && !n.askedAt
            )
          )
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentWorkspace.id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <>
        <Header title="Doctor's Visit Summary" showBack />
        <PageContainer>
          <LoadingState message="Loading summary..." />
        </PageContainer>
      </>
    )
  }

  const today = format(new Date(), 'MMMM d, yyyy')

  // Group symptoms by type for summary
  const symptomSummary = symptoms.reduce(
    (acc, s) => {
      const key = s.type
      if (!acc[key]) {
        acc[key] = { count: 0, totalSeverity: 0, maxSeverity: 0 }
      }
      acc[key].count++
      acc[key].totalSeverity += s.severity
      acc[key].maxSeverity = Math.max(acc[key].maxSeverity, s.severity)
      return acc
    },
    {} as Record<string, { count: number; totalSeverity: number; maxSeverity: number }>
  )

  return (
    <>
      <div className="screen-only">
        <Header title="Doctor's Visit Summary" showBack />
        <PageContainer className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-secondary-600">
              Complete summary for your doctor appointment
            </p>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </PageContainer>
      </div>

      <div className="print-preview p-8">
        <div className="print-title text-2xl font-bold mb-2">
          Doctor's Visit Summary
        </div>
        <div className="print-date text-gray-600 mb-6">Prepared: {today}</div>

        {/* Patient Info */}
        <div className="print-section print-no-break mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="print-subtitle font-semibold mb-3">Patient Information</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>{' '}
              <span className="font-medium">
                {(currentWorkspace as any).patientName || currentWorkspace.name || '_______________'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">DOB:</span>{' '}
              <span className="font-medium">
                {(currentWorkspace as any).patientDOB
                  ? format(new Date((currentWorkspace as any).patientDOB), 'MM/dd/yyyy')
                  : '_______________'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Blood Type:</span>{' '}
              <span className="font-medium">
                {(currentWorkspace as any).bloodType || '_______________'}
              </span>
            </div>
          </div>
          {(currentWorkspace as any).allergies && (
            <div className="mt-3">
              <span className="text-gray-600">Allergies:</span>{' '}
              <span className="font-medium text-red-600">
                {(currentWorkspace as any).allergies}
              </span>
            </div>
          )}
          {(currentWorkspace as any).medicalConditions && (
            <div className="mt-2">
              <span className="text-gray-600">Medical Conditions:</span>{' '}
              <span className="font-medium">
                {(currentWorkspace as any).medicalConditions}
              </span>
            </div>
          )}
        </div>

        {/* Current Medications */}
        <div className="print-section print-no-break mb-6">
          <div className="print-subtitle font-semibold mb-3">
            Current Medications ({medications.length})
          </div>
          {medications.length === 0 ? (
            <p className="text-gray-500 text-sm">No active medications</p>
          ) : (
            <table className="print-table w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Medication</th>
                  <th className="border border-gray-300 p-2 text-left">Instructions</th>
                  <th className="border border-gray-300 p-2 text-left">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id}>
                    <td className="border border-gray-300 p-2 font-medium">
                      {med.name}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {med.instructions || '-'}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {med.scheduleType.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Symptom Summary */}
        <div className="print-section print-no-break mb-6">
          <div className="print-subtitle font-semibold mb-3">
            Symptoms (Last 30 Days)
          </div>
          {Object.keys(symptomSummary).length === 0 ? (
            <p className="text-gray-500 text-sm">No symptoms recorded</p>
          ) : (
            <table className="print-table w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Symptom</th>
                  <th className="border border-gray-300 p-2 text-left">Occurrences</th>
                  <th className="border border-gray-300 p-2 text-left">Avg Severity</th>
                  <th className="border border-gray-300 p-2 text-left">Max Severity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(symptomSummary)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([type, data]) => (
                    <tr key={type}>
                      <td className="border border-gray-300 p-2 font-medium">
                        {SYMPTOM_LABELS[type] || type}
                      </td>
                      <td className="border border-gray-300 p-2">{data.count}x</td>
                      <td className="border border-gray-300 p-2">
                        {SEVERITY_LABELS[Math.round(data.totalSeverity / data.count) - 1]}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {SEVERITY_LABELS[data.maxSeverity - 1]}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Questions to Ask */}
        <div className="print-section mb-6">
          <div className="print-subtitle font-semibold mb-3">
            Questions to Ask ({questions.length})
          </div>
          {questions.length === 0 ? (
            <p className="text-gray-500 text-sm">No questions prepared</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div key={q.id} className="print-question flex items-start gap-2 py-2">
                  <div className="print-question-checkbox w-4 h-4 border-2 border-black flex-shrink-0 mt-0.5" />
                  <span>
                    {idx + 1}. {q.content}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor's Notes Section */}
        <div className="print-section print-page-break">
          <div className="print-subtitle font-semibold mb-3">Doctor's Notes</div>
          <div className="print-notes border border-gray-300 rounded p-3 min-h-[200px] bg-gray-50" />
        </div>

        {/* Follow-up */}
        <div className="print-section mt-6">
          <div className="print-subtitle font-semibold mb-3">Follow-up</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Next Appointment:</span>{' '}
              <span>________________________</span>
            </div>
            <div>
              <span className="text-gray-600">Labs Ordered:</span>{' '}
              <span>________________________</span>
            </div>
          </div>
        </div>

        <div className="print-footer mt-8 text-center text-sm text-gray-500">
          Generated by NextStep - {today}
        </div>
      </div>
    </>
  )
}
