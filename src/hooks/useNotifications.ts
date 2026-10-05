import { useCallback, useEffect, useState } from 'react'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export interface SendNotificationOptions {
  body?: string
  icon?: string
  tag?: string
  url?: string
  silent?: boolean
}

const DEFAULT_ICON = '/icon-192.png'
const ASKED_KEY = 'pm-notif-asked'

function getInitialPermission(): NotificationPermissionState {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>(getInitialPermission)
  const isSupported = permission !== 'unsupported'

  useEffect(() => {
    setPermission(getInitialPermission())
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported'
    }
    try {
      const result = await Notification.requestPermission()
      try {
        window.localStorage.setItem(ASKED_KEY, '1')
      } catch {
        // localStorage indisponible (mode prive) : on ignore
      }
      setPermission(result)
      return result
    } catch {
      return Notification.permission
    }
  }, [])

  const sendNotification = useCallback(
    (title: string, options: SendNotificationOptions = {}): boolean => {
      if (!('Notification' in window)) return false
      if (Notification.permission !== 'granted') return false

      const { url, ...rest } = options
      try {
        const notification = new Notification(title, {
          icon: DEFAULT_ICON,
          ...rest,
        })
        notification.onclick = (event) => {
          event.preventDefault()
          window.focus()
          if (url) {
            window.location.href = url
          }
          notification.close()
        }
        return true
      } catch {
        return false
      }
    },
    []
  )

  return { isSupported, permission, requestPermission, sendNotification }
}

export function hasAskedForNotificationPermission(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}
