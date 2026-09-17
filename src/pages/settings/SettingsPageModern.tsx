// src/pages/settings/SettingsPageModern.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAuthStore, useShopConfig } from '../../lib/store'
import { useSettingsStore } from '../../lib/settingsStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Palette, Printer, Coins, Bell, Settings2, Database,
  Save, Upload, X, AlertTriangle, CheckCircle2, Eye, RotateCcw,
  ChevronRight, Sparkles, Smartphone, Search, History, Clock,
  TrendingUp, Wand2, Circle, Zap
} from 'lucide-react'
import { Field, Input, Select, Textarea, Button, Modal } from '../../components/ui'

// ============================================
// CONSTANTES
// ============================================
const SECTIONS = [
  { key: 'general',       label: 'General',            icon: Building2,  desc: 'Nom, logo, coordonnees' },
  { key: 'appearance',    label: 'Apparence',          icon: Palette,    desc: 'Couleurs et style' },
  { key: 'print',         label: 'Impression',         icon: Printer,    desc: 'Tickets et factures' },
  { key: 'currency',      label: 'Monnaie & Regional', icon: Coins,      desc: 'Devise, langue, fuseau' },
  { key: 'notifications', label: 'Notifications',      icon: Bell,       desc: 'Templates SMS et WhatsApp' },
  { key: 'rules',         label: 'Regles metier',      icon: Settings2,  desc: 'Delais, majorations, fidelite' },
  { key: 'system',        label: 'Systeme',            icon: Database,   desc: 'Sauvegarde, export, reset' },
  { key: 'history',       label: 'Historique',         icon: History,    desc: 'Audit et versions' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

const COLORS_PRESETS = [
  { color: '#630ed4', label: 'Violet (defaut)' },
  { color: '#2563eb', label: 'Bleu royal' },
  { color: '#059669', label: 'Vert emeraude' },
  { color: '#dc2626', label: 'Rouge' },
  { color: '#d97706', label: 'Orange' },
  { color: '#0891b2', label: 'Cyan' },
  { color: '#7c2d12', label: 'Marron' },
  { color: '#1f2937', label: 'Anthracite' },
]

const CURRENCIES = [
  { value: 'XOF', label: 'XOF - Franc CFA Ouest' },
  { value: 'XAF', label: 'XAF - Franc CFA Est' },
  { value: 'GNF', label: 'GNF - Franc Guinen' },
  { value: 'USD', label: 'USD - Dollar US' },
  { value: 'EUR', label: 'EUR - Euro' },
]

const PRESETS = [
  { key: 'standard', label: 'Pressing Standard', desc: 'Tous les modules classiques', icon: Building2, apply: (s: any) => s },
  { key: 'express', label: 'Pressing Express', desc: 'Traitement rapide, sans livraison', icon: Zap, apply: (s: any) => ({ ...s, business_rules: { ...s.business_rules, express_multiplier: 1.5, free_storage_days: 15 } }) },
  { key: 'premium', label: 'Pressing Haut de gamme', desc: 'VIP, fidelite renforcee', icon: Sparkles, apply: (s: any) => ({ ...s, business_rules: { ...s.business_rules, vip_multiplier: 1.3, points_per_1000_xof: 15, free_storage_days: 45 } }) },
]

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'jamais'
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'a l instant'
  if (min < 60) return 'il y a ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'il y a ' + h + 'h'
  return 'il y a ' + Math.floor(h / 24) + 'j'
}

// ============================================
// COMPOSANT
// ============================================
export const SettingsPageModern: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { config, setConfig } = useShopConfig()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    settings, loading, saving, error, dirty, history, loadingHistory,
    loadSettings, loadHistory, saveSettings, rollbackToVersion,
    updateTheme, updatePrint, updateRules, updateTemplates,
    discardChanges, getCompletion, getLastModified,
  } = useSettingsStore()

  const [activeSection, setActiveSection] = useState<SectionKey>('general')
  const [saved, setSaved] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetConfirmChecked, setResetConfirmChecked] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  const [form, setForm] = useState({
    name: config.name || '',
    slogan: config.slogan || '',
    logo: config.logo || '',
    phone: config.phone || '',
    email: config.email || '',
    address: config.address || '',
    currency: config.currency || 'XOF',
    footer: config.footer || '',
    msgReception: config.msgReception || '',
    msgPret: config.msgPret || '',
    rccm: '',
    cc: '',
  })

  // ============================================
  // CALLBACKS (declares AVANT les useEffect)
  // ============================================
  const handleSaveAll = React.useCallback(async () => {
    setConfig(form)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
        if (emp?.tenant_id) {
          await supabase.from('tenants').update({
            name: form.name,
            slogan: form.slogan,
            phone: form.phone,
            email: form.email,
            address: form.address,
            currency: form.currency,
            footer: form.footer,
            msg_reception: form.msgReception,
            msg_pret: form.msgPret,
            logo: form.logo,
          }).eq('id', emp.tenant_id)
        }
      }
    } catch (err) { console.error('Erreur sauvegarde tenants:', err) }

    await saveSettings()

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [form, config, setConfig, saveSettings])

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (settings) loadHistory()
  }, [settings?.version])

  useEffect(() => {
    setForm(f => ({
      ...f,
      name: config.name || f.name,
      slogan: config.slogan || f.slogan,
      logo: config.logo || f.logo,
      phone: config.phone || f.phone,
      email: config.email || f.email,
      address: config.address || f.address,
      currency: config.currency || f.currency,
      footer: config.footer || f.footer,
      msgReception: config.msgReception || f.msgReception,
      msgPret: config.msgPret || f.msgPret,
    }))
  }, [config])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && !saving) handleSaveAll()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(s => !s)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowPresets(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dirty, saving, handleSaveAll])

  // ============================================
  // HELPERS
  // ============================================
  const completion = getCompletion()
  const lastMod = getLastModified()

  const filteredSections = useMemo(() => {
    if (!searchQuery) return SECTIONS
    const q = searchQuery.toLowerCase()
    return SECTIONS.filter(s => s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
  }, [searchQuery])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo trop lourd - max 2 MB'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non connecte')
      const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
      const tenantId = emp?.tenant_id || 'default'
      const ext = file.name.split('.').pop()
      const fileName = tenantId + '/logo.' + ext
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
      const logoUrl = urlData.publicUrl
      setForm(f => ({ ...f, logo: logoUrl }))
      setConfig({ ...config, logo: logoUrl })
    } catch (err) {
      const reader = new FileReader()
      reader.onload = () => setForm(f => ({ ...f, logo: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const handleApplyPreset = async (preset: typeof PRESETS[0]) => {
    if (!settings) return
    const next = preset.apply(settings)
    updateRules(next.business_rules)
    updateTheme(next.theme || settings.theme)
    updatePrint(next.print_settings || settings.print_settings)
    setShowPresets(false)
  }

  const handleResetAllData = async () => {
    if (resetConfirmText !== form.name || !resetConfirmChecked) return
    setResetting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non connecte')
      const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
      const tenantId = emp?.tenant_id
      if (!tenantId) throw new Error('Pressing introuvable')

      await supabase.from('clothes').delete().eq('tenant_id', tenantId)
      await supabase.from('orders').delete().eq('tenant_id', tenantId)
      await supabase.from('clients').delete().eq('tenant_id', tenantId)
      await supabase.from('cash_transactions').delete().eq('tenant_id', tenantId)
      await supabase.from('cash_sessions').delete().eq('tenant_id', tenantId)
      await supabase.from('transactions').delete().eq('tenant_id', tenantId)
      await supabase.from('notifications').delete().eq('tenant_id', tenantId)
      await supabase.from('agenda_events').delete().eq('tenant_id', tenantId)
      await supabase.from('service_prices').delete().eq('tenant_id', tenantId)
      await supabase.from('sequence_counters').delete().eq('tenant_id', tenantId)
      await supabase.from('employees').delete().eq('tenant_id', tenantId).neq('user_id', session.user.id)

      alert('Toutes les donnees ont ete reinitialisees.')
      window.location.href = '/'
    } catch (err: any) {
      alert('Erreur lors de la reinitialisation : ' + (err.message || 'reessayez'))
    } finally {
      setResetting(false)
      setShowResetModal(false)
      setResetConfirmText('')
      setResetConfirmChecked(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  const exportBackup = () => {
    const data = JSON.stringify({ timestamp: new Date().toISOString(), config: form, settings, history }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup_' + new Date().toISOString().split('T')[0] + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ============ CARD HEADER ============ */
  const CardHeader: React.FC<{ icon: any; title: string; subtitle: string; badge?: string; badgeColor?: string }> = ({ icon: Icon, title, subtitle, badge, badgeColor = 'bg-emerald-50 text-emerald-700' }) => (
    <div className="flex items-start gap-4 mb-6 pb-5 border-b border-outline-variant/20">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, ' + (settings?.theme.primary_color || '#630ed4') + ' 0%, ' + (settings?.theme.primary_color || '#8b5cf6') + 'cc 100%)',
          color: '#fff'
        }}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-extrabold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </h3>
          {badge && (
            <span className={'badge-modern ' + badgeColor}>
              <span className="badge-dot bg-current" />
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
      </div>
    </div>
  )

  /* ============ RENDER SECTION ============ */
  const renderSection = () => {
    if (!settings) return null

    switch (activeSection) {

      case 'general':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Building2} title="Informations de votre pressing" subtitle="Logo, identite, coordonnees et mentions legales" />
            <div className="space-y-5">
              <Field label="Logo du pressing">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-outline-variant/40 flex items-center justify-center overflow-hidden bg-surface-container-low">
                    {form.logo
                      ? <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
                      : <Building2 size={32} className="text-on-surface-variant/30" />
                    }
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-fixed text-primary rounded-xl text-sm font-semibold hover:bg-primary-fixed/70 transition"
                    >
                      <Upload size={15} /> Choisir un logo
                    </button>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, logo: '' }))}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition"
                      >
                        <X size={15} /> Supprimer
                      </button>
                    )}
                    <p className="text-[11px] text-on-surface-variant">JPG, PNG, SVG - max 2 MB</p>
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom du pressing" required>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pressing Elegance" />
                </Field>
                <Field label="Slogan">
                  <Input value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))} placeholder="Ex: Vos habits, notre passion !" />
                </Field>
                <Field label="Telephone">
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 XX XX XX XX" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@monpressing.ci" />
                </Field>
                <Field label="N RCCM">
                  <Input value={form.rccm} onChange={e => setForm(f => ({ ...f, rccm: e.target.value }))} placeholder="CI-ABJ-2026-B-XXXXX" />
                </Field>
                <Field label="N Compte Contribuable">
                  <Input value={form.cc} onChange={e => setForm(f => ({ ...f, cc: e.target.value }))} placeholder="XXXXXXXX-X" />
                </Field>
              </div>

              <Field label="Adresse complete">
                <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse complete de votre pressing..." rows={2} />
              </Field>

              <Field label="Message de pied de ticket">
                <Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Ex: Merci pour votre confiance !" />
              </Field>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Palette} title="Personnalisation visuelle" subtitle="Couleurs, identite graphique et apercu live" />
            <div className="space-y-6">
              <Field label="Couleur principale">
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.theme.primary_color}
                    onChange={e => updateTheme({ primary_color: e.target.value })}
                    className="w-16 h-16 rounded-2xl border border-outline-variant/40 cursor-pointer p-1"
                  />
                  <div>
                    <p className="font-bold text-sm text-on-surface font-mono">{settings.theme.primary_color}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Utilisee sur les boutons, menus et tickets</p>
                  </div>
                </div>
              </Field>

              <div>
                <p className="text-sm font-semibold text-on-surface mb-3">Couleurs suggerees</p>
                <div className="flex flex-wrap gap-3">
                  {COLORS_PRESETS.map(({ color, label }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateTheme({ primary_color: color })}
                      title={label}
                      className={
                        'w-12 h-12 rounded-2xl border-4 transition-all ' +
                        (settings.theme.primary_color === color ? 'border-on-surface scale-110 shadow-md' : 'border-transparent hover:scale-105')
                      }
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-5 bg-surface-container-low/30">
                <p className="text-[11px] text-on-surface-variant font-bold uppercase mb-4 flex items-center gap-2">
                  <Eye size={14} /> Apercu en direct
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg overflow-hidden shadow-sm"
                    style={{ backgroundColor: settings.theme.primary_color }}
                  >
                    {form.logo ? <img src={form.logo} alt="logo" className="w-full h-full object-cover" /> : <Building2 size={22} />}
                  </div>
                  <div>
                    <p className="font-extrabold" style={{ color: settings.theme.primary_color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {form.name || 'Mon Pressing'}
                    </p>
                    <p className="text-xs text-on-surface-variant">{form.slogan || 'Gestion professionnelle'}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" className="px-4 py-2 text-white text-sm font-semibold rounded-xl shadow-sm" style={{ backgroundColor: settings.theme.primary_color }}>
                    Bouton principal
                  </button>
                  <button type="button" className="px-4 py-2 text-sm font-semibold rounded-xl border-2" style={{ borderColor: settings.theme.primary_color, color: settings.theme.primary_color }}>
                    Bouton secondaire
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'print':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Printer} title="Impression des tickets" subtitle="Format, options et apercu fidele" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <Field label="Format d'impression">
                  <Select value={settings.print_settings.format} onChange={e => updatePrint({ format: e.target.value as any })}>
                    <option value="58mm">58mm - Mini imprimante</option>
                    <option value="80mm">80mm - Standard caisse</option>
                    <option value="A4">A4 - Feuille standard</option>
                  </Select>
                </Field>

                <div className="space-y-2">
                  {[
                    { key: 'show_logo' as const, label: 'Afficher le logo sur le ticket' },
                    { key: 'show_qr' as const, label: 'Afficher le QR code client' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container transition">
                      <span className="text-sm font-medium text-on-surface">{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.print_settings[key] as boolean}
                        onChange={e => updatePrint({ [key]: e.target.checked } as any)}
                        className="w-5 h-5 rounded-md accent-primary cursor-pointer"
                      />
                    </label>
                  ))}
                </div>

                <Field label="Texte de pied de ticket">
                  <Input value={settings.print_settings.footer_text} onChange={e => updatePrint({ footer_text: e.target.value })} placeholder="Ex: Merci pour votre confiance !" />
                </Field>

                <Field label="Mention legale">
                  <Textarea value={settings.print_settings.legal_mention} onChange={e => updatePrint({ legal_mention: e.target.value })} rows={3} placeholder="Ex: Articles non reclames apres 3 mois..." />
                </Field>

                <button type="button" className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-sm transition flex items-center justify-center gap-2">
                  <Printer size={16} /> Tester une impression
                </button>
              </div>

              <div className="bg-surface-container-low/40 rounded-2xl p-5 flex items-start justify-center">
                <div className="w-full max-w-sm">
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase mb-3 text-center flex items-center justify-center gap-2">
                    <Eye size={14} /> Apercu du ticket
                  </p>
                  <div className="bg-white rounded-xl shadow-xl p-5 text-xs font-mono border border-outline-variant/20">
                    <div className="text-center pb-3 mb-3 border-b-2 border-dashed" style={{ borderColor: settings.theme.primary_color }}>
                      {settings.print_settings.show_logo && form.logo && (
                        <img src={form.logo} alt="logo" className="w-16 h-16 object-contain mx-auto mb-2" />
                      )}
                      <p className="font-extrabold text-sm uppercase tracking-wide" style={{ color: settings.theme.primary_color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {form.name || 'MON PRESSING'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{form.slogan || 'Gestion professionnelle'}</p>
                      {form.phone && <p className="text-[9px] text-gray-400 mt-1">{form.phone}</p>}
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between"><span className="text-gray-500">Ticket</span><span className="font-bold">#PM-2026-09-000142</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Client</span><span>Kouassi A.</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date().toLocaleDateString('fr-FR')}</span></div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-2 mb-2">
                      <div className="flex justify-between mb-1"><span className="font-bold">3x Chemise coton</span><span>4 500 XOF</span></div>
                      <div className="flex justify-between mb-1"><span className="font-bold">1x Costume 2 pieces</span><span>5 000 XOF</span></div>
                    </div>

                    <div className="border-t-2 pt-2 flex justify-between font-extrabold text-sm" style={{ borderColor: settings.theme.primary_color, color: settings.theme.primary_color }}>
                      <span>TOTAL</span><span>9 500 XOF</span>
                    </div>

                    {settings.print_settings.show_qr && (
                      <div className="mt-3 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded mx-auto flex items-center justify-center text-[8px] text-gray-400 border border-gray-200">QR</div>
                        <p className="text-[8px] text-gray-400 mt-1">Scannez pour le detail</p>
                      </div>
                    )}

                    <p className="text-center text-[10px] text-gray-600 mt-4 italic">{settings.print_settings.footer_text}</p>
                    {settings.print_settings.legal_mention && (
                      <p className="text-center text-[8px] text-gray-400 mt-2 leading-tight">{settings.print_settings.legal_mention}</p>
                    )}
                    <p className="text-center text-[8px] text-gray-400 mt-3 border-t border-dashed border-gray-200 pt-2">
                      Format {settings.print_settings.format} - {new Date().toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'currency':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Coins} title="Monnaie & Parametres regionaux" subtitle="Devise, langue, fuseau horaire et formats" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Devise principale">
                <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Langue de l'interface">
                <Select defaultValue="fr">
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              <Field label="Fuseau horaire">
                <Select defaultValue="gmt">
                  <option value="gmt">GMT+00:00 - Abidjan, Dakar</option>
                  <option value="gmt1">GMT+01:00 - Douala, Yaounde</option>
                  <option value="gmt2">GMT+02:00 - Paris</option>
                </Select>
              </Field>
              <Field label="Format de date">
                <Select defaultValue="fr">
                  <option value="fr">JJ/MM/AAAA</option>
                  <option value="us">MM/DD/YYYY</option>
                  <option value="iso">YYYY-MM-DD</option>
                </Select>
              </Field>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Bell} title="Messages automatiques" subtitle="Templates WhatsApp envoyes a vos clients" />
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">i</div>
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-1">Variables disponibles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['{prenom}', '{ticket}', '{nb}', '{date}', '{total}', '{reste}', '{adresse}', '{nom}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono">{v}</code>
                    ))}
                  </div>
                </div>
              </div>

              <Field label="Message de reception (a la creation de commande)">
                <Textarea value={form.msgReception} onChange={e => setForm(f => ({ ...f, msgReception: e.target.value }))} rows={5} placeholder="Bonjour {prenom}, votre commande {ticket}..." />
              </Field>

              {form.msgReception && (
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-2">Apercu envoye</p>
                  <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                    {form.msgReception.replace('{prenom}', 'Kouassi').replace('{nb}', '3').replace('{ticket}', 'PM-123456').replace('{date}', '15/08/2026').replace('{total}', '7 500').replace('{adresse}', form.address || 'Abidjan').replace('{nom}', form.name || 'Mon Pressing')}
                  </p>
                </div>
              )}

              <Field label="Message vetements prets">
                <Textarea value={form.msgPret} onChange={e => setForm(f => ({ ...f, msgPret: e.target.value }))} rows={5} placeholder="Bonjour {prenom}, vos vetements sont prets !..." />
              </Field>

              {form.msgPret && (
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-2">Apercu envoye</p>
                  <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                    {form.msgPret.replace('{prenom}', 'Kouassi').replace('{nb}', '3').replace('{ticket}', 'PM-123456').replace('{reste}', '5 000').replace('{adresse}', form.address || 'Abidjan').replace('{nom}', form.name || 'Mon Pressing')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )

      case 'rules':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={Settings2} title="Regles metier" subtitle="Delais, majorations, fidelite et caisse automatique" />
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                  <Clock size={12} /> Delais & Gardiennage
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Jours de garde gratuite" hint="Au-dela, des penalites s'appliquent">
                    <Input type="number" min="0" value={settings.business_rules.free_storage_days} onChange={e => updateRules({ free_storage_days: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Max commandes par jour" hint="Limite la surcharge de l'atelier">
                    <Input type="number" min="1" value={settings.business_rules.max_orders_per_day} onChange={e => updateRules({ max_orders_per_day: parseInt(e.target.value) || 10 })} />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                  <TrendingUp size={12} /> Majorations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Multiplicateur Express" hint="1.5 = +50% sur la commande">
                    <Input type="number" step="0.1" min="1" value={settings.business_rules.express_multiplier} onChange={e => updateRules({ express_multiplier: parseFloat(e.target.value) || 1.5 })} />
                  </Field>
                  <Field label="Multiplicateur VIP" hint="1.2 = +20% sur la commande">
                    <Input type="number" step="0.1" min="1" value={settings.business_rules.vip_multiplier} onChange={e => updateRules({ vip_multiplier: parseFloat(e.target.value) || 1.2 })} />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                  <Sparkles size={12} /> Programme de fidelite
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Points pour 1000 XOF" hint="Combien de points par 1000 XOF payes">
                    <Input type="number" min="0" value={settings.business_rules.points_per_1000_xof} onChange={e => updateRules({ points_per_1000_xof: parseInt(e.target.value) || 10 })} />
                  </Field>
                  <Field label="Valeur d'un point (XOF)" hint="Combien vaut 1 point en XOF">
                    <Input type="number" min="0" value={settings.business_rules.points_to_xof_rate} onChange={e => updateRules({ points_to_xof_rate: parseInt(e.target.value) || 10 })} />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase mb-3 flex items-center gap-2">
                  <Coins size={12} /> Caisse automatique
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Heure d'ouverture" hint="La caisse s'ouvre automatiquement apres cette heure">
                    <Input type="time" value={settings.business_rules.cash_open_time} onChange={e => updateRules({ cash_open_time: e.target.value })} />
                  </Field>
                  <Field label="Heure de fermeture" hint="La caisse se ferme automatiquement apres cette heure">
                    <Input type="time" value={settings.business_rules.cash_close_time} onChange={e => updateRules({ cash_close_time: e.target.value })} />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )

      case 'system':
        return (
          <div className="space-y-5 animate-fade-in">
            <div className="card-modern">
              <CardHeader icon={CheckCircle2} title="Sauvegarde & Securite" subtitle="Etat du systeme et donnees" badge="Tout est OK" />
              <div className="space-y-2">
                {[
                  { label: 'Sauvegarde automatique', status: 'Active', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
                  { label: 'Chiffrement donnees', status: 'Active (Supabase)', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
                  { label: 'Authentification 2FA', status: 'Bientot', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
                  { label: 'Audit trail', status: 'Active', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl">
                    <span className="text-sm font-medium text-on-surface">{item.label}</span>
                    <span className={'badge-modern ' + item.color}>
                      <span className={'badge-dot ' + item.dot} />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-modern">
              <CardHeader icon={Database} title="Gestion des donnees" subtitle="Export, sauvegarde et reset" />
              <div className="space-y-2">
                <button type="button" onClick={exportBackup} className="w-full py-3 bg-primary-fixed text-primary rounded-xl text-sm font-semibold hover:bg-primary-fixed/70 transition flex items-center justify-center gap-2">
                  <Save size={16} /> Exporter mes parametres (JSON)
                </button>
                {user?.role === 'admin' && (
                  <button type="button" onClick={() => setShowResetModal(true)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2">
                    <RotateCcw size={16} /> Reinitialiser toutes les donnees
                  </button>
                )}
              </div>
            </div>

            <div className="card-modern">
              <CardHeader icon={Smartphone} title="Ma session" subtitle={user?.email || ''} />
              <button type="button" onClick={handleLogout} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition">
                Se deconnecter
              </button>
            </div>
          </div>
        )

      case 'history':
        return (
          <div className="card-modern animate-fade-in">
            <CardHeader icon={History} title="Historique des modifications" subtitle="Audit trail complet de vos changements" badge={history.length + ' versions'} badgeColor="bg-primary-fixed text-primary" />
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <History size={40} className="text-on-surface-variant/30 mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant">Aucun historique pour le moment</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-outline-variant/30" />
                <div className="space-y-4">
                  {history.map((entry, i) => (
                    <div key={entry.id} className="relative flex items-start gap-4">
                      <div className={'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ' + (i === 0 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant')}>
                        {i === 0 ? <Sparkles size={16} /> : <Circle size={12} fill="currentColor" />}
                      </div>
                      <div className="flex-1 min-w-0 bg-surface-container-low rounded-2xl p-4 hover:bg-surface-container transition">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-on-surface truncate">{entry.changed_by_name || 'Systeme'}</p>
                              <span className={'badge-modern ' + (i === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant')}>v{entry.version}</span>
                              <span className={'badge-modern ' + (entry.action === 'create' ? 'bg-blue-50 text-blue-700' : entry.action === 'rollback' ? 'bg-amber-50 text-amber-700' : 'bg-primary-fixed text-primary')}>
                                {entry.action}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1">{entry.changed_by_email || 'Email inconnu'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-on-surface">{timeAgo(entry.changed_at)}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{new Date(entry.changed_at).toLocaleString('fr-FR')}</p>
                          </div>
                        </div>
                        {i > 0 && (
                          <button type="button" onClick={() => { if (confirm('Restaurer la v' + entry.version + ' ?')) rollbackToVersion(entry.version) }} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                            <RotateCcw size={12} /> Restaurer cette version
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
    }
    return null
  }

  if (loading || !settings) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="h-20 rounded-2xl skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="h-[500px] rounded-2xl skeleton" />
          <div className="h-[500px] rounded-2xl skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <span>Parametres</span>
          <ChevronRight size={12} />
          <span className="text-primary">{SECTIONS.find(s => s.key === activeSection)?.label}</span>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Parametres</h1>
              <span className="badge-modern bg-primary-fixed text-primary"><Sparkles size={12} />Configuration centrale</span>
              <span className="badge-modern bg-surface-container text-on-surface-variant text-[10px]">v{settings.version || 1}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
              <span className="flex items-center gap-1.5"><Clock size={12} />Derniere modif {timeAgo(lastMod.date)} par <span className="font-semibold text-on-surface">{lastMod.name}</span></span>
              <span className="hidden sm:inline">•</span>
              <span>{form.name || 'Pressing'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <button type="button" onClick={() => setShowSearch(true)} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium text-sm transition">
              <Search size={15} />
              <span className="hidden sm:inline">Rechercher</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-white text-[10px] font-mono border border-outline-variant/30">{navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}</kbd>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || !dirty}
              className={'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ' + (saving ? 'bg-surface-container text-on-surface-variant cursor-wait' : !dirty ? 'bg-surface-container text-on-surface-variant cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-container hover:shadow-lg')}
            >
              <Save size={16} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="card-modern">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 size={16} className="text-primary" />
              <span className="text-sm font-bold text-on-surface">Configuration du pressing</span>
            </div>
            <span className="text-sm font-extrabold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{completion.percentage}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: completion.percentage + '%', background: 'linear-gradient(90deg, ' + settings.theme.primary_color + ' 0%, ' + settings.theme.primary_color + 'cc 100%)' }} />
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">{completion.completed} sur {completion.total} elements de configuration completes</p>
        </div>
      </div>

      {saved && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xl animate-fade-in max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
          <div>
            <p className="text-sm font-bold text-emerald-800">Parametres sauvegardes</p>
            <p className="text-xs text-emerald-600 mt-0.5">Version v{settings.version || 1} enregistree</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
          <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-modern !p-2 flex flex-col gap-1">
            <button type="button" onClick={() => setShowPresets(true)} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-sm hover:shadow-md transition-all mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><Wand2 size={16} /></div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm">Pre-reglages</p>
                <p className="text-[10px] text-white/70">Presets par type de pressing</p>
              </div>
              <ChevronRight size={14} className="text-white/70" />
            </button>

            <div className="h-px bg-outline-variant/20 my-1" />

            {SECTIONS.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ' + (isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface-container text-on-surface-variant')}
                >
                  <div className={'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ' + (isActive ? 'bg-white/15 text-white' : 'bg-surface-container-low text-primary group-hover:bg-white')}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={'font-semibold text-sm truncate ' + (isActive ? 'text-white' : 'text-on-surface')}>{section.label}</p>
                    <p className={'text-[10px] truncate ' + (isActive ? 'text-white/70' : 'text-on-surface-variant')}>{section.desc}</p>
                  </div>
                  <ChevronRight size={14} className={isActive ? 'text-white/70' : 'text-on-surface-variant/40 group-hover:text-primary transition'} />
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">{renderSection()}</div>
      </div>

      <div className={'fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ' + (dirty ? 'translate-y-0' : 'translate-y-full')}>
        <div className="bg-white/95 backdrop-blur-md border-t border-outline-variant/30 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)]">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="badge-dot bg-amber-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-on-surface">Modifications non enregistrees</p>
                <p className="text-[11px] text-on-surface-variant">Cliquez sur Enregistrer ou faites {navigator.platform.toLowerCase().includes('mac') ? '⌘S' : 'Ctrl+S'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={discardChanges} className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-semibold text-sm transition">Annuler</button>
              <button type="button" onClick={handleSaveAll} disabled={saving} className="btn-modern-primary">
                <Save size={16} />
                {saving ? 'Enregistrement...' : 'Enregistrer maintenant'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showSearch} onClose={() => { setShowSearch(false); setSearchQuery('') }} title="Rechercher une section" size="sm">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ex: couleur, ticket, fidelite..."
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
            />
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredSections.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-6">Aucune section trouvee</p>
            ) : filteredSections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => { setActiveSection(section.key); setShowSearch(false); setSearchQuery('') }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center shrink-0"><Icon size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-on-surface">{section.label}</p>
                    <p className="text-xs text-on-surface-variant truncate">{section.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-on-surface-variant/50" />
                </button>
              )
            })}
          </div>
        </div>
      </Modal>

      <Modal open={showPresets} onClose={() => setShowPresets(false)} title="Pre-reglages par type de pressing" size="md">
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant mb-4">Choisissez un pre-reglage pour appliquer automatiquement les meilleures pratiques.</p>
          {PRESETS.map(preset => {
            const Icon = preset.icon
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-primary-fixed/30 border border-outline-variant/30 hover:border-primary/40 transition text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{preset.label}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{preset.desc}</p>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant/50" />
              </button>
            )
          })}
        </div>
      </Modal>

      <Modal open={showResetModal} onClose={() => { setShowResetModal(false); setResetConfirmText(''); setResetConfirmChecked(false) }} title="Reinitialiser toutes les donnees" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">Cette action supprime <strong>definitivement</strong> toutes les donnees de <strong>{form.name}</strong>. Impossible a annuler.</p>
          </div>
          <Field label={'Tapez "' + form.name + '" pour confirmer'}>
            <Input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)} placeholder={form.name} />
          </Field>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={resetConfirmChecked} onChange={e => setResetConfirmChecked(e.target.checked)} className="mt-0.5 w-4 h-4" />
            <span className="text-sm text-on-surface-variant">Je comprends que cette action est irreversible.</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="danger" className="flex-1" loading={resetting} disabled={resetConfirmText !== form.name || !resetConfirmChecked} onClick={handleResetAllData}>Confirmer</Button>
            <Button variant="secondary" className="flex-1" onClick={() => { setShowResetModal(false); setResetConfirmText(''); setResetConfirmChecked(false) }}>Annuler</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsPageModern
