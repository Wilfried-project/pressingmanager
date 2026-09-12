import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Key, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { employeeService } from '../../lib/db'
import { ALL_MODULES, ROLE_PERMISSIONS } from '../../components/layout/Layout'
import type { Employee } from '../../types'

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
  { value: 'admin', label: ' Administrateur', desc: 'Accès complet à tout' },
  { value: 'responsable', label: ' Responsable', desc: 'Gestion opérationnelle' },
  { value: 'caissier', label: ' Caissier', desc: 'Caisse, facturation, clients' },
  { value: 'employe', label: ' Employé', desc: 'Commandes uniquement' },
  { value: 'livreur', label: ' Livreur', desc: 'Livraisons uniquement' },
  { value: 'comptable', label: ' Comptable', desc: 'Finance et rapports' },
  { value: 'laveur', label: ' Laveur/Repasseur', desc: 'Interface atelier' },
  { value: 'custom', label: ' Personnalisé', desc: 'Permissions manuelles' },
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
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: 'employe',
    permissions: [] as string[], is_active: true, password: ''
  })

  // Employés créés dans RH mais qui n'ont pas encore de compte de connexion
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const loadAvailableEmployees = async () => {
    try {
      const data = await employeeService.getWithoutAccount()
      setAvailableEmployees(data as Employee[])
    } catch (err) { console.error('Erreur chargement employés disponibles:', err) }
  }

  useEffect(() => { loadUsers(); loadAvailableEmployees() }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('employees').select('*').not('user_id', 'is', null).order('created_at', { ascending: false })
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

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id)
    const emp = availableEmployees.find(e => e.id === id)
    if (emp) {
      const roleExists = DEFAULT_ROLES.some(r => r.value === emp.role)
      setForm({ ...form, full_name: emp.full_name, phone: emp.phone || '', role: roleExists ? emp.role : form.role })
    }
  }

  const handleSave = async () => {
    if (!editUser && !selectedEmployeeId) { setError('Sélectionnez un employé créé dans RH'); return }
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

        setSuccess(' Utilisateur modifié avec succès')
      } else {
        // Sauvegarder la session admin AVANT de créer le compte —
        // signUp connecte automatiquement le nouvel utilisateur et remplacerait la session actuelle
        const { data: { session: adminSession } } = await supabase.auth.getSession()

        // Créer le compte Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } }
        })
        if (authError) throw authError

        // Restaurer la session admin immédiatement pour ne pas rester connecté en tant que nouvel employé
        if (adminSession) {
          await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token })
        }

        // Lier le compte au profil employé déjà créé dans RH (pas de nouvelle ligne)
        const { error: empError } = await supabase.from('employees').update({
          user_id: authData.user?.id,
          email: form.email,
          role: form.role,
          permissions: effectivePerms,
          is_active: form.is_active,
        }).eq('id', selectedEmployeeId)
        if (empError) throw empError

        setSuccess(` Compte créé ! ${form.full_name} peut se connecter avec ${form.email}`)
      }

      await loadUsers()
      await loadAvailableEmployees()
      resetForm()
    } catch (err: any) {
      setError('Erreur : ' + (err.message || 'Impossible de créer le compte'))
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (user: AppUser) => {
    if (!confirm(`Envoyer un email de réinitialisation de mot de passe à ${user.full_name} (${user.email}) ?`)) return
    try {
      await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + '/reset-password' })
      alert(` Email de réinitialisation envoyé à ${user.email}`)
    } catch (err: any) {
      alert('Erreur lors de l\'envoi : ' + (err.message || 'réessayez plus tard'))
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
      await loadAvailableEmployees()
    } catch { alert('Erreur lors de la suppression') }
  }

  const startEdit = (user: AppUser) => {
    setEditUser(user)
    setSelectedEmployeeId('')
    setForm({ full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, permissions: user.permissions, is_active: user.is_active, password: '' })
    setShowForm(true)
    setError('')
  }

  const resetForm = () => {
    setForm({ full_name: '', email: '', phone: '', role: 'employe', permissions: [], is_active: true, password: '' })
    setSelectedEmployeeId('')
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
  const canCreateUser = availableEmployees.length > 0

  return (
    <div className="flex flex-col gap-space-xl">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-2xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Sécurité &amp; Accès
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Gestion des Utilisateurs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">Attribuez un accès de connexion à un employé créé dans RH</p>
        </div>
        <button
          onClick={() => { if (!canCreateUser) return; setShowForm(true); setEditUser(null); setSelectedEmployeeId(''); setError(''); setSuccess('') }}
          disabled={!canCreateUser}
          title={!canCreateUser ? "Créez d'abord un employé dans RH" : ''}
          className="flex items-center gap-space-xs px-space-xl py-2.5 bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:bg-primary active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed self-start lg:self-auto">
          <Plus size={20} />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {!canCreateUser && (
        <div className="p-space-lg bg-[#fef3c7] border border-[#fde68a] rounded-lg text-sm font-medium text-[#b45309]">
          Aucun employé disponible — créez d'abord un employé dans Employés &amp; RH avant de lui attribuer un accès de connexion ici.
        </div>
      )}

      {success && <div className="p-space-lg bg-tertiary-fixed border border-tertiary-container rounded-lg text-sm font-semibold text-tertiary">{success}</div>}

      {/* Rôles prédéfinis */}
      <div className="flex flex-col gap-space-sm">
        <h2 className="font-label-lg text-label-lg uppercase tracking-wider text-outline">Rôles &amp; Niveaux d'accès</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-md">
          {DEFAULT_ROLES.filter(r => r.value !== 'custom').map(role => {
            const activeCount = users.filter(u => u.role === role.value).length
            return (
              <div key={role.value} className="flex flex-col p-space-lg rounded-DEFAULT bg-surface-container-lowest shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                    {role.label.trim().charAt(0)}
                  </span>
                  <span className="font-numeric-currency text-label-sm font-bold text-primary px-2 py-0.5 rounded-full bg-primary-fixed">{activeCount} actif(s)</span>
                </div>
                <span className="font-headline-md text-title-sm font-bold text-on-surface">{role.label.replace(/^./, '').trim()}</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">{role.desc}</p>
                <div className="mt-space-md pt-space-xs">
                  <span className="font-label-sm text-label-sm font-bold text-primary">{ROLE_PERMISSIONS[role.value]?.length || 0} modules</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="flex flex-col bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
        <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="font-headline-md text-title-sm font-bold text-on-surface">Utilisateurs enregistrés</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-numeric-currency text-label-sm font-bold">{users.length}</span>
          </div>
          {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="divide-y divide-surface-container-low">
          {users.map(user => {
            const roleInfo = DEFAULT_ROLES.find(r => r.value === user.role)
            return (
              <div key={user.id} className="flex items-center gap-space-md px-space-xl py-space-md hover:bg-primary-fixed/20 transition-colors">
                <div className="w-11 h-11 bg-primary-fixed text-primary rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-space-xs">
                    <p className="font-headline-md text-title-sm font-bold text-on-surface truncate">{user.full_name}</p>
                    {!user.is_active && <span className="text-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold">Inactif</span>}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email} {user.phone ? `• ${user.phone}` : ''}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-space-2xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">{roleInfo?.label.replace(/^./, '').trim() || user.role}</span>
                  <span className="font-label-sm text-label-sm text-outline">{user.permissions?.length || ROLE_PERMISSIONS[user.role]?.length || 0} modules</span>
                </div>
                <div className="flex gap-space-2xs">
                  <button onClick={() => startEdit(user)} className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-primary transition-all" title="Modifier"><Edit2 size={15} /></button>
                  <button onClick={() => handleResetPassword(user)} className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-secondary transition-all" title="Réinitialiser mot de passe"><Key size={15} /></button>
                  <button onClick={() => handleToggleActive(user)} className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-tertiary transition-all" title={user.is_active ? 'Désactiver' : 'Activer'}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{user.is_active ? 'toggle_on' : 'toggle_off'}</span>
                  </button>
                  <button onClick={() => handleDelete(user)} className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:bg-error-container hover:text-error transition-all" title="Supprimer"><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
          {!loading && users.length === 0 && (
            <div className="text-center py-space-3xl text-outline">
              <p>Aucun utilisateur — attribuez un accès à un employé RH</p>

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
                {!editUser && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Employé (créé dans RH) *</label>
                    <select value={selectedEmployeeId} onChange={e => handleSelectEmployee(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="">Sélectionner un employé...</option>
                      {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.role}</option>)}
                    </select>
                    {selectedEmployeeId && <p className="text-xs text-gray-400 mt-1.5">Nom et téléphone repris automatiquement depuis la fiche RH.</p>}
                  </div>
                )}
                {editUser && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet *</label>
                    <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Prénom Nom" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editUser} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400" placeholder="email@pressing.ci" />
                </div>
                {editUser && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="+225 07..." />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {editUser ? 'Mot de passe' : 'Mot de passe *'}
                  </label>
                  {editUser ? (
                    <button type="button" onClick={() => { setForm({ ...form, password: 'reset-requested' }); handleResetPassword({ ...editUser, full_name: form.full_name, email: form.email } as AppUser) }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-purple-700 hover:bg-purple-50 transition text-left">
                       Envoyer un email de réinitialisation
                    </button>
                  ) : (
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Minimum 6 caractères" />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
                  <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="active"> Actif</option>
                    <option value="inactive"> Inactif</option>
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
