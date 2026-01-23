'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
  scheduleData: {
    type: string
    times?: string[]
    hours?: number
    startTime?: string
    time?: string
    days?: number[]
  }
  active: boolean
}

interface MedTime {
  time: string
  medications: { id: string; name: string; instructions: string | null }[]
}

function parseScheduleTimes(med: Medication): string[] {
  const { scheduleType, scheduleData } = med

  switch (scheduleType) {
    case 'FIXED_TIMES':
      return scheduleData.times || []
    case 'INTERVAL':
      // Generate times based on interval
      const times: string[] = []
      const startHour = parseInt(scheduleData.startTime?.split(':')[0] || '8')
      const hours = scheduleData.hours || 4
      for (let h = startHour; h < 24; h += hours) {
        const hourStr = h.toString().padStart(2, '0')
        times.push(`${hourStr}:00`)
      }
      return times
    case 'WEEKDAYS':
      return scheduleData.time ? [scheduleData.time] : []
    case 'PRN':
      return ['As needed']
    default:
      return []
  }
}

function groupMedicationsByTime(medications: Medication[]): MedTime[] {
  const timeMap = new Map<string, { id: string; name: string; instructions: string | null }[]>()

  for (const med of medications) {
    if (!med.active) continue

    const times = parseScheduleTimes(med)
    for (const time of times) {
      if (!timeMap.has(time)) {
        timeMap.set(time, [])
      }
      timeMap.get(time)!.push({
        id: med.id,
        name: med.name,
        instructions: med.instructions,
      })
    }
  }

  // Sort by time
  const sorted = Array.from(timeMap.entries())
    .filter(([time]) => time !== 'As needed')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, medications]) => ({ time, medications }))

  // Add PRN meds at the end
  const prnMeds = timeMap.get('As needed')
  if (prnMeds && prnMeds.length > 0) {
    sorted.push({ time: 'As needed', medications: prnMeds })
  }

  return sorted
}

function formatTime(time: string): string {
  if (time === 'As needed') return time
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

export default function DailyMedsPrintPage() {
  const { currentWorkspace } = useApp()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMedications() {
      try {
        const response = await fetch(`/api/workspaces/${currentWorkspace.id}/medications`)
        if (response.ok) {
          const data = await response.json()
          setMedications(data.medications.filter((m: Medication) => m.active))
        }
      } catch (err) {
        console.error('Failed to fetch medications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMedications()
  }, [currentWorkspace.id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <>
        <Header title="Daily Medications" showBack />
        <PageContainer>
          <LoadingState message="Loading medications..." />
        </PageContainer>
      </>
    )
  }

  const medTimes = groupMedicationsByTime(medications)
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <>
      <div className="screen-only">
        <Header title="Daily Medications" showBack />
        <PageContainer className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-secondary-600">Preview your printable medication schedule</p>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </PageContainer>
      </div>

      <div className="print-preview p-8">
        <div className="print-title text-2xl font-bold mb-2">Daily Medication Schedule</div>
        <div className="print-date text-gray-600 mb-6">{today}</div>

        {currentWorkspace.name && (
          <div className="print-subtitle text-lg font-semibold mb-4">
            Patient: {currentWorkspace.name}
          </div>
        )}

        {medTimes.length === 0 ? (
          <p className="text-gray-500">No medications scheduled</p>
        ) : (
          <div className="space-y-6">
            {medTimes.map((medTime, idx) => (
              <div key={idx} className="print-section print-no-break">
                <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-gray-300">
                  <span className="print-subtitle text-xl font-bold">
                    {formatTime(medTime.time)}
                  </span>
                </div>
                <div className="space-y-3">
                  {medTime.medications.map((med) => (
                    <div key={med.id} className="print-med-item flex items-start gap-3 py-2">
                      <div className="print-checkbox w-6 h-6 border-2 border-black flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="print-med-name text-lg font-semibold">{med.name}</div>
                        {med.instructions && (
                          <div className="print-text text-gray-600 text-sm mt-1">
                            {med.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-300">
          <div className="print-subtitle font-semibold mb-2">Notes:</div>
          <div className="print-notes border border-gray-300 rounded p-3 min-h-[100px] bg-gray-50" />
        </div>

        <div className="print-footer mt-8 text-center text-sm text-gray-500">
          Generated by NextStep - {today}
        </div>
      </div>
    </>
  )
}
