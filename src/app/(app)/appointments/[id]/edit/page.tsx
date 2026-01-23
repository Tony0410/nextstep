'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Button, Input, Textarea, Card, LoadingState, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../../provider'

const TIMEZONE = 'Australia/Perth'

interface Appointment {
  id: string
  title: string
  datetime: string
  location: string | null
  mapUrl: string | null
  notes: string | null
}

export default function EditAppointmentPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const { currentWorkspace, refreshData } = useApp()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const response = await fetch(
          `/api/workspaces/${currentWorkspace.id}/appointments/${appointmentId}`
        )
        if (response.ok) {
          const data = await response.json()
          const appt: Appointment = data.appointment

          // Parse datetime and convert to local timezone
          const apptDate = toZonedTime(parseISO(appt.datetime), TIMEZONE)
          setTitle(appt.title)
          setDate(format(apptDate, 'yyyy-MM-dd'))
          setTime(format(apptDate, 'HH:mm'))
          setLocation(appt.location || '')
          setMapUrl(appt.mapUrl || '')
          setNotes(appt.notes || '')
        } else {
          setError('Appointment not found')
        }
      } catch (err) {
        console.error('Failed to fetch appointment:', err)
        setError('Failed to load appointment')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [currentWorkspace.id, appointmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Combine date and time
      const datetime = new Date(`${date}T${time}:00`)

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/appointments/${appointmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            datetime: datetime.toISOString(),
            location: location || null,
            mapUrl: mapUrl || null,
            notes: notes || null,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update appointment')
      }

      await refreshData()
      showToast('Appointment updated', 'success')
      router.push(`/appointments/${appointmentId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Edit Appointment" showBack />
        <PageContainer>
          <LoadingState message="Loading appointment..." />
        </PageContainer>
      </>
    )
  }

  if (error && !title) {
    return (
      <>
        <Header title="Edit Appointment" showBack />
        <PageContainer className="pt-4">
          <Card className="text-center py-8">
            <p className="text-secondary-500">{error}</p>
          </Card>
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Edit Appointment" showBack backHref={`/appointments/${appointmentId}`} />
      <PageContainer className="pt-4">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Oncology Appointment"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <Input
              label="Location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Level 3, Cancer Centre"
            />

            <Input
              label="Map Link (optional)"
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              helperText="Paste a Google Maps or Apple Maps link"
            />

            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this appointment..."
              rows={3}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-button">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" fullWidth loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </PageContainer>
    </>
  )
}
