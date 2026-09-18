import React from 'react'
import ReactDOM from 'react-dom/client'
import { toast } from 'sonner'
import App from './App'
import './index.css'

// ============================================
// ENREGISTREMENT DU SERVICE WORKER (PWA)
// ============================================
if ('serviceWorker' in navigator && true) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker enregistre:', registration.scope)

        // Detection des mises a jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              toast.info('Nouvelle version disponible', {
                description: 'Cliquez pour recharger et profiter des ameliorations',
                duration: 10000,
                action: {
                  label: 'Recharger',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  },
                },
              })
            }
          })
        })
      })
      .catch((error) => {
        console.error('[PWA] Erreur enregistrement Service Worker:', error)
      })
  })

  // Recharger la page quand un nouveau Service Worker prend le controle
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

// ============================================
// RENDER DE L'APP
// ============================================
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

