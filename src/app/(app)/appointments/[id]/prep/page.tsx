'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Calendar, MapPin, Clock, Printer } from 'lucide-react'

import { Card, LoadingState, Button } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { PrepChecklist } from '@/components/appointments/PrepChecklist'
import { useApp } from '../../../provider'

interface Appointment {
  id: string
  title: string
  datetime: string
  location: string | null
  notes: string | null
}

export default function AppointmentPrepPage() {
  const params = useParams()
  const appointmentId = params.id as string
  const { currentWorkspace } = useApp()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const response = await fetch(
          `/api/workspaces/${currentWorkspace.id}/appointments/${appointmentId}`
        )
        if (response.ok) {
          const data = await response.json()
          setAppointment(data.appointment)
        }
      } catch (err) {
        console.error('Failed to fetch appointment:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [currentWorkspace.id, appointmentId])

  if (loading) {
    return (
      <>
        <Header title="Prepare" showBack />
        <PageContainer>
          <LoadingState message="Loading..." />
        </PageContainer>
      </>
    )
  }

  if (!appointment) {
    return (
      <>
        <Header title="Prepare" showBack />
        <PageContainer className="pt-4">
          <Card className="text-center py-8">
            <p className="text-secondary-500">Appointment not found</p>
          </Card>
        </PageContainer>
      </>
    )
  }

  const apptDate = parseISO(appointment.datetime)

  return (
    <>
      <Header
        title="Prepare for Appointment"
        showBack
        rightAction={{
          icon: <Printer className="w-6 h-6 text-secondary-700" />,
          label: 'Print',
          onClick: () => window.print(),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Appointment summary */}
        <Card className="bg-primary-50 border border-primary-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-secondary-900">
                {appointment.title}
              </h2>
              <p className="text-primary-700 flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4" />
                {format(apptDate, 'EEEE, MMMM d')} at {format(apptDate, 'h:mm a')}
              </p>
              {appointment.location && (
                <p className="text-secondary-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {appointment.location}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Preparation Tips</h3>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Arrive 15 minutes early</li>
            <li>Bring all items on your checklist</li>
            <li>Have someone drive you if needed</li>
            <li>Eat a light meal beforehand unless fasting</li>
          </ul>
        </div>

        {/* Checklist */}
        <div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Preparation Checklist
          </h3>
          <PrepChecklist
            workspaceId={currentWorkspace.id}
            appointmentId={appointmentId}
          />
        </div>

        {/* Notes */}
        {appointment.notes && (
          <Card>
            <h3 className="font-medium text-secondary-700 mb-2">Notes</h3>
            <p className="text-secondary-600 whitespace-pre-wrap">{appointment.notes}</p>
          </Card>
        )}
      </PageContainer>
    </>
  )
}
