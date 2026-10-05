import React, { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from './ui'
import { useNotifications, hasAskedForNotificationPermission } from '../hooks/useNotifications'

const DISMISSED_KEY = 'pm-notif-dismissed-until'

function getDismissedUntil(): number {
  try {
    return Number(window.localStorage.getItem(DISMISSED_KEY) || 0)
  } catch {
    return 0
  }
}

function snoozeForDays(days: number) {
  try {
    window.localStorage.setItem(
      DISMISSED_KEY,
      String(Date.now() + days * 24 * 60 * 60 * 1000)
    )
  } catch {
    // localStorage indisponible (mode prive) : on ignore
  }
}

export const NotificationPrompt: React.FC = () => {
  const { isSupported, permission, requestPermission } = useNotifications()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isSupported) return
    if (permission !== 'default') return
    if (hasAskedForNotificationPermission()) return
    if (getDismissedUntil() > Date.now()) return
    setVisible(true)
  }, [isSupported, permission])

  if (!visible) return null

  const handleEnable = async () => {
    await requestPermission()
    setVisible(false)
  }

  const handleLater = () => {
    snoozeForDays(7)
    setVisible(false)
  }

  return (
    <div className="card-modern !py-3 !px-4 flex items-center gap-3 animate-fade-in" role="banner">
      <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
        <Bell size={18} />
      </div>
      <p className="text-sm text-on-surface flex-1 min-w-0">
        Activez les notifications pour être alerté quand une commande est prête
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={handleEnable}>
          Activer
        </Button>
        <Button size="sm" variant="ghost" onClick={handleLater}>
          Plus tard
        </Button>
        <button
          onClick={handleLater}
          aria-label="Fermer"
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
