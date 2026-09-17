// src/lib/useCommandPalette.ts
// Hook global pour ouvrir/fermer la palette de commandes
import { useEffect, useState } from 'react'

let globalOpen: (() => void) | null = null
let globalClose: (() => void) | null = null

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Enregistrer les fonctions globales
    globalOpen = () => setIsOpen(true)
    globalClose = () => setIsOpen(false)

    const handleKey = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K → ouvrir
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      // Esc → fermer
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      globalOpen = null
      globalClose = null
    }
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  }
}

// Fonctions exportées pour ouvrir depuis n'importe où
export function openCommandPalette() {
  if (globalOpen) globalOpen()
}

export function closeCommandPalette() {
  if (globalClose) globalClose()
}
