// public/sw.js
// Service Worker PressingManager
// Gere le cache offline, la mise a jour, et le reseau

const CACHE_NAME = 'pressingmanager-v1'
const OFFLINE_URL = '/offline.html'

// Fichiers a mettre en cache au demarrage (essentiels)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ============================================
// INSTALLATION - Pre-cache des fichiers essentiels
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cache des fichiers')
      return cache.addAll(PRECACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

// ============================================
// ACTIVATION - Nettoyage des anciens caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// ============================================
// FETCH - Strategie de cache
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne pas cacher les requetes Supabase / API externes
  if (url.origin !== self.location.origin) {
    return
  }

  // Ne pas cacher les requetes POST/PUT/DELETE
  if (request.method !== 'GET') {
    return
  }

  // Strategie Network First pour les pages HTML
  // (essaie le reseau, puis le cache, puis offline)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html')
          })
        })
    )
    return
  }

  // Strategie Cache First pour les assets (images, JS, CSS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Mettre a jour en arriere-plan
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response)
            })
          }
        }).catch(() => {})
        return cached
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
    })
  )
})

// ============================================
// MESSAGE - Permet de forcer la mise a jour
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
