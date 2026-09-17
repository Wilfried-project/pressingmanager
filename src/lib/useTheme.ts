// src/lib/useTheme.ts
import { useEffect } from 'react'
import { useSettingsStore } from './settingsStore'

// ============================================
// Convertit un hex en RGB normalise "R G B"
// ============================================
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  }
}

function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return r + ' ' + g + ' ' + b
}

// ============================================
// Eclaircit ou foncit une couleur
// ============================================
function adjust(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)))
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ============================================
// Mélange deux couleurs (couleur1 = 100%, couleur2 = pct%)
// ============================================
function mix(hex1: string, hex2: string, pct: number): string {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  const f = (a: number, b: number) => Math.round(a * (1 - pct) + b * pct)
  return '#' + [
    f(c1.r, c2.r),
    f(c1.g, c2.g),
    f(c1.b, c2.b),
  ].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ============================================
// Calcule si une couleur est claire (pour texte on-primary)
// ============================================
function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.7
}

// ============================================
// Applique une couleur principale a toutes les variables CSS
// ============================================
export function applyPrimaryColor(hex: string) {
  if (!hex) return
  const root = document.documentElement

  // Couleur principale
  root.style.setProperty('--primary-rgb', rgbString(hex))

  // Texte sur la couleur (blanc ou noir selon luminance)
  const onPrimary = isLight(hex) ? '#131b2e' : '#ffffff'
  root.style.setProperty('--on-primary-rgb', rgbString(onPrimary))

  // Variante plus claire pour hover
  const container = adjust(hex, 5)
  root.style.setProperty('--primary-container-rgb', rgbString(container))

  // Fond doux (mélange blanc + couleur)
  const fixed = mix('#ffffff', hex, 0.12)
  root.style.setProperty('--primary-fixed-rgb', rgbString(fixed))
  const fixedDim = mix('#ffffff', hex, 0.25)
  root.style.setProperty('--primary-fixed-dim-rgb', rgbString(fixedDim))

  // Texte sur fond fixed
  root.style.setProperty('--on-primary-fixed-rgb', rgbString(hex))
  root.style.setProperty('--on-primary-fixed-variant-rgb', rgbString(adjust(hex, -10)))

  // Inverse
  root.style.setProperty('--inverse-primary-rgb', rgbString(mix('#ffffff', hex, 0.4)))

  // Texte sur container
  root.style.setProperty('--on-primary-container-rgb', rgbString(mix(hex, '#000000', 0.15)))

  // Meta theme-color pour mobile
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = hex
}

// ============================================
// HOOK : applique automatiquement la couleur du pressing
// ============================================
export function useTheme() {
  const settings = useSettingsStore(s => s.settings)

  useEffect(() => {
    if (settings?.theme?.primary_color) {
      applyPrimaryColor(settings.theme.primary_color)
    }
  }, [settings?.theme?.primary_color])
}
