'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

import { Card, LoadingState, Button } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { ActivityItem } from '@/components/activity/ActivityItem'
import { ActivityFilter } from '@/components/activity/ActivityFilter'
import { useApp } from '../provider'

interface Activity {
  id: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
  user: { id: string; name: string }
}

export default function ActivityPage() {
  const { currentWorkspace } = useApp()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [entityType, setEntityType] = useState('')
  const [offset, setOffset] = useState(0)

  const fetchActivities = useCallback(async (reset = false) => {
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
        ...(entityType && { entityType }),
      })

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/activity?${params}`
      )

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()

      if (reset) {
        setActivities(data.activities)
        setOffset(data.activities.length)
      } else {
        setActivities((prev) => [...prev, ...data.activities])
        setOffset(currentOffset + data.activities.length)
      }
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Failed to fetch activities:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentWorkspace.id, entityType, offset])

  useEffect(() => {
    fetchActivities(true)
  }, [currentWorkspace.id, entityType])

  const handleLoadMore = () => {
    fetchActivities(false)
  }

  const handleEntityTypeChange = (type: string) => {
    setEntityType(type)
    setOffset(0)
  }

  if (loading) {
    return (
      <>
        <Header title="Activity" showBack />
        <PageContainer>
          <LoadingState message="Loading activity..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Activity" showBack />
      <PageContainer className="pt-4 space-y-4">
        <ActivityFilter
          entityType={entityType}
          onEntityTypeChange={handleEntityTypeChange}
        />

        {activities.length === 0 ? (
          <Card variant="outline" className="text-center py-8">
            <p className="text-secondary-500">No activity yet</p>
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-border">
              {activities.map((activity) => (
                <div key={activity.id} className="px-4">
                  <ActivityItem activity={activity} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {hasMore && (
          <div className="text-center pb-4">
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              loading={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </PageContainer>
    </>
  )
}
