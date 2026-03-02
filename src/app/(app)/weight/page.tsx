'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { History, Scale } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { WeightQuickLog } from '@/components/weight/WeightQuickLog'
import { WeightCard } from '@/components/weight/WeightCard'
import { WeightChart } from '@/components/weight/WeightChart'
import { WeightAlert } from '@/components/weight/WeightAlert'
import { useApp } from '../provider'

export default function WeightPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [serverData, setServerData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const localData = useLiveQuery(
    () =>
      db.weightLogs
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((w) => !w.deletedAt)
        .reverse()
        .limit(100)
        .toArray(),
    [currentWorkspace.id]
  )

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/weight?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setServerData(data.weightLogs)
      }
    } catch (err) {
      console.error('Failed to fetch weight logs:', err)
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

  const readings = useMemo(
    () => (serverData.length > 0 ? serverData : localData || []),
    [serverData, localData]
  )

  // Check for rapid weight change
  const rapidChange = useMemo(() => {
    if (readings.length < 2) return null
    const latest = readings[0]
    const previous = readings[1]
    const hoursDiff = (new Date(latest.recordedAt).getTime() - new Date(previous.recordedAt).getTime()) / (1000 * 60 * 60)
    if (hoursDiff <= 48 && Math.abs(latest.weightKg - previous.weightKg) >= 2) {
      return { currentKg: latest.weightKg, previousKg: previous.weightKg, timeframeHours: Math.round(hoursDiff) }
    }
    return null
  }, [readings])

  if (loading && !localData) {
    return (
      <>
        <Header title="Weight" />
        <PageContainer><LoadingState message="Loading weight logs..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Weight"
        rightAction={{
          icon: <History className="w-6 h-6 text-secondary-700" />,
          label: 'History',
          onClick: () => router.push('/weight/history'),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Rapid Change Alert */}
        {rapidChange && (
          <WeightAlert
            currentKg={rapidChange.currentKg}
            previousKg={rapidChange.previousKg}
            timeframeHours={rapidChange.timeframeHours}
          />
        )}

        {/* Quick Log */}
        <section>
          <h2 className="text-lg font-semibold text-secondary-900 mb-3">Log Weight</h2>
          <Card>
            <WeightQuickLog workspaceId={currentWorkspace.id} onLogged={handleLogged} />
          </Card>
        </section>

        {/* 30-Day Trend */}
        {readings.length >= 2 && (
          <section>
            <h2 className="text-lg font-semibold text-secondary-900 mb-3">30-Day Trend</h2>
            <Card>
              <WeightChart readings={readings.map((r: any) => ({ weightKg: r.weightKg, recordedAt: r.recordedAt }))} />
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
              <Scale className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No weight readings yet</p>
              <p className="text-sm text-secondary-400 mt-1">Use the form above to track your weight</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {readings.slice(0, 5).map((reading: any, i: number) => (
                <WeightCard
                  key={reading.id}
                  reading={reading}
                  previousKg={i < readings.length - 1 ? readings[i + 1]?.weightKg : null}
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  )
}
