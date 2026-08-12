import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Key } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ALL_MODULES, ROLE_PERMISSIONS } from '../../components/layout/Layout'

interface AppUser {
  id: string
  user_id?: string
  full_name: string
  email: string
  phone: string
  role: string
  permissions: string[]
  is_active: boolean
  created_at: string
}

const DEFAULT_ROLES = [
  { value: 'admin', label: '👑 Administrateur', desc: 'Accès complet à tout' },
  { value: 'responsable', label: '🏆 Responsable', desc: 'Gestion opérationnelle' },
  { value: 'caissier', label: '💰 Caissier', desc: 'Caisse, facturation, clients' },
  { value: 'employe', label: '👷 Employé', desc: 'Commandes uniquement' },
  { value: 'livreur', label: '🚚 Livreur', desc: 'Livraisons uniquement' },
  { value: 'comptable', label: '📒 Comptable', desc: 'Finance et rapports' },
  { value: 'laveur', label: '🫧 Laveur/Repasseur', desc: 'Interface atelier' },
  { value: 'custom', label: '⚙️ Personnalisé', desc: 'Permissions manuelles' },
]

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([])
  const [currentTenantId, setCurrentTenantId] = useState('bc4ba4d5-b9b6-48d8-8344-84c2fc2c299f')

  useEffect(() => {
    const loadTenantId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: emp } = await supabase
        .from('employees')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .single()
      if (emp?.tenant_id) setCurrentTenantId(emp.tenant_id)
    }
    loadTenantId()
  }, [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: 'employe',
    permissions: [] as string[], is_active: true, password: ''
  })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const getEffectivePermissions = (role: string, customPerms: string[]) => {
    if (role === 'custom') return customPerms
    return ROLE_PERMISSIONS[role] || ['/']
  }

  const handleRoleChange = (role: string) => {
    const perms = role === 'custom' ? form.permissions : (ROLE_PERMISSIONS[role] || ['/'])
    setForm({ ...form, role, permissions: perms })
  }

  const togglePermission = (path: string) => {
    const perms = form.permissions.includes(path)
      ? form.permissions.filter(p => p !== path)
      : [...form.permissions, path]
    setForm({ ...form, permissions: perms })
  }

  const handleSave = async () => {
    if (!form.full_name || !form.email) { setError('Nom et email requis'); return }
    if (!editUser && !form.password) { setError('Mot de passe requis pour un nouvel utilisateur'); return }
    if (!editUser && form.password.length < 6) { setError('Mot de passe minimum 6 caractères'); return }

    setSaving(true)
    setError('')

    try {
      const effectivePerms = getEffectivePermissions(form.role, form.permissions)

      if (editUser) {
        // Modifier l'employé existant
        const { error } = await supabase.from('employees').update({
          full_name: form.full_name,
          phone: form.phone,
          role: form.role,
          permissions: effectivePerms,
          is_active: form.is_active,
        }).eq('id', editUser.id)
        if (error) throw error

        // Changer le mot de passe si renseigné
        if (form.password && editUser.user_id) {
          const { error: pwError } = await supabase.auth.admin.updateUserById(editUser.user_id, { password: form.password })
          if (pwError) console.warn('Impossible de changer le mdp:', pwError.message)
        }

        setSuccess('✅ Utilisateur modifié avec succès')
      } else {
        // Créer le compte Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } }
        })
        if (authError) throw authError

        // Créer l'employé dans la table
        const { data: empData, error: empError } = await supabase.from('employees').insert({
          id: crypto.randomUUID(),
          user_id: authData.user?.id,
          tenant_id: currentTenantId,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          permissions: effectivePerms,
          is_active: form.is_active,
          salary: 0,
        }).select().single()
        if (empError) throw empError

        setSuccess(`✅ Compte créé ! ${form.full_name} peut se connecter avec ${form.email}`)
      }

      await loadUsers()
      resetForm()
    } catch (err: any) {
      setError('Erreur : ' + (err.message || 'Impossible de créer le compte'))
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (user: AppUser) => {
    const newPass = prompt(`Nouveau mot de passe pour ${user.full_name} (min. 6 caractères) :`)
    if (!newPass) return
    if (newPass.length < 6) { alert('Mot de passe trop court (minimum 6 caractères)'); return }

    if (user.user_id) {
      try {
        await supabase.auth.admin.updateUserById(user.user_id, { password: newPass })
        alert(`✅ Mot de passe réinitialisé pour ${user.full_name}`)
      } catch {
        // Fallback: envoyer email de réinitialisation
        await supabase.auth.resetPasswordForEmail(user.email)
        alert(`📧 Email de réinitialisation envoyé à ${user.email}`)
      }
    } else {
      await supabase.auth.resetPasswordForEmail(user.email)
      alert(`📧 Email de réinitialisation envoyé à ${user.email}`)
    }
  }

  const handleToggleActive = async (user: AppUser) => {
    try {
      await supabase.from('employees').update({ is_active: !user.is_active }).eq('id', user.id)
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    } catch (err) { alert('Erreur') }
  }

  const handleDelete = async (user: AppUser) => {
    if (user.role === 'admin') { alert('Impossible de supprimer l\'administrateur principal'); return }
    if (!confirm(`Supprimer ${user.full_name} ?`)) return
    try {
      await supabase.from('employees').delete().eq('id', user.id)
      setUsers(users.filter(u => u.id !== user.id))
    } catch { alert('Erreur lors de la suppression') }
  }

  const startEdit = (user: AppUser) => {
    setEditUser(user)
    setForm({ full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, permissions: user.permissions, is_active: user.is_active, password: '' })
    setShowForm(true)
    setError('')
  }

  const resetForm = () => {
    setForm({ full_name: '', email: '', phone: '', role: 'employe', permissions: [], is_active: true, password: '' })
    setEditUser(null)
    setShowForm(false)
    setError('')
    setTimeout(() => setSuccess(''), 3000)
  }

  const groupedModules = ALL_MODULES.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = []
    acc[m.group].push(m)
    return acc
  }, {} as Record<string, typeof ALL_MODULES>)

  const effectivePerms = getEffectivePermissions(form.role, form.permissions)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👤 Gestion des utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">Créez des comptes et définissez leurs accès</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditUser(null); setError(''); setSuccess('') }}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition">
          <Plus size={18} /> Nouvel utilisateur
        </button>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-semibold text-green-700">{success}</div>}

      {/* Légende rôles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DEFAULT_ROLES.filter(r => r.value !== 'custom').map(role => (
          <div key={role.value} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-lg mb-1">{role.label.split(' ')[0]}</p>
            <p className="text-xs font-bold text-gray-700">{role.label.split(' ').slice(1).join(' ')}</p>
            <p className="text-xs text-gray-400 mt-1">{role.desc}</p>
            <p className="text-xs font-semibold text-purple-600 mt-1">{ROLE_PERMISSIONS[role.value]?.length || 0} modules</p>
          </div>
        ))}
      </div>

      {/* Liste utilisateurs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">{users.length} utilisateur(s)</h2>
          {loading && <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="divide-y divide-gray-100">
          {users.map(user => {
            const roleInfo = DEFAULT_ROLES.find(r => r.value === user.role)
            return (
              <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{user.full_name}</p>
                    {!user.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactif</span>}
                  </div>
                  <p className="text-sm text-gray-500">{user.email} {user.phone ? `• ${user.phone}` : ''}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-purple-700">{roleInfo?.label || user.role}</span>
                  <span className="text-xs text-gray-400">{user.permissions?.length || ROLE_PERMISSIONS[user.role]?.length || 0} modules</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(user)} className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg" title="Modifier"><Edit2 size={15} /></button>
                  <button onClick={() => handleResetPassword(user)} className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg" title="Réinitialiser mot de passe"><Key size={15} /></button>
                  <button onClick={() => handleToggleActive(user)} className={`p-2 rounded-lg text-xs font-semibold ${user.is_active ? 'hover:bg-red-100 text-red-500' : 'hover:bg-green-100 text-green-600'}`} title={user.is_active ? 'Désactiver' : 'Activer'}>{user.is_active ? '⏸' : '▶'}</button>
                  <button onClick={() => handleDelete(user)} className="p-2 hover:bg-red-100 text-red-500 rounded-lg" title="Supprimer"><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
          {!loading && users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p>Aucun utilisateur — créez le premier compte</p>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{editUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet *</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Prénom Nom" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editUser} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400" placeholder="email@pressing.ci" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="+225 07..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {editUser ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder={editUser ? 'Laisser vide pour ne pas changer' : 'Minimum 6 caractères'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="active">✅ Actif</option>
                    <option value="inactive">⏸ Inactif</option>
                  </select>
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Rôle</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_ROLES.map(role => (
                    <button key={role.value} type="button" onClick={() => handleRoleChange(role.value)}
                      className={`p-3 rounded-xl border-2 text-left transition ${form.role === role.value ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <p className="text-sm font-bold">{role.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Modules accessibles <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{effectivePerms.length}/{ALL_MODULES.length}</span>
                  </label>
                  {form.role === 'custom' && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setForm({ ...form, permissions: ALL_MODULES.map(m => m.path) })} className="text-xs text-purple-600 hover:underline">Tout sélectionner</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setForm({ ...form, permissions: ['/'] })} className="text-xs text-red-500 hover:underline">Tout désélectionner</button>
                    </div>
                  )}
                </div>

                {form.role !== 'custom' ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-sm text-purple-700 font-medium mb-2">Modules inclus dans le rôle <strong>{DEFAULT_ROLES.find(r => r.value === form.role)?.label}</strong> :</p>
                    <div className="flex flex-wrap gap-2">
                      {effectivePerms.map(path => { const mod = ALL_MODULES.find(m => m.path === path); return mod ? <span key={path} className="flex items-center gap-1 bg-white text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-medium">{mod.icon} {mod.label}</span> : null })}
                    </div>
                    <p className="text-xs text-purple-500 mt-3">Pour personnaliser, sélectionnez le rôle "Personnalisé".</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {Object.entries(groupedModules).map(([groupLabel, items]) => (
                      <div key={groupLabel} className="border-b border-gray-100 last:border-0">
                        <div className="px-4 py-2 bg-gray-50"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{groupLabel}</p></div>
                        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {items.map(mod => {
                            const checked = form.permissions.includes(mod.path)
                            return (
                              <label key={mod.path} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${checked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                <input type="checkbox" checked={checked} onChange={() => togglePermission(mod.path)} className="w-4 h-4 text-purple-600 rounded" />
                                <span className="text-base">{mod.icon}</span>
                                <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                  {editUser ? 'Enregistrer' : 'Créer le compte'}
                </button>
                <button onClick={resetForm} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
