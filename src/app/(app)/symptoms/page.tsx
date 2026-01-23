'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, History } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/sync'
import { Card, LoadingState, EmptyState } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { SymptomQuickLog } from '@/components/symptoms/SymptomQuickLog'
import { SymptomCard } from '@/components/symptoms/SymptomCard'
import { SymptomChart } from '@/components/symptoms/SymptomChart'
import { useApp } from '../provider'

export default function SymptomsPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [recentSymptoms, setRecentSymptoms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch symptoms from IndexedDB
  const localSymptoms = useLiveQuery(
    () =>
      db.symptoms
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((s) => !s.deletedAt)
        .reverse()
        .limit(50)
        .toArray(),
    [currentWorkspace.id]
  )

  // Also fetch from server to get the latest
  const fetchSymptoms = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/symptoms?limit=20`
      )
      if (response.ok) {
        const data = await response.json()
        setRecentSymptoms(data.symptoms)
      }
    } catch (err) {
      console.error('Failed to fetch symptoms:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    fetchSymptoms()
  }, [fetchSymptoms])

  const handleLogged = () => {
    fetchSymptoms()
    refreshData()
  }

  // Combine local and server data, preferring server
  const symptoms = recentSymptoms.length > 0 ? recentSymptoms : localSymptoms || []

  if (loading && !localSymptoms) {
    return (
      <>
        <Header title="Symptoms" />
        <PageContainer>
          <LoadingState message="Loading symptoms..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Symptoms"
        rightAction={{
          icon: <History className="w-6 h-6 text-secondary-700" />,
          label: 'History',
          onClick: () => router.push('/symptoms/history'),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Quick Log */}
        <section>
          <h2 className="text-lg font-semibold text-secondary-900 mb-3">Log a Symptom</h2>
          <Card>
            <SymptomQuickLog
              workspaceId={currentWorkspace.id}
              onLogged={handleLogged}
            />
          </Card>
        </section>

        {/* 7-Day Chart */}
        {symptoms.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-secondary-900 mb-3">
              Last 7 Days
            </h2>
            <Card>
              <SymptomChart
                symptoms={symptoms.map((s: any) => ({
                  id: s.id,
                  type: s.type,
                  severity: s.severity,
                  recordedAt: s.recordedAt,
                }))}
                days={7}
              />
            </Card>
          </section>
        )}

        {/* Recent Symptoms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-secondary-900">Recent</h2>
            {symptoms.length > 5 && (
              <button
                onClick={() => router.push('/symptoms/history')}
                className="text-sm text-primary-600 font-medium"
              >
                View all
              </button>
            )}
          </div>

          {symptoms.length === 0 ? (
            <Card variant="outline" className="text-center py-8">
              <BarChart2 className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">No symptoms logged yet</p>
              <p className="text-sm text-secondary-400 mt-1">
                Use the form above to track how you're feeling
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {symptoms.slice(0, 5).map((symptom: any) => (
                <SymptomCard key={symptom.id} symptom={symptom} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  )
}
