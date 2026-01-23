// NextStep Service Worker for Push Notifications

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(self.clients.claim())
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received')

  let data = {
    title: 'Medication Reminder',
    body: 'Time to take your medication',
    tag: 'medication-reminder',
    data: {
      url: '/meds',
    },
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      console.error('Failed to parse push data:', e)
    }
  }

  const options = {
    body: data.body,
    tag: data.tag || 'default',
    vibrate: [100, 50, 100],
    data: data.data || {},
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action)

  event.notification.close()

  const data = event.notification.data || {}
  let url = data.url || '/meds'

  // Handle different actions
  if (event.action === 'take' && data.medicationId) {
    // Open meds page with action to log dose
    url = `/meds?action=take&id=${data.medicationId}`
  } else if (event.action === 'snooze') {
    // Schedule a new notification in 15 minutes
    // This would require server-side logic
    console.log('Snooze requested')
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync event - for offline dose logging
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-doses') {
    console.log('Service Worker: Syncing doses...')
    // This would sync offline dose logs when connection is restored
  }
})
