import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useShopConfig } from '../../lib/store'
import { Loader } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isForgot, setIsForgot] = useState(false)
  const navigate = useNavigate()
  const { setUser, setSession } = useAuthStore()
  const { config } = useShopConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })
        if (error) throw error
        setError('✅ Email de réinitialisation envoyé !')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
            {config.logo
              ? <img src={config.logo} alt="logo" className="w-20 h-20 object-cover rounded-2xl mx-auto mb-4" />
              : <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-5xl">🧺</div>
            }
            <h1 className="text-3xl font-bold text-white">{config.name || 'PressingManager'}</h1>
            <p className="text-purple-200 mt-1 text-sm">{config.slogan || 'Logiciel de gestion professionnel'}</p>
          </div>
          <div className="p-8">
            {error && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${error.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{error}</div>
            )}
            {isForgot ? (
              <>
                <p className="text-sm text-gray-600 mb-4">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="votre@email.com" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                    {loading && <Loader size={16} className="animate-spin" />} Envoyer le lien
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => { setIsForgot(false); setError('') }} className="text-purple-600 hover:underline text-sm">← Retour à la connexion</button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="••••••••" />
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => { setIsForgot(true); setError('') }} className="text-purple-600 hover:underline text-sm">Mot de passe oublié ?</button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                  {loading && <Loader size={16} className="animate-spin" />} Se connecter
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-purple-200 text-xs mt-6">© {new Date().getFullYear()} PressingManager — pressing-manager.com</p>
      </div>
    </div>
  )
}
