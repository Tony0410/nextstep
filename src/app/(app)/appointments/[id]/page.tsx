'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO, isPast, isTomorrow, isToday } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import {
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react'

import { Card, Button, LoadingState, Modal, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'

const TIMEZONE = 'Australia/Perth'

interface Appointment {
  id: string
  title: string
  datetime: string
  location: string | null
  mapUrl: string | null
  notes: string | null
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const { currentWorkspace, refreshData } = useApp()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/appointments/${appointmentId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete')

      showToast('Appointment deleted', 'success')
      refreshData()
      router.push('/appointments')
    } catch {
      showToast('Failed to delete', 'error')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Appointment" showBack />
        <PageContainer>
          <LoadingState message="Loading..." />
        </PageContainer>
      </>
    )
  }

  if (!appointment) {
    return (
      <>
        <Header title="Appointment" showBack />
        <PageContainer className="pt-4">
          <Card className="text-center py-8">
            <p className="text-secondary-500">Appointment not found</p>
          </Card>
        </PageContainer>
      </>
    )
  }

  const apptDate = toZonedTime(parseISO(appointment.datetime), TIMEZONE)
  const isInPast = isPast(apptDate)
  const showPrepButton = !isInPast && (isToday(apptDate) || isTomorrow(apptDate) || !isPast(apptDate))

  return (
    <>
      <Header
        title="Appointment"
        showBack
        rightAction={{
          icon: <Edit className="w-6 h-6 text-secondary-700" />,
          label: 'Edit',
          onClick: () => router.push(`/appointments/${appointmentId}/edit`),
        }}
      />
      <PageContainer className="pt-4 space-y-4">
        {/* Main details */}
        <Card>
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                isInPast ? 'bg-secondary-100' : 'bg-primary-100'
              }`}
            >
              <Calendar
                className={`w-7 h-7 ${
                  isInPast ? 'text-secondary-400' : 'text-primary-600'
                }`}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-secondary-900">
                {appointment.title}
              </h1>

              <div className="mt-3 space-y-2">
                <p
                  className={`flex items-center gap-2 ${
                    isInPast ? 'text-secondary-400' : 'text-secondary-700'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span>
                    {format(apptDate, 'EEEE, MMMM d, yyyy')} at{' '}
                    {format(apptDate, 'h:mm a')}
                  </span>
                </p>

                {appointment.location && (
                  <div className="flex items-start gap-2 text-secondary-600">
                    <MapPin className="w-5 h-5 mt-0.5" />
                    <span>{appointment.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Map link */}
        {appointment.mapUrl && (
          <a
            href={appointment.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:bg-secondary-50">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-600">Open in Maps</span>
              </div>
            </Card>
          </a>
        )}

        {/* Preparation checklist */}
        {showPrepButton && (
          <Card
            onClick={() => router.push(`/appointments/${appointmentId}/prep`)}
            className="hover:bg-secondary-50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-secondary-900">
                  Prepare for this appointment
                </p>
                <p className="text-sm text-secondary-500">
                  Checklist to help you get ready
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-300" />
            </div>
          </Card>
        )}

        {/* Notes */}
        {appointment.notes && (
          <Card>
            <h2 className="font-semibold text-secondary-700 mb-2">Notes</h2>
            <p className="text-secondary-600 whitespace-pre-wrap">
              {appointment.notes}
            </p>
          </Card>
        )}

        {/* Delete button */}
        <div className="pt-4">
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 w-full"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Appointment
          </Button>
        </div>
      </PageContainer>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Appointment"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to delete "{appointment.title}"? This action
            cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDelete(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
