import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/store'
import { Loader } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const navigate = useNavigate()
  const { setUser, setSession } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setError('✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.')
        setIsForgot(false)
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('✅ Compte créé ! Connectez-vous.')
        setIsSignup(false)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session) {
          setSession(data.session)
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.email?.split('@')[0] || 'Admin',
            phone: '',
            role: 'admin',
            agency_id: 'default',
            is_active: true,
            permissions: [],
            created_at: new Date().toISOString()
          })
          navigate('/')
        }
      }
    } catch (err: any) { setError(err.message || 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-5xl">🧺</div>
            <h1 className="text-3xl font-bold text-white">PressingManager</h1>
            <p className="text-purple-200 mt-1 text-sm">Logiciel de gestion professionnel</p>
          </div>
          <div className="p-8">
            {error && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${error.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {error}
              </div>
            )}

            {isForgot ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Entrez votre email — vous recevrez un lien pour réinitialiser votre mot de passe.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="votre@email.com" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                    {loading && <Loader size={16} className="animate-spin" />}
                    Envoyer le lien
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => { setIsForgot(false); setError('') }} className="text-purple-600 hover:underline text-sm">
                    ← Retour à la connexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="votre@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      placeholder="••••••••" />
                  </div>
                  {!isSignup && (
                    <div className="text-right">
                      <button type="button" onClick={() => { setIsForgot(true); setError('') }}
                        className="text-purple-600 hover:underline text-sm">
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                    {loading && <Loader size={16} className="animate-spin" />}
                    {isSignup ? 'Créer mon compte' : 'Se connecter'}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button onClick={() => { setIsSignup(!isSignup); setError('') }} className="text-purple-600 hover:underline text-sm">
                    {isSignup ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
