// src/pages/onboarding/OnboardingWizard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useShopConfig } from '../../lib/store'
import { useSettingsStore } from '../../lib/settingsStore'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast'
import {
  Sparkles, Building2, Palette, Coins, Users, PartyPopper,
  ArrowRight, ArrowLeft, Check, SkipForward, Plus, Trash2, Shirt, UserPlus
} from 'lucide-react'

const STEPS = [
  { key: 'welcome',  label: 'Bienvenue',  icon: Sparkles,    canSkip: false },
  { key: 'identity', label: 'Identite',   icon: Building2,   canSkip: false },
  { key: 'color',    label: 'Couleur',    icon: Palette,     canSkip: true  },
  { key: 'services', label: 'Tarifs',     icon: Coins,       canSkip: true  },
  { key: 'team',     label: 'Equipe',     icon: Users,       canSkip: true  },
  { key: 'done',     label: 'Termine',    icon: PartyPopper, canSkip: false },
] as const

type StepKey = typeof STEPS[number]['key']

const COLORS_PRESETS = [
  { color: '#6c47ff', label: 'Violet' },
  { color: '#2563eb', label: 'Bleu' },
  { color: '#059669', label: 'Vert' },
  { color: '#dc2626', label: 'Rouge' },
  { color: '#d97706', label: 'Orange' },
  { color: '#0891b2', label: 'Cyan' },
  { color: '#7c2d12', label: 'Marron' },
  { color: '#1f2937', label: 'Anthracite' },
]

const DEFAULT_SERVICES = [
  { cloth_type: 'chemise',  service_type: 'lavage_simple', label: 'Chemise - Lavage',        price: 1500 },
  { cloth_type: 'pantalon', service_type: 'lavage_simple', label: 'Pantalon - Lavage',       price: 1500 },
  { cloth_type: 'costume',  service_type: 'nettoyage_sec', label: 'Costume - Nettoyage sec', price: 5000 },
  { cloth_type: 'robe',     service_type: 'nettoyage_sec', label: 'Robe - Nettoyage sec',    price: 3500 },
  { cloth_type: 'couette',  service_type: 'lavage_simple', label: 'Couette - Lavage',        price: 4000 },
]

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  }
}

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { config, setConfig } = useShopConfig()
  const {
    settings, loading, loadSettings, updateTheme,
    completeOnboarding, saveSettings,
  } = useSettingsStore()

  const [currentStep, setCurrentStep] = useState<StepKey>('welcome')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: config.name || '',
    slogan: config.slogan || '',
    primary_color: '#6c47ff',
  })

  const [services, setServices] = useState(DEFAULT_SERVICES)

  useEffect(() => { loadSettings() }, [])

  useEffect(() => {
    if (config.name) setForm(f => ({ ...f, name: config.name }))
    if (config.slogan) setForm(f => ({ ...f, slogan: config.slogan }))
  }, [config])

  useEffect(() => {
    if (settings?.theme?.primary_color) {
      setForm(f => ({ ...f, primary_color: settings.theme.primary_color }))
    }
  }, [settings])

  useEffect(() => {
    if (!form.primary_color) return
    const { r, g, b } = hexToRgb(form.primary_color)
    const root = document.documentElement
    root.style.setProperty('--primary-rgb', r + ' ' + g + ' ' + b)
    root.style.setProperty('--primary-container-rgb',
      Math.min(255, r + 20) + ' ' + Math.min(255, g + 20) + ' ' + Math.min(255, b + 20))
  }, [form.primary_color])

  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  const progress = ((currentIndex + 1) / STEPS.length) * 100

  const goNext = () => {
    const next = STEPS[currentIndex + 1]
    if (next) setCurrentStep(next.key)
  }

  const goBack = () => {
    const prev = STEPS[currentIndex - 1]
    if (prev) setCurrentStep(prev.key)
  }

  const skipStep = () => {
    const step = STEPS[currentIndex]
    if (step.canSkip) goNext()
  }

  const skipAll = async () => {
    if (!confirm('Passer la configuration ? Vous pourrez tout configurer plus tard dans Parametres.')) return
    setSaving(true)
    await completeOnboarding()
    navigate('/')
  }

  const saveIdentity = async () => {
    if (!form.name.trim()) { toast.warning('Nom manquant', { description: 'Veuillez saisir le nom de votre pressing' }); return false }
    setConfig({ ...config, name: form.name, slogan: form.slogan })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
        if (emp?.tenant_id) {
          await supabase.from('tenants').update({ name: form.name, slogan: form.slogan }).eq('id', emp.tenant_id)
        }
      }
    } catch (err) { console.error('Erreur sauvegarde identite:', err) }
    return true
  }

  const saveColor = async () => {
    updateTheme({ primary_color: form.primary_color })
    await saveSettings()
    return true
  }

  const saveServices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return true
      const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
      if (!emp?.tenant_id) return true

      const toInsert = services.filter(s => s.price > 0).map(s => ({
        tenant_id: emp.tenant_id,
        cloth_type: s.cloth_type,
        service_type: s.service_type,
        price: s.price,
      }))

      if (toInsert.length > 0) {
        await supabase.from('service_prices').upsert(toInsert, {
          onConflict: 'tenant_id,cloth_type,service_type',
        })
      }
    } catch (err) { console.error('Erreur sauvegarde services:', err) }
    return true
  }

  const handleNext = async () => {
    setSaving(true)
    let ok = true
    if (currentStep === 'identity') ok = await saveIdentity()
    else if (currentStep === 'color') ok = await saveColor()
    else if (currentStep === 'services') ok = await saveServices()
    setSaving(false)
    if (ok) goNext()
  }

  const handleFinish = async () => {
    setSaving(true)
    await completeOnboarding()
    setSaving(false)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-cyan-50">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {

      case 'welcome':
        return (
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-violet-500/30">
              <Sparkles size={40} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
              Bienvenue chez<br />
              <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                PressingManager
              </span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              En 2 minutes, configurez votre pressing et commencez a gerer comme un pro.
            </p>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mb-8 text-left">
              <p className="text-sm font-semibold text-violet-900 mb-3">Nous allons configurer :</p>
              <ul className="space-y-2 text-sm text-violet-700">
                <li>L identite de votre pressing</li>
                <li>Votre couleur principale</li>
                <li>Vos premiers tarifs</li>
                <li>Votre premiere invitation d equipe</li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">Rassurez-vous : tout est modifiable plus tard dans Parametres.</p>
          </div>
        )

      case 'identity':
        return (
          <div className="max-w-lg w-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
              <Building2 size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
              Comment s appelle votre pressing ?
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              C est ce nom qui apparaitra sur vos tickets, factures et messages clients.
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nom du pressing <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Pressing Elegance"
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Slogan <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.slogan}
                  onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
                  placeholder="Ex: Vos habits, notre passion !"
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )

      case 'color':
        return (
          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
                <Palette size={26} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                Choisissez votre couleur
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Elle s appliquera partout : boutons, badges, tickets. Tout devient votre marque.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-3">Couleur personnalisee</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="w-16 h-16 rounded-2xl border-2 border-slate-200 cursor-pointer p-1"
                  />
                  <div>
                    <p className="font-mono font-bold text-slate-900">{form.primary_color.toUpperCase()}</p>
                    <p className="text-xs text-slate-500">Cliquez pour ouvrir le picker</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Ou choisissez une suggestion</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS_PRESETS.map(({ color, label }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, primary_color: color }))}
                      title={label}
                      className={
                        'w-12 h-12 rounded-2xl border-4 transition-all ' +
                        (form.primary_color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105')
                      }
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Apercu en direct</p>
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: form.primary_color }}>
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                    {form.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <span className="text-white font-semibold text-sm truncate">
                    {form.name || 'Mon Pressing'}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.primary_color + '20' }}>
                      <Shirt size={14} style={{ color: form.primary_color }} />
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-200 rounded-full w-2/3 mb-1"></div>
                      <div className="h-1.5 bg-slate-100 rounded-full w-1/2"></div>
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: form.primary_color }}>
                    Nouvelle commande
                  </button>
                  <div className="flex gap-2">
                    <div className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: form.primary_color + '15', color: form.primary_color }}>
                      Pret
                    </div>
                    <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      Paye
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center mt-5">C est ce que vos clients verront</p>
            </div>
          </div>
        )

      case 'services':
        return (
          <div className="max-w-3xl w-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
              <Coins size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Vos premiers tarifs</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Nous avons pre-rempli 5 services courants. Modifiez les prix selon votre grille.
            </p>
            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-6">Service</div>
                <div className="col-span-4">Prix (XOF)</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              <div className="divide-y divide-slate-100">
                {services.map((service, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 px-5 py-4 items-center">
                    <div className="col-span-6">
                      <span className="font-semibold text-slate-800 text-sm">{service.label}</span>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={service.price}
                        onChange={e => {
                          const ns = [...services]
                          ns[idx] = { ...service, price: parseInt(e.target.value) || 0 }
                          setServices(ns)
                        }}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-violet-500 outline-none text-sm font-mono font-bold text-right"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setServices(services.filter((_, i) => i !== idx))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setServices([...services, { cloth_type: 'autre', service_type: 'lavage_simple', label: 'Nouveau service', price: 1000 }])}
                  className="text-sm font-bold text-violet-600 hover:text-violet-700 flex items-center gap-2"
                >
                  <Plus size={16} /> Ajouter un service
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <span className="text-lg">💡</span>
              <span>
                <strong className="text-amber-900">Astuce :</strong> ces prix sont utilises automatiquement lors de la creation d une commande.
              </span>
            </div>
          </div>
        )

      case 'team':
        return (
          <div className="max-w-lg w-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
              <Users size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Invitez votre equipe</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Creez un acces pour chaque employe (caissier, laveur, gerant). Chacun verra uniquement ce qui le concerne.
            </p>
            <div className="bg-violet-50 border-2 border-violet-100 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                  <UserPlus size={22} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-violet-900 mb-2">Comment ajouter vos employes ?</h3>
                  <p className="text-sm text-violet-700 mb-4 leading-relaxed">
                    Rendez-vous dans la page Gestion Utilisateurs apres cette configuration. Vous pourrez creer des comptes en 30 secondes pour chaque membre.
                  </p>
                  <button
                    type="button"
                    onClick={() => { skipStep(); setTimeout(() => navigate('/users'), 300) }}
                    className="text-sm font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1.5"
                  >
                    Aller sur la page Utilisateurs <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              💡 Vous n etes pas oblige de tout faire maintenant. Vous pourrez toujours ajouter des employes plus tard.
            </p>
          </div>
        )

      case 'done':
        return (
          <div className="text-center max-w-lg relative">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: ((i * 5) % 100) + '%',
                    top: '-10px',
                    backgroundColor: ['#6c47ff', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][i % 5],
                    animationDelay: (i * 0.1) + 's',
                    animationDuration: (2 + (i % 3)) + 's',
                  }}
                />
              ))}
            </div>
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
              <PartyPopper size={48} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
              Votre pressing est<br />
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-500 bg-clip-text text-transparent">
                pret a demarrer !
              </span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Felicitations <strong>{user?.full_name?.split(' ')[0] || ''}</strong> !
              Vous etes pare pour gerer votre pressing comme un pro.
            </p>
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recapitulatif</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={16} className="text-emerald-500" /> Identite : <strong>{form.name || 'Mon Pressing'}</strong>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={16} className="text-emerald-500" /> Couleur : <strong>{form.primary_color.toUpperCase()}</strong>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={16} className="text-emerald-500" /> Tarifs : <strong>{services.filter(s => s.price > 0).length} services</strong>
                </li>
              </ul>
            </div>
            <p className="text-sm text-slate-400">
              Vous pouvez tout modifier plus tard dans <strong>Parametres</strong>.
            </p>
          </div>
        )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 relative overflow-hidden flex flex-col">

      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <header className="relative z-10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30">
              P
            </div>
            <span className="font-black text-slate-900 tracking-tight hidden sm:block">PressingManager</span>
          </div>
          <div className="flex-1 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Etape {currentIndex + 1} sur {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500 rounded-full" style={{ width: progress + '%' }} />
            </div>
          </div>
          <button
            type="button"
            onClick={skipAll}
            disabled={saving}
            className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <SkipForward size={14} />
            <span className="hidden sm:inline">Passer</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full flex justify-center">
          {renderStep()}
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={currentIndex === 0 || saving}
            className="px-5 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-0 disabled:pointer-events-none flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-3">
            {STEPS[currentIndex].canSkip && currentStep !== 'done' && (
              <button
                type="button"
                onClick={skipStep}
                disabled={saving}
                className="px-4 py-3 rounded-xl font-semibold text-sm text-slate-500 hover:bg-white hover:text-slate-700 transition-all disabled:opacity-50"
              >
                Passer cette etape
              </button>
            )}
            {currentStep === 'done' ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-8 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Chargement...' : 'Commencer a gerer 🚀'}
              </button>
            ) : currentStep === 'welcome' ? (
              <button
                type="button"
                onClick={goNext}
                className="px-8 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                Commencer
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="px-8 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Enregistrement...' : 'Continuer'}
                {!saving && <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  )
}

export default OnboardingWizard

