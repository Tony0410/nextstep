'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { History, Thermometer } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { TempQuickLog } from '@/components/temperature/TempQuickLog'
import { TempCard } from '@/components/temperature/TempCard'
import { TempChart } from '@/components/temperature/TempChart'
import { FeverAlert } from '@/components/temperature/FeverAlert'
import { useApp } from '../provider'

export default function TemperaturePage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [serverData, setServerData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const localData = useLiveQuery(
    () =>
      db.temperatureLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((t) => !t.deletedAt)
        .reverse()
        .limit(50)
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/temperature?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setServerData(data.temperatureLogs)
      }
    } catch (err) {
      console.error('Failed to fetch temperature logs:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogged = () => {
    fetchData()
    refreshData()
  }

  const readings = serverData.length > 0 ? serverData : localData || []
  const latestTemp = readings[0]?.tempCelsius ?? null

  if (loading && !localData) {
    return (
      <>
        <Header title="Temperature" />
        <PageContainer><LoadingState message="Loading temperature logs..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Temperature"
        rightAction={{
          icon: <History className="w-6 h-6 text-secondary-700" />,
          label: 'History',
          onClick: () => router.push('/temperature/history'),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Fever Alert */}
        {latestTemp !== null && latestTemp >= 38.0 && (
          <FeverAlert tempCelsius={latestTemp} clinicPhone={currentWorkspace.clinicPhone} />
        )}

        {/* Quick Log */}
        <section>
          <h2 className="text-lg font-semibold text-secondary-900 mb-3">Log Temperature</h2>
          <Card>
            <TempQuickLog workspaceId={currentWorkspace.id} onLogged={handleLogged} />
          </Card>
        </section>

        {/* 7-Day Chart */}
        {readings.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-secondary-900 mb-3">Last 7 Days</h2>
            <Card>
              <TempChart readings={readings.map((r: any) => ({ tempCelsius: r.tempCelsius, recordedAt: r.recordedAt }))} />
            </Card>
          </section>
        )}

        {/* Recent Readings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-secondary-900">Recent</h2>
          </div>
          {readings.length === 0 ? (
            <Card variant="outline" className="text-center py-8">
              <Thermometer className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No temperature readings yet</p>
              <p className="text-sm text-secondary-400 mt-1">Use the form above to log your temperature</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {readings.slice(0, 5).map((reading: any) => (
                <TempCard key={reading.id} reading={reading} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  )
}
