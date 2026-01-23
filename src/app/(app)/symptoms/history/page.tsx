'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, format } from 'date-fns'

import { Card, LoadingState, Button } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { SymptomCard } from '@/components/symptoms/SymptomCard'
import { SymptomChart } from '@/components/symptoms/SymptomChart'
import { useApp } from '../../provider'

const SYMPTOM_TYPES = [
  { value: '', label: 'All' },
  { value: 'FATIGUE', label: 'Fatigue' },
  { value: 'NAUSEA', label: 'Nausea' },
  { value: 'PAIN', label: 'Pain' },
  { value: 'APPETITE', label: 'Appetite' },
  { value: 'SLEEP', label: 'Sleep' },
  { value: 'MOOD', label: 'Mood' },
]

export default function SymptomsHistoryPage() {
  const { currentWorkspace } = useApp()
  const [symptoms, setSymptoms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [offset, setOffset] = useState(0)

  const fetchSymptoms = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: String(currentOffset),
        ...(filterType && { type: filterType }),
      })

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/symptoms?${params}`
      )

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()

      if (reset) {
        setSymptoms(data.symptoms)
        setOffset(data.symptoms.length)
      } else {
        setSymptoms((prev) => [...prev, ...data.symptoms])
        setOffset(currentOffset + data.symptoms.length)
      }
      setHasMore(data.symptoms.length === 50)
    } catch (err) {
      console.error('Failed to fetch symptoms:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentWorkspace.id, filterType, offset])

  useEffect(() => {
    fetchSymptoms(true)
  }, [currentWorkspace.id, filterType])

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    setOffset(0)
  }

  if (loading) {
    return (
      <>
        <Header title="Symptom History" showBack />
        <PageContainer>
          <LoadingState message="Loading history..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Symptom History" showBack />
      <PageContainer className="pt-4 space-y-6">
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SYMPTOM_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleFilterChange(type.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterType === type.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* 30-Day Chart */}
        {symptoms.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-secondary-600 mb-3">
              Last 30 Days
            </h2>
            <Card>
              <SymptomChart
                symptoms={symptoms}
                days={30}
                type={filterType || undefined}
              />
            </Card>
          </section>
        )}

        {/* Symptoms List */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            All Entries
          </h2>
          {symptoms.length === 0 ? (
            <Card variant="outline" className="text-center py-8">
              <p className="text-secondary-500">No symptoms found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {symptoms.map((symptom) => (
                <SymptomCard key={symptom.id} symptom={symptom} />
              ))}
            </div>
          )}
        </section>

        {hasMore && (
          <div className="text-center pb-4">
            <Button
              variant="secondary"
              onClick={() => fetchSymptoms(false)}
              loading={loadingMore}
            >
              Load more
            </Button>
          </div>
        )}
      </PageContainer>
    </>
  )
}
