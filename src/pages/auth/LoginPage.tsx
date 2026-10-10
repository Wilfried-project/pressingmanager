import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useShopConfig } from '../../lib/store'
import {
  Loader, Eye, EyeOff, Lock, Mail, Package, Users, Wallet,
  ShieldCheck, CheckCircle2, Sparkles, Timer, TrendingUp, Smartphone,
  Quote, Droplet, Wind
} from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isForgot, setIsForgot] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [rememberMe, setRememberMe] = useState(false)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const expired = searchParams.get('expired')
  const { setUser, setSession } = useAuthStore()
  const { config } = useShopConfig()

  // Animation du cycle (réception → lavage → séchage → prêt)
  useEffect(() => {
    setMounted(true)
    const savedEmail = localStorage.getItem('pm_remember_email') || localStorage.getItem('pm-remember-me')
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true) }
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4)
    }, 1800)
    const testi = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % 3)
    }, 4000)
    return () => { clearInterval(interval); clearInterval(testi) }
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
      if (rememberMe) { localStorage.setItem('pm-remember-me', email); localStorage.setItem('pm_remember_email', email) }
      else { localStorage.removeItem('pm-remember-me'); localStorage.removeItem('pm_remember_email') }

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
    { label: 'Réception', Icon: Package, color: '#c4b5fd' },
    { label: 'Lavage', Icon: Droplet, color: '#c4b5fd' },
    { label: 'Séchage', Icon: Wind, color: '#c4b5fd' },
    { label: 'Prêt', Icon: CheckCircle2, color: '#c4b5fd' },
  ]

  const TESTIMONIALS = [
    { text: 'PressingManager a changé ma vie', author: 'Kouassi A.', role: 'Pressing Étoile, Abidjan' },
    { text: 'Je gagne 2h par jour', author: 'Fanta K.', role: 'Pressing Fanta, Cocody' },
    { text: '+30% de CA en 3 mois', author: 'Diallo M.', role: 'Pressing Royal, Plateau' },
  ]

  const BENEFITS = [
    { icon: <Timer size={18} />, title: 'Gagnez 2h par jour', desc: 'Tickets & caisse en 1 clic', accent: '#34d399' },
    { icon: <CheckCircle2 size={18} />, title: 'Zéro perte de vêtements', desc: 'Suivi ticket par ticket', accent: '#60a5fa' },
    { icon: <TrendingUp size={18} />, title: '+30% de chiffre d’affaires', desc: 'Relances & fidélité auto', accent: '#fbbf24' },
    { icon: <Smartphone size={18} />, title: 'Clients notifiés auto', desc: 'WhatsApp & SMS prêts', accent: '#f472b6' },
  ]

  return (
    <>
    <style>{`
      @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes logoPop { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes shineSweep { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(250%) skewX(-20deg); } }
      @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); } 70% { box-shadow: 0 0 0 12px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
      @keyframes fadeSlide { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
      .animate-gradient-slow { background-size: 200% 200%; animation: gradientMove 20s ease infinite; }
      .animate-logo-pop { animation: logoPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
      .animate-fade-slide { animation: fadeSlide 0.5s ease both; }
      .btn-shine { position: relative; overflow: hidden; }
      .btn-shine::after { content: ''; position: absolute; top: 0; left: 0; width: 40%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: translateX(-150%) skewX(-20deg); animation: shineSweep 3s ease-in-out infinite; }
      .cycle-active { animation: pulseRing 1.8s ease-out infinite; }
    `}</style>
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-[#1e0b40] via-[#2d1264] via-[#3b1478] to-[#4c1d95] animate-gradient-slow">

      {/* ===== PARTIE GAUCHE — PRÉSENTATION ===== */}
      <div className="lg:w-3/5 flex flex-col justify-between p-8 lg:p-16 relative overflow-hidden">

        {/* Halos décoratifs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Header avec logo + badge pays */}
          <div className="flex items-center justify-between mb-16 lg:mb-24">
            <div className={`flex items-center gap-3 ${mounted ? 'animate-logo-pop' : 'opacity-0'}`}>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg shadow-purple-900/40">
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
                une gestion propre.
              </span>
            </h2>

            <p className="text-purple-100/80 text-base lg:text-lg leading-relaxed max-w-xl">
              Votre pressing, votre rythme. Suivez vos commandes, votre équipe et vos clients depuis un espace unique et sécurisé.
            </p>
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-purple-200/70 text-sm">🇨🇮 Fait en Côte d'Ivoire · Conçu pour les pressings</span>
            </div>
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
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border ${
                        activeStep === i
                          ? 'bg-white/10 backdrop-blur-md scale-110 shadow-lg shadow-purple-500/30 animate-pulse border-violet-300/50'
                          : 'bg-transparent border-white/15'
                      }`}
                      style={{
                        boxShadow: activeStep === i ? '0 0 24px rgba(196,181,253,0.25)' : 'none',
                      }}
                    >
                      <step.Icon size={20} className="text-violet-200" strokeWidth={1.5} />
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

          {/* ===== BÉNÉFICES VISUELS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mt-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/30 transition-all duration-300">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${b.accent}20`, color: b.accent, border: `1px solid ${b.accent}30` }}>
                  {b.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-xs">{b.title}</p>
                  <p className="text-purple-200/60 text-[11px]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Témoignage rotatif */}
          <div key={testimonialIdx} className="animate-fade-slide max-w-2xl mt-5 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <Quote size={14} className="text-pink-300 mb-1.5" />
            <p className="text-white text-sm font-semibold italic leading-relaxed">« {TESTIMONIALS[testimonialIdx].text} »</p>
            <p className="text-purple-200/70 text-xs mt-1.5 font-semibold">— {TESTIMONIALS[testimonialIdx].author} <span className="font-normal">· {TESTIMONIALS[testimonialIdx].role}</span></p>
            <div className="flex gap-1 mt-2">
              {TESTIMONIALS.map((_, j) => (
                <button key={j} onClick={() => setTestimonialIdx(j)} className={`h-1 rounded-full transition-all ${j === testimonialIdx ? 'w-5 bg-pink-300' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
              ))}
            </div>
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
      <div className="lg:w-2/5 flex items-start justify-center p-4 lg:p-6 pt-6 lg:pt-6 lg:min-h-screen">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full">
            {/* Logo très grand — point focal */}
            <div className="flex justify-center mb-4">
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="w-24 h-24 lg:w-[120px] lg:h-[120px] object-contain rounded-2xl drop-shadow-md" />
              ) : (
                <div className="w-24 h-24 lg:w-[120px] lg:h-[120px] rounded-2xl bg-violet-100 flex items-center justify-center text-7xl drop-shadow-md">🧺</div>
              )}
            </div>
            <h1 className="text-center text-3xl font-bold text-gray-900 mb-2">
              {isForgot ? 'Mot de passe oublié' : (config.name || 'PressingManager')}
            </h1>
            <p className="text-center text-sm text-gray-500 mb-8">
              {isForgot ? 'Entrez votre email pour recevoir un lien de réinitialisation.' : 'Connectez-vous à votre espace'}
            </p>

            {/* Messages */}
            {expired && (
              <div className="mb-4 rounded-xl p-3 text-sm bg-amber-50 border border-amber-200 text-amber-700">
                Votre session a expiré. Veuillez vous reconnecter.
              </div>
            )}
            {error && (
              <div className={`mb-4 rounded-xl p-3 text-sm border ${
                error.includes('✅')
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {!isForgot && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {!isForgot && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-violet-600 cursor-pointer" />
                  <span className="text-sm text-gray-600">Se souvenir de moi</span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || !email || (!isForgot && !password)}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                {loading ? 'Connexion...' : isForgot ? 'Envoyer le lien' : 'Se connecter'}
              </button>

              {isForgot ? (
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError('') }}
                  className="w-full text-center text-sm text-violet-600 hover:underline mt-4"
                >
                  ← Retour à la connexion
                </button>
              ) : (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError('') }}
                    className="text-sm text-violet-600 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500 font-medium">Pas encore de compte ?</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Les comptes sont créés par votre administrateur.<br />
                      Contactez-le directement pour obtenir vos identifiants.
                    </p>
                  </div>
                </div>
              )}

            </form>

            <p className="text-center text-xs text-gray-500 mt-8">
              Fait en Côte d'Ivoire 🇨🇮<br />
              © 2026 {config.name || 'PressingManager'}
            </p>
          </div>

        </div>
      </div>
    </div>
    </>
  )
}

// ============================================
// Composant FeatureCard avec accent unique
// ============================================
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; accent: string }> = ({ icon, title, description, accent }) => (
  <div className="group p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-xl hover:shadow-purple-900/40 transition-all duration-300 cursor-default">
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