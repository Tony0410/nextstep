// NextStep Service Worker for Push Notifications

const CACHE_NAME = 'nextstep-v1'

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/today',
        '/meds',
        '/icon-192.png',
        '/icon-512.png',
      ])
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version or fetch from network
      return (
        cached ||
        fetch(event.request).then((response) => {
          // Don't cache API responses
          if (event.request.url.includes('/api/')) {
            return response
          }
          // Cache successful responses
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
          }
          return response
        })
      )
    })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received')

  let data = {
    title: 'Medication Reminder',
    body: 'Time to take your medication',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
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
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'default',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [
      { action: 'take', title: 'Taken' },
      { action: 'snooze', title: 'Snooze' },
    ],
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
