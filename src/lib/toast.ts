// src/lib/toast.ts
// Helper centralise pour tous les toasts de l'app
// Utilise la lib 'sonner' (deja installee)
import { toast as sonnerToast } from 'sonner'

type ToastOptions = {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Toast de succes (vert)
 * Usage: toast.success('Commande enregistree', { description: '#PM-142' })
 */
export function success(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
    className: 'toast-success',
  })
}

/**
 * Toast d'erreur (rouge)
 * Usage: toast.error('Impossible de sauvegarder', { description: err.message })
 */
export function error(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 6000,
    action: options?.action,
    className: 'toast-error',
  })
}

/**
 * Toast d'avertissement (orange)
 * Usage: toast.warning('Stock faible', { description: 'Lessive < 5L' })
 */
export function warning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action,
    className: 'toast-warning',
  })
}

/**
 * Toast d'information (bleu)
 * Usage: toast.info('3 commandes en retard')
 */
export function info(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
    className: 'toast-info',
  })
}

/**
 * Toast de chargement (avec spinner)
 * Usage: const id = toast.loading('Enregistrement...'); toast.dismiss(id)
 */
export function loading(message: string) {
  return sonnerToast.loading(message)
}

/**
 * Fermer un toast specifique
 */
export function dismiss(id?: string | number) {
  sonnerToast.dismiss(id)
}

/**
 * Fermer tous les toasts
 */
export function dismissAll() {
  sonnerToast.dismiss()
}

/**
 * Toast avec confirmation (promesse)
 * Usage: toast.promise(saveOrder(), { loading: 'Enregistrement...', success: 'OK !', error: 'Erreur' })
 */
export function promise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
) {
  return sonnerToast.promise(promise, messages)
}

// Export par defaut (objet global)
export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  dismiss,
  dismissAll,
  promise,
}

export default toast
