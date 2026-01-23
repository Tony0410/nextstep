'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle, AlertCircle, Loader } from 'lucide-react'

import { Button, showToast } from '@/components/ui'

interface NotificationPermissionProps {
  workspaceId: string
}

type PermissionState = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading'

export function NotificationPermission({ workspaceId }: NotificationPermissionProps) {
  const [permission, setPermission] = useState<PermissionState>('loading')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  async function checkPermission() {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    if (!('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }

    const perm = Notification.permission as PermissionState
    setPermission(perm)

    if (perm === 'granted') {
      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      } catch (err) {
        console.error('Failed to check subscription:', err)
      }
    }
  }

  async function handleEnable() {
    setLoading(true)

    try {
      // Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)

      if (perm !== 'granted') {
        showToast('Permission denied', 'error')
        return
      }

      // Get VAPID public key
      const keyResponse = await fetch('/api/notifications/subscribe')
      if (!keyResponse.ok) {
        throw new Error('Push notifications not available')
      }
      const { publicKey } = await keyResponse.json()

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          workspaceId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
      showToast('Notifications enabled!', 'success')
    } catch (err: any) {
      console.error('Enable notifications error:', err)
      showToast(err.message || 'Failed to enable notifications', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Remove from server
        await fetch(
          `/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
          { method: 'DELETE' }
        )
      }

      setIsSubscribed(false)
      showToast('Notifications disabled', 'info')
    } catch (err) {
      console.error('Disable notifications error:', err)
      showToast('Failed to disable notifications', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'loading') {
    return (
      <div className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg">
        <Loader className="w-5 h-5 animate-spin text-secondary-500" />
        <span className="text-secondary-600">Checking notification status...</span>
      </div>
    )
  }

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <div>
          <p className="font-medium text-yellow-800">Not supported</p>
          <p className="text-sm text-yellow-700">
            Push notifications are not supported in this browser.
          </p>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
        <BellOff className="w-5 h-5 text-red-600" />
        <div>
          <p className="font-medium text-red-800">Blocked</p>
          <p className="text-sm text-red-700">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        </div>
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-800">Notifications enabled</p>
            <p className="text-sm text-green-700">
              You'll receive medication reminders on this device.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleDisable}
          loading={loading}
          className="w-full"
        >
          <BellOff className="w-4 h-4 mr-2" />
          Disable Notifications
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg">
        <Bell className="w-5 h-5 text-secondary-600" />
        <div>
          <p className="font-medium text-secondary-800">Enable notifications</p>
          <p className="text-sm text-secondary-600">
            Get reminders when it's time to take your medications.
          </p>
        </div>
      </div>
      <Button
        onClick={handleEnable}
        loading={loading}
        className="w-full"
      >
        <Bell className="w-4 h-4 mr-2" />
        Enable Notifications
      </Button>
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
