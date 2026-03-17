/* BONMOMENT — Service Worker v1 */

const CACHE_NAME = 'bonmoment-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

/* ── Réception d'un push ────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'BONMOMENT', body: event.data ? event.data.text() : 'Nouveaux bons plans disponibles !' }
  }

  const title   = data.title   || 'BONMOMENT 🎉'
  const options = {
    body:    data.body    || 'De nouveaux bons plans sont disponibles dans ta ville !',
    icon:    data.icon    || '/icon-192.png',
    badge:   data.badge   || '/icon-72.png',
    image:   data.image   || undefined,
    data:    { url: data.url || '/' },
    actions: [
      { action: 'voir', title: 'Voir les offres' },
      { action: 'fermer', title: 'Fermer' },
    ],
    vibrate:  [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/* ── Clic sur la notification ───────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'fermer') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
