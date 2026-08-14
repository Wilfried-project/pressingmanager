import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useShopConfig } from '../../lib/store'
import { Loader, CheckCircle } from 'lucide-react'

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { config } = useShopConfig()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Le lien reçu par email contient un token dans l'URL — Supabase le
    // détecte automatiquement au chargement de la page et crée une session
    // temporaire permettant de changer le mot de passe.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setValidSession(!!session)
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
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
              : <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-5xl"></div>
            }
            <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
            <p className="text-purple-200 mt-1 text-sm">{config.name || 'PressingManager'}</p>
          </div>

          <div className="p-8">
            {checkingSession ? (
              <div className="text-center py-8">
                <Loader size={28} className="animate-spin mx-auto text-purple-600" />
              </div>
            ) : !validSession ? (
              <div className="text-center py-4">
                <p className="text-red-600 font-medium mb-2">Lien invalide ou expiré</p>
                <p className="text-sm text-gray-500 mb-6">Demandez un nouveau lien de réinitialisation depuis la page de connexion.</p>
                <button onClick={() => navigate('/login')} className="text-purple-600 font-semibold hover:underline text-sm">Retour à la connexion</button>
              </div>
            ) : success ? (
              <div className="text-center py-4">
                <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
                <p className="font-semibold text-gray-800">Mot de passe mis à jour !</p>
                <p className="text-sm text-gray-500 mt-1">Redirection vers la connexion...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="Minimum 6 caractères" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                  <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="Ressaisir le mot de passe" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                  {loading && <Loader size={16} className="animate-spin" />} Mettre à jour le mot de passe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
