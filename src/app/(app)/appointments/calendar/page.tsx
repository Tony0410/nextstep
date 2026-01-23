'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { List, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, Button } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { CalendarMonth } from '@/components/calendar/CalendarMonth'
import { useApp } from '../../provider'

export default function CalendarPage() {
  const router = useRouter()
  const { currentWorkspace } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [serverAppointments, setServerAppointments] = useState<any[]>([])

  // Fetch from IndexedDB for offline support
  const localAppointments = useLiveQuery(
    () =>
      db.appointments
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((a) => !a.deletedAt)
        .toArray(),
    [currentWorkspace.id]
  )

  // Also fetch from server for latest data
  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch(
          `/api/workspaces/${currentWorkspace.id}/appointments`
        )
        if (response.ok) {
          const data = await response.json()
          setServerAppointments(data.appointments)
        }
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [currentWorkspace.id])

  // Prefer server data if available
  const appointments = serverAppointments.length > 0 ? serverAppointments : localAppointments || []

  if (loading && !localAppointments) {
    return (
      <>
        <Header
          title="Calendar"
          showBack
          rightAction={{
            icon: <List className="w-6 h-6 text-secondary-700" />,
            label: 'List view',
            onClick: () => router.push('/appointments'),
          }}
        />
        <PageContainer>
          <LoadingState message="Loading appointments..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Calendar"
        showBack
        rightAction={{
          icon: <List className="w-6 h-6 text-secondary-700" />,
          label: 'List view',
          onClick: () => router.push('/appointments'),
        }}
      />
      <PageContainer className="pt-4 space-y-4">
        <Card>
          <CalendarMonth
            appointments={appointments.map((a: any) => ({
              id: a.id,
              title: a.title,
              datetime: a.datetime,
              location: a.location,
            }))}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onMonthChange={setCurrentMonth}
            currentMonth={currentMonth}
          />
        </Card>

        {/* Add appointment FAB */}
        <div className="fixed bottom-20 right-4 z-30">
          <Button
            onClick={() => router.push('/appointments/new')}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
