import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useShopConfig } from '../../lib/store'
import {
  Loader, Eye, EyeOff, Lock, Mail, Package, Users, Wallet,
  ShieldCheck, CheckCircle2, Sparkles
} from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isForgot, setIsForgot] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const expired = searchParams.get('expired')
  const { setUser, setSession } = useAuthStore()
  const { config } = useShopConfig()

  // Animation du cycle (réception → lavage → séchage → prêt)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })
        if (error) throw error
        setError('✅ Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.')
        setIsForgot(false)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.session) {
        setSession(data.session)
        const { data: employee } = await supabase.from('employees').select('*').eq('user_id', data.user.id).single()
        if (employee) {
          setUser({ id: data.user.id, email: data.user.email || '', full_name: employee.full_name, phone: employee.phone || '', role: employee.role, agency_id: 'default', is_active: employee.is_active, permissions: employee.permissions || [], created_at: new Date().toISOString() })
        } else {
          setUser({ id: data.user.id, email: data.user.email || '', full_name: data.user.email?.split('@')[0] || 'Admin', phone: '', role: 'admin', agency_id: 'default', is_active: true, permissions: [], created_at: new Date().toISOString() })
        }
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const CYCLE_STEPS = [
    { label: 'Réception', icon: '🧺', color: '#a78bfa' },
    { label: 'Lavage', icon: '💧', color: '#60a5fa' },
    { label: 'Séchage', icon: '☀️', color: '#fbbf24' },
    { label: 'Prêt', icon: '✨', color: '#34d399' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-[#1e0b40] via-[#2d1264] to-[#4c1d95]">

      {/* ===== PARTIE GAUCHE — PRÉSENTATION ===== */}
      <div className="lg:w-3/5 flex flex-col justify-between p-8 lg:p-16 relative overflow-hidden">

        {/* Halos décoratifs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Header avec logo + badge pays */}
          <div className="flex items-center justify-between mb-16 lg:mb-24">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                {config.logo
                  ? <img src={config.logo} alt="logo" className="w-8 h-8 object-contain" />
                  : <span className="text-2xl">🧺</span>
                }
              </div>
              <div>
                <h1 className="text-white font-extrabold text-lg tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {config.name || 'PressingManager'}
                </h1>
                <p className="text-purple-200/70 text-xs font-medium">Console de gestion</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <span className="text-base">🇨🇮</span>
              <span className="text-purple-100 text-xs font-bold">Côte d'Ivoire</span>
            </div>
          </div>

          {/* Titre principal + slogan */}
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Sparkles size={14} className="text-pink-300" />
              <span className="text-purple-100 text-xs font-bold uppercase tracking-wider">Back-office privé</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Du linge propre,<br />
              <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                un code propre.
              </span>
            </h2>

            <p className="text-purple-100/80 text-base lg:text-lg leading-relaxed max-w-xl">
              Votre pressing, votre rythme. Suivez vos commandes, votre équipe et vos clients depuis un espace unique et sécurisé.
            </p>
          </div>

          {/* CYCLE DU LINGE — Élément signature */}
          <div className="max-w-2xl mb-10">
            <p className="text-purple-200/60 text-xs font-bold uppercase tracking-widest mb-4">
              Un cycle complet pour chaque commande
            </p>

            <div className="flex items-center gap-2 mb-4">
              {CYCLE_STEPS.map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${
                        activeStep === i
                          ? 'bg-white/20 backdrop-blur-md scale-110 shadow-lg shadow-purple-500/50'
                          : 'bg-white/5 backdrop-blur-md'
                      }`}
                      style={{
                        border: activeStep === i ? `2px solid ${step.color}` : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeStep === i ? `0 0 24px ${step.color}40` : 'none',
                      }}
                    >
                      <span>{step.icon}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      activeStep === i ? 'text-white' : 'text-purple-200/50'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < CYCLE_STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-white/10 relative -mt-6">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
                        style={{ width: activeStep > i ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 3 cartes features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            <FeatureCard icon={<Package size={20} />} title="Commandes" description="Suivi en temps réel" accent="#a78bfa" />
            <FeatureCard icon={<Users size={20} />} title="Clients" description="Fidélité et groupes" accent="#60a5fa" />
            <FeatureCard icon={<Wallet size={20} />} title="Caisse" description="Paiements et bilans" accent="#f472b6" />
          </div>
        </div>

        {/* Footer gauche */}
        <div className="relative z-10 mt-16 lg:mt-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-purple-200/50 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} />
              <span>Données chiffrées</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>Conforme RGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={14} />
              <span>Accès sécurisé</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PARTIE DROITE — FORMULAIRE ===== */}
      <div className="lg:w-2/5 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header du formulaire */}
            <div className="p-6 lg:p-8 pb-0">
              <div className="flex items-center gap-2 mb-1">
                <Lock size={16} className="text-purple-600" />
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Accès privé</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isForgot ? 'Mot de passe oublié' : 'Connexion'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {isForgot
                  ? 'Entrez votre email pour recevoir un lien de réinitialisation.'
                  : 'Entrez vos identifiants pour accéder à la console.'
                }
              </p>
            </div>

            {/* Messages */}
            <div className="px-6 lg:px-8 pt-4">
              {expired && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <span className="text-amber-600 text-lg leading-none mt-0.5">⏱️</span>
                  <p className="text-xs text-amber-800 font-medium">
                    Votre session a expiré après 30 minutes d'inactivité. Veuillez vous reconnecter.
                  </p>
                </div>
              )}
              {error && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${
                  error.includes('✅')
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {error}
                </div>
              )}
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="p-6 lg:p-8 pt-2 space-y-5">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 transition"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {!isForgot && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError('') }}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline transition"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 hover:from-purple-700 hover:via-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                {isForgot ? 'Envoyer le lien' : 'Se connecter'}
              </button>

              {isForgot && (
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError('') }}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-purple-600 transition"
                >
                  ← Retour à la connexion
                </button>
              )}

            </form>
          </div>

          <p className="text-center text-purple-200/50 text-xs mt-6">
            Fait en Côte d'Ivoire 🇨🇮 · © {new Date().getFullYear()} {config.name || 'PressingManager'}
          </p>

        </div>
      </div>
    </div>
  )
}

// ============================================
// Composant FeatureCard avec accent unique
// ============================================
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; accent: string }> = ({ icon, title, description, accent }) => (
  <div className="group p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300"
      style={{
        background: `${accent}20`,
        color: accent,
        border: `1px solid ${accent}30`,
      }}
    >
      {icon}
    </div>
    <p className="text-white font-bold text-sm mb-0.5">{title}</p>
    <p className="text-purple-200/60 text-xs">{description}</p>
  </div>
)