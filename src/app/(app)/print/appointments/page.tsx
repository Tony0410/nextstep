'use client'

import { useState, useEffect } from 'react'
import { format, isAfter, parseISO, addMonths } from 'date-fns'
import { Printer, MapPin } from 'lucide-react'

import { Button, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'
import '@/styles/print.css'

interface Appointment {
  id: string
  title: string
  datetime: string
  location: string | null
  mapUrl: string | null
  notes: string | null
}

export default function AppointmentsPrintPage() {
  const { currentWorkspace } = useApp()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch(`/api/workspaces/${currentWorkspace.id}/appointments`)
        if (response.ok) {
          const data = await response.json()
          // Filter to upcoming appointments within next 3 months
          const now = new Date()
          const threeMonthsFromNow = addMonths(now, 3)
          const upcoming = data.appointments
            .filter((a: Appointment) => {
              const apptDate = parseISO(a.datetime)
              return isAfter(apptDate, now) && isAfter(threeMonthsFromNow, apptDate)
            })
            .sort(
              (a: Appointment, b: Appointment) =>
                parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime()
            )
          setAppointments(upcoming)
        }
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [currentWorkspace.id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <>
        <Header title="Upcoming Appointments" showBack />
        <PageContainer>
          <LoadingState message="Loading appointments..." />
        </PageContainer>
      </>
    )
  }

  const today = format(new Date(), 'MMMM d, yyyy')

  return (
    <>
      <div className="screen-only">
        <Header title="Upcoming Appointments" showBack />
        <PageContainer className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-secondary-600">Preview your printable appointments list</p>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </PageContainer>
      </div>

      <div className="print-preview p-8">
        <div className="print-title text-2xl font-bold mb-2">Upcoming Appointments</div>
        <div className="print-date text-gray-600 mb-6">Generated: {today}</div>

        {currentWorkspace.name && (
          <div className="print-subtitle text-lg font-semibold mb-4">
            Patient: {currentWorkspace.name}
          </div>
        )}

        {appointments.length === 0 ? (
          <p className="text-gray-500">No upcoming appointments scheduled</p>
        ) : (
          <table className="print-table w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left font-semibold">Date & Time</th>
                <th className="border border-gray-300 p-3 text-left font-semibold">Appointment</th>
                <th className="border border-gray-300 p-3 text-left font-semibold">Location</th>
                <th className="border border-gray-300 p-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} className="print-no-break">
                  <td className="border border-gray-300 p-3 whitespace-nowrap">
                    <div className="font-semibold">
                      {format(parseISO(appt.datetime), 'EEE, MMM d')}
                    </div>
                    <div className="text-gray-600">
                      {format(parseISO(appt.datetime), 'h:mm a')}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-3">
                    <div className="font-medium">{appt.title}</div>
                  </td>
                  <td className="border border-gray-300 p-3">
                    {appt.location && (
                      <div className="flex items-start gap-1">
                        <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                        <span>{appt.location}</span>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-3 text-gray-600 text-sm">
                    {appt.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-8 pt-4 border-t border-gray-300">
          <div className="print-subtitle font-semibold mb-2">Reminders:</div>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Bring insurance card and photo ID</li>
            <li>Arrive 15 minutes early for new appointments</li>
            <li>Bring a list of current medications</li>
            <li>Prepare questions for your doctor</li>
          </ul>
        </div>

        <div className="print-footer mt-8 text-center text-sm text-gray-500">
          Generated by NextStep - {today}
        </div>
      </div>
    </>
  )
}
