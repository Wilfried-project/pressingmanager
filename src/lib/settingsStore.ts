// src/lib/settingsStore.ts
import { create } from 'zustand'
import { supabase } from './supabase'

// ============================================
// TYPES
// ============================================
export interface ThemeSettings {
  primary_color: string
  accent_color: string
  mode: 'light' | 'dark' | 'auto'
  border_radius: 'small' | 'medium' | 'large' | 'xlarge'
  font: 'jakarta' | 'manrope' | 'inter' | 'system'
}

export interface PrintSettings {
  format: '58mm' | '80mm' | 'A4'
  show_logo: boolean
  show_qr: boolean
  footer_text: string
  legal_mention: string
}

export interface BusinessRules {
  free_storage_days: number
  express_multiplier: number
  vip_multiplier: number
  points_per_1000_xof: number
  points_to_xof_rate: number
  max_orders_per_day: number
  cash_open_time: string
  cash_close_time: string
}

export interface Templates {
  sms_reception: string
  sms_pret: string
  whatsapp_reception: string
  whatsapp_pret: string
}

export interface TenantSettings {
  tenant_id: string
  theme: ThemeSettings
  print_settings: PrintSettings
  business_rules: BusinessRules
  templates: Templates
  onboarding_completed: boolean
  version?: number
  updated_at?: string
  updated_by_name?: string
  updated_by_email?: string
}

export interface HistoryEntry {
  id: string
  tenant_id: string
  changed_by_name: string | null
  changed_by_email: string | null
  changed_at: string
  snapshot: any
  version: number
  action: 'create' | 'update' | 'rollback' | 'reset'
}

const DEFAULT_THEME: ThemeSettings = {
  primary_color: '#630ed4',
  accent_color: '#06b6d4',
  mode: 'light',
  border_radius: 'large',
  font: 'jakarta',
}

const DEFAULT_PRINT: PrintSettings = {
  format: '80mm',
  show_logo: true,
  show_qr: true,
  footer_text: 'Merci pour votre confiance !',
  legal_mention: 'Articles non reclamés apres 3 mois cedes a une oeuvre.',
}

const DEFAULT_RULES: BusinessRules = {
  free_storage_days: 30,
  express_multiplier: 1.5,
  vip_multiplier: 1.2,
  points_per_1000_xof: 10,
  points_to_xof_rate: 10,
  max_orders_per_day: 10,
  cash_open_time: '08:00',
  cash_close_time: '20:00',
}

const DEFAULT_TEMPLATES: Templates = {
  sms_reception: '',
  sms_pret: '',
  whatsapp_reception: '',
  whatsapp_pret: '',
}

export const DEFAULT_SETTINGS: Omit<TenantSettings, 'tenant_id'> = {
  theme: DEFAULT_THEME,
  print_settings: DEFAULT_PRINT,
  business_rules: DEFAULT_RULES,
  templates: DEFAULT_TEMPLATES,
  onboarding_completed: false,
}

// ============================================
// STORE
// ============================================
interface SettingsState {
  settings: TenantSettings | null
  tenantId: string | null
  history: HistoryEntry[]
  loading: boolean
  loadingHistory: boolean
  saving: boolean
  error: string | null
  dirty: boolean
  originalSnapshot: string | null

  // Actions
  loadSettings: () => Promise<void>
  loadHistory: () => Promise<void>
  saveSettings: (partial?: Partial<TenantSettings>) => Promise<boolean>
  rollbackToVersion: (version: number) => Promise<boolean>
  updateTheme: (patch: Partial<ThemeSettings>) => void
  updatePrint: (patch: Partial<PrintSettings>) => void
  updateRules: (patch: Partial<BusinessRules>) => void
  updateTemplates: (patch: Partial<Templates>) => void
  completeOnboarding: () => Promise<void>
  discardChanges: () => void
  reset: () => void
  getCompletion: () => { percentage: number; completed: number; total: number }
  getLastModified: () => { name: string; date: string | null }
}

async function getCurrentUserInfo() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { userId: null, tenantId: null, name: null, email: null }
  const { data: emp } = await supabase
    .from('employees')
    .select('tenant_id, full_name')
    .eq('user_id', session.user.id)
    .single()
  return {
    userId: session.user.id,
    tenantId: emp?.tenant_id || null,
    name: emp?.full_name || null,
    email: session.user.email || null,
  }
}

function computeCompletion(settings: TenantSettings | null): { percentage: number; completed: number; total: number } {
  if (!settings) return { percentage: 0, completed: 0, total: 6 }
  let completed = 0
  const total = 6

  // Theme personnalise
  if (settings.theme.primary_color !== DEFAULT_THEME.primary_color) completed++
  // Template reception rempli
  if (settings.templates.whatsapp_reception || settings.templates.sms_reception) completed++
  // Template pret rempli
  if (settings.templates.whatsapp_pret || settings.templates.sms_pret) completed++
  // Footer ticket personnalise
  if (settings.print_settings.footer_text !== DEFAULT_PRINT.footer_text) completed++
  // Regles metier personnalisees
  if (settings.business_rules.free_storage_days !== DEFAULT_RULES.free_storage_days ||
      settings.business_rules.points_per_1000_xof !== DEFAULT_RULES.points_per_1000_xof) completed++
  // Onboarding complete
  if (settings.onboarding_completed) completed++

  return { percentage: Math.round((completed / total) * 100), completed, total }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  tenantId: null,
  history: [],
  loading: false,
  loadingHistory: false,
  saving: false,
  error: null,
  dirty: false,
  originalSnapshot: null,

  loadSettings: async () => {
    set({ loading: true, error: null })
    try {
      const { tenantId } = await getCurrentUserInfo()
      if (!tenantId) {
        set({ loading: false, error: 'Aucun pressing associe' })
        return
      }

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      let settings: TenantSettings

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('tenant_settings')
          .insert({ tenant_id: tenantId })
          .select()
          .single()
        if (createError) throw createError
        settings = created as TenantSettings
      } else {
        settings = data as TenantSettings
      }

      set({
        settings,
        tenantId,
        loading: false,
        dirty: false,
        error: null,
        originalSnapshot: JSON.stringify(settings),
      })
    } catch (err: any) {
      console.error('Erreur chargement settings:', err)
      set({
        loading: false,
        error: err.message || 'Erreur de chargement',
      })
    }
  },

  loadHistory: async () => {
    const { tenantId } = get()
    if (!tenantId) return

    set({ loadingHistory: true })
    try {
      const { data, error } = await supabase
        .from('tenant_settings_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('changed_at', { ascending: false })
        .limit(20)

      if (error) throw error
      set({ history: (data || []) as HistoryEntry[], loadingHistory: false })
    } catch (err: any) {
      console.error('Erreur chargement historique:', err)
      set({ loadingHistory: false })
    }
  },

  saveSettings: async (partial) => {
    const { settings, tenantId } = get()
    if (!tenantId || !settings) return false

    set({ saving: true, error: null })
    try {
      const toSave = partial ? { ...settings, ...partial } : settings
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          theme: toSave.theme,
          print_settings: toSave.print_settings,
          business_rules: toSave.business_rules,
          templates: toSave.templates,
          onboarding_completed: toSave.onboarding_completed,
        })
        .eq('tenant_id', tenantId)

      if (error) throw error

      // Recharger pour avoir les infos du trigger (version, updated_by_name)
      const { data: refreshed } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      const finalSettings = refreshed || toSave

      set({
        settings: finalSettings as TenantSettings,
        saving: false,
        dirty: false,
        originalSnapshot: JSON.stringify(finalSettings),
      })

      // Recharger l'historique
      get().loadHistory()

      return true
    } catch (err: any) {
      console.error('Erreur sauvegarde settings:', err)
      set({ saving: false, error: err.message || 'Erreur de sauvegarde' })
      return false
    }
  },

  rollbackToVersion: async (version) => {
    const { history, tenantId, settings } = get()
    if (!tenantId || !settings) return false

    const target = history.find(h => h.version === version)
    if (!target) return false

    set({ saving: true, error: null })
    try {
      const snap = target.snapshot
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          theme: snap.theme,
          print_settings: snap.print_settings,
          business_rules: snap.business_rules,
          templates: snap.templates,
          onboarding_completed: snap.onboarding_completed,
        })
        .eq('tenant_id', tenantId)

      if (error) throw error

      await supabase
        .from('tenant_settings_history')
        .insert({
          tenant_id: tenantId,
          action: 'rollback',
          snapshot: snap,
          version: (settings.version || 1) + 1,
        })

      await get().loadSettings()
      set({ saving: false })
      return true
    } catch (err: any) {
      console.error('Erreur rollback:', err)
      set({ saving: false, error: err.message || 'Erreur de rollback' })
      return false
    }
  },

  updateTheme: (patch) => {
    const { settings } = get()
    if (!settings) return
    set({
      settings: { ...settings, theme: { ...settings.theme, ...patch } },
      dirty: true,
    })
  },

  updatePrint: (patch) => {
    const { settings } = get()
    if (!settings) return
    set({
      settings: { ...settings, print_settings: { ...settings.print_settings, ...patch } },
      dirty: true,
    })
  },

  updateRules: (patch) => {
    const { settings } = get()
    if (!settings) return
    set({
      settings: { ...settings, business_rules: { ...settings.business_rules, ...patch } },
      dirty: true,
    })
  },

  updateTemplates: (patch) => {
    const { settings } = get()
    if (!settings) return
    set({
      settings: { ...settings, templates: { ...settings.templates, ...patch } },
      dirty: true,
    })
  },

  completeOnboarding: async () => {
    const { settings } = get()
    if (!settings) return
    set({
      settings: { ...settings, onboarding_completed: true },
      dirty: true,
    })
    await get().saveSettings()
  },

  discardChanges: () => {
    const { originalSnapshot } = get()
    if (!originalSnapshot) return
    try {
      const original = JSON.parse(originalSnapshot)
      set({ settings: original, dirty: false })
    } catch (e) { /* ignore */ }
  },

  reset: () => set({
    settings: null,
    tenantId: null,
    history: [],
    loading: false,
    loadingHistory: false,
    saving: false,
    error: null,
    dirty: false,
    originalSnapshot: null,
  }),

  getCompletion: () => computeCompletion(get().settings),

  getLastModified: () => {
    const { history } = get()
    if (!history || history.length === 0) return { name: 'Jamais', date: null }
    const last = history[0]
    return {
      name: last.changed_by_name || 'Systeme',
      date: last.changed_at,
    }
  },
}))
