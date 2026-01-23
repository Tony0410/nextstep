'use client'

import { useState } from 'react'
import { Bell, Clock, Moon } from 'lucide-react'

import { Card, Button, Input, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'
import { useApp } from '../../provider'

export default function NotificationsSettingsPage() {
  const { currentWorkspace, refreshData } = useApp()
  const [quietStart, setQuietStart] = useState(currentWorkspace.quietHoursStart || '22:00')
  const [quietEnd, setQuietEnd] = useState(currentWorkspace.quietHoursEnd || '07:00')
  const [saving, setSaving] = useState(false)

  const handleSaveQuietHours = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      await refreshData()
      showToast('Quiet hours updated', 'success')
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Notifications" showBack />
      <PageContainer className="pt-4 space-y-6">
        {/* Push Notifications */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Push Notifications
          </h2>
          <Card>
            <NotificationPermission workspaceId={currentWorkspace.id} />
          </Card>
        </section>

        {/* Quiet Hours */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            Quiet Hours
          </h2>
          <Card>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-secondary-900">
                  Do Not Disturb
                </p>
                <p className="text-sm text-secondary-500">
                  No reminders will be sent during quiet hours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-button text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-button text-base focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveQuietHours}
              loading={saving}
              fullWidth
              variant="secondary"
            >
              Save Quiet Hours
            </Button>
          </Card>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-sm font-semibold text-secondary-600 mb-3">
            How It Works
          </h2>
          <Card variant="outline">
            <div className="space-y-4 text-sm text-secondary-600">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p>
                  When enabled, you'll receive push notifications when it's time
                  to take your medications.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p>
                  Reminders are sent based on your medication schedules.
                  PRN (as-needed) medications don't trigger reminders.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Moon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p>
                  Quiet hours prevent notifications from being sent during
                  sleep or rest times.
                </p>
              </div>
            </div>
          </Card>
        </section>
      </PageContainer>
    </>
  )
}
