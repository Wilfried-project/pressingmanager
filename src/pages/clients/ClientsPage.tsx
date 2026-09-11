import React, { useState, useEffect, useMemo } from 'react'
import { clientsService } from '../../lib/db'
import { Modal, Field, Input, Select, Textarea, Button } from '../../components/ui'
import type { Client } from '../../types'

const Icon: React.FC<{ name: string; size?: number; className?: string; filled?: boolean }> = ({ name, size = 20, className = '', filled }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size, fontVariationSettings: filled ? "'FILL' 1" : undefined }}>{name}</span>
)

const GROUP_COLORS: Record<string, string> = {
  standard: 'bg-surface-container text-on-surface-variant',
  silver: 'bg-surface-container-high text-on-surface-variant',
  gold: 'bg-tertiary-fixed text-on-tertiary-fixed',
  vip: 'bg-primary-fixed text-on-primary-fixed',
}

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '', address: '',
  whatsapp: '', group_name: 'standard', discount_rate: 0,
  is_blacklisted: false, notes: '', loyalty_points: 0, balance: 0, credit: 0
}

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const data = await clientsService.getAll()
      setClients(data as Client[])
    } catch (err) {
      console.error('Erreur chargement clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => clients.filter(c => {
    const ms = `${c.first_name} ${c.last_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    const mg = !filterGroup || (c as any).group_name === filterGroup
    return ms && mg
  }), [clients, search, filterGroup])

  const stats = useMemo(() => ({
    total: clients.length,
    vip: clients.filter(c => (c as any).group_name === 'vip').length,
    blacklisted: clients.filter(c => c.is_blacklisted).length,
    totalPoints: clients.reduce((s, c) => s + (c.loyalty_points || 0), 0)
  }), [clients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.phone) { setError('Prénom et téléphone requis'); return }
    setSaving(true)
    setError('')
    try {
      if (editClient) {
        const updated = await clientsService.update(editClient.id, form)
        setClients(clients.map(c => c.id === editClient.id ? { ...c, ...updated } : c))
      } else {
        const created = await clientsService.create({ ...form, id: crypto.randomUUID() })
        setClients([created as Client, ...clients])
      }
      resetForm()
    } catch (err: any) {
      setError('Erreur : ' + (err.message || 'Impossible de sauvegarder'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client ?')) return
    try {
      await clientsService.delete(id)
      setClients(clients.filter(c => c.id !== id))
    } catch (err) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleEdit = (client: Client) => {
    setEditClient(client)
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      email: client.email || '',
      address: (client as any).address || '',
      whatsapp: (client as any).whatsapp || '',
      group_name: (client as any).group_name || 'standard',
      discount_rate: client.discount_rate || 0,
      is_blacklisted: client.is_blacklisted || false,
      notes: (client as any).notes || '',
      loyalty_points: client.loyalty_points || 0,
      balance: (client as any).balance || 0,
      credit: (client as any).credit || 0,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditClient(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="flex flex-col gap-space-xl">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Clients</h1>
            <span className="px-space-sm py-space-2xs rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold uppercase tracking-wider">Répertoire</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">{clients.length} client(s) enregistré(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:bg-primary transition-all active:scale-95">
          <Icon name="person_add" size={18} />
          <span>Nouveau client</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
        <div className="relative overflow-hidden bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-outline">Total clients</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-space-2xs">{stats.total}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-sm">
              <Icon name="contacts" size={24} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-outline">Clients VIP</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-space-2xs">{stats.vip}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-secondary shadow-sm">
              <Icon name="star" size={24} filled />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-outline">Liste noire</span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold mt-space-2xs">{stats.blacklisted}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-outline shadow-sm">
              <Icon name="verified_user" size={24} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-outline">Points cumulés</span>
              <div className="flex items-baseline gap-space-2xs mt-space-2xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold">{stats.totalPoints.toLocaleString('fr-FR')}</span>
                <span className="font-label-sm text-label-sm text-tertiary font-bold">pts</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shadow-sm">
              <Icon name="insights" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: 20 }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, téléphone, email..."
            className="w-full pl-11 pr-space-lg py-space-sm bg-surface-container-low text-on-surface font-body-md text-body-md rounded-full focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline" />
        </div>
        <div className="relative">
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            className="appearance-none pl-space-md pr-9 py-space-sm bg-surface-container-low text-on-surface font-label-md text-label-md rounded-full focus:outline-none cursor-pointer">
            <option value="">Tous les groupes</option>
            <option value="standard">Standard</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="vip">VIP</option>
          </select>
          <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: 18 }}>expand_more</span>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-space-md" />
          <p className="font-body-md text-body-md text-outline">Chargement des clients...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-on-surface-variant">
                  <th className="py-space-md px-space-lg font-label-sm text-label-sm uppercase tracking-wider font-bold">Client</th>
                  <th className="py-space-md px-space-md font-label-sm text-label-sm uppercase tracking-wider font-bold">Téléphone</th>
                  <th className="py-space-md px-space-md font-label-sm text-label-sm uppercase tracking-wider font-bold">Groupe</th>
                  <th className="py-space-md px-space-md font-label-sm text-label-sm uppercase tracking-wider font-bold">Points fidélité</th>
                  <th className="py-space-md px-space-md font-label-sm text-label-sm uppercase tracking-wider font-bold">Remise</th>
                  <th className="py-space-md px-space-md font-label-sm text-label-sm uppercase tracking-wider font-bold">Statut</th>
                  <th className="py-space-md px-space-lg font-label-sm text-label-sm uppercase tracking-wider font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg">
                      <div className="flex items-center gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-title-sm text-title-sm flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                          {client.first_name.charAt(0)}{client.last_name?.charAt(0) || ''}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-title-sm text-title-sm font-bold text-on-surface truncate">{client.first_name} {client.last_name}</span>
                          <span className="font-body-sm text-body-sm text-outline truncate">{client.email || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span className="font-body-md text-body-md text-on-surface font-medium">{client.phone}</span>
                    </td>
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span className={`inline-flex items-center px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-semibold ${GROUP_COLORS[(client as any).group_name || 'standard']}`}>
                        {((client as any).group_name || 'standard').charAt(0).toUpperCase() + ((client as any).group_name || 'standard').slice(1)}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <div className="flex items-center gap-space-2xs">
                        <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                        <span className="font-numeric-currency text-numeric-currency font-bold text-on-surface">{client.loyalty_points || 0}</span>
                        <span className="font-label-sm text-label-sm text-outline">pts</span>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      <span className="font-label-md text-label-md text-outline font-semibold">{client.discount_rate || 0}%</span>
                    </td>
                    <td className="py-space-md px-space-md whitespace-nowrap">
                      {client.is_blacklisted ? (
                        <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" /> Liste noire
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" /> Actif
                        </span>
                      )}
                    </td>
                    <td className="py-space-md px-space-lg text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-space-2xs">
                        <button onClick={() => setViewClient(client)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-primary transition-all" title="Voir">
                          <Icon name="visibility" size={18} />
                        </button>
                        <button onClick={() => handleEdit(client)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-primary transition-all" title="Modifier">
                          <Icon name="edit" size={18} />
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-error-container hover:text-error transition-all" title="Supprimer">
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
          <p className="font-body-md text-body-md text-outline mb-space-md">Aucun client trouvé</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all">
            <Icon name="person_add" size={18} /> Ajouter un client
          </button>
        </div>
      )}

      {/* FORMULAIRE */}
      <Modal open={showForm} onClose={resetForm} title={editClient ? 'Modifier le client' : 'Nouveau client'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" required><Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Prénom" /></Field>
            <Field label="Nom"><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Nom" /></Field>
            <Field label="Téléphone" required><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 07 XX XX XX XX" /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+225 07 XX XX XX XX" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@..." /></Field>
            <Field label="Groupe">
              <Select value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="vip">VIP</option>
              </Select>
            </Field>
            <Field label="Remise (%)"><Input type="number" min="0" max="100" value={form.discount_rate} onChange={e => setForm({ ...form, discount_rate: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Points fidélité"><Input type="number" min="0" value={form.loyalty_points} onChange={e => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Adresse"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse..." /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes sur ce client..." /></Field>
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <input type="checkbox" id="blacklist" checked={form.is_blacklisted} onChange={e => setForm({ ...form, is_blacklisted: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="blacklist" className="text-sm font-semibold text-red-700 cursor-pointer">Mettre en liste noire</label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" loading={saving}>{editClient ? 'Modifier' : 'Créer le client'}</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* DÉTAIL CLIENT */}
      {viewClient && (
        <Modal open={!!viewClient} onClose={() => setViewClient(null)} title="Détail client">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-primary-fixed/40 rounded-xl">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary text-2xl font-bold">{viewClient.first_name.charAt(0)}</div>
              <div>
                <p className="text-xl font-bold">{viewClient.first_name} {viewClient.last_name}</p>
                <p className="text-gray-500">{viewClient.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Email', v: viewClient.email || '-' },
                { l: 'WhatsApp', v: (viewClient as any).whatsapp || '-' },
                { l: 'Points fidélité', v: `${viewClient.loyalty_points || 0}` },
                { l: 'Remise', v: `${viewClient.discount_rate || 0}%` },
                { l: 'Adresse', v: (viewClient as any).address || '-' },
                { l: 'Statut', v: viewClient.is_blacklisted ? 'Liste noire' : 'Actif' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{item.l}</p>
                  <p className="font-semibold text-sm mt-0.5">{item.v}</p>
                </div>
              ))}
            </div>
            {(viewClient as any).notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs font-bold text-yellow-700 mb-1">Notes</p>
                <p className="text-sm">{(viewClient as any).notes}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => { setViewClient(null); handleEdit(viewClient) }} icon={<Icon name="edit" size={16} />}>Modifier</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setViewClient(null)}>Fermer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
