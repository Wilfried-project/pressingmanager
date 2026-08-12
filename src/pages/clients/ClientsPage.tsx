import React, { useState, useEffect, useMemo } from 'react'
import { clientsService } from '../../lib/db'
import { PageHeader, Button, SearchInput, Modal, Field, Input, Select, Textarea, Badge, EmptyState, Table, Card, StatCard } from '../../components/ui'
import { Plus, Trash2, Edit2, Users, Star, AlertTriangle, TrendingUp } from 'lucide-react'
import type { Client } from '../../types'

const GROUP_COLORS: Record<string, string> = {
  standard: 'gray', silver: 'blue', gold: 'yellow', vip: 'purple', blacklist: 'red'
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

  // Charger les clients depuis Supabase
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
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s) enregistré(s)`}
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouveau client</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total clients" value={stats.total} icon={<Users size={20} />} color="purple" />
        <StatCard label="Clients VIP" value={stats.vip} icon={<Star size={20} />} color="yellow" />
        <StatCard label="Liste noire" value={stats.blacklisted} icon={<AlertTriangle size={20} />} color="red" />
        <StatCard label="Total points" value={stats.totalPoints.toLocaleString('fr-FR')} icon={<TrendingUp size={20} />} color="green" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, email..." className="flex-1" />
          <Select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="sm:w-44">
            <option value="">Tous les groupes</option>
            <option value="standard">Standard</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="vip">VIP</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card><div className="text-center py-12"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400">Chargement des clients...</p></div></Card>
      ) : filtered.length > 0 ? (
        <Table headers={['Client', 'Téléphone', 'Groupe', 'Points', 'Remise', 'Statut', 'Actions']}>
          {filtered.map(client => (
            <tr key={client.id} className="hover:bg-purple-50 transition">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">{client.first_name.charAt(0)}</div>
                  <div>
                    <p className="font-semibold text-sm">{client.first_name} {client.last_name}</p>
                    <p className="text-xs text-gray-400">{client.email || '-'}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm">{client.phone}</td>
              <td className="px-5 py-4"><Badge label={(client as any).group_name || 'standard'} color={GROUP_COLORS[(client as any).group_name || 'standard']} /></td>
              <td className="px-5 py-4"><span className="font-bold text-yellow-600">⭐ {client.loyalty_points || 0}</span></td>
              <td className="px-5 py-4 text-sm">{client.discount_rate || 0}%</td>
              <td className="px-5 py-4"><Badge label={client.is_blacklisted ? '🚫 Blacklist' : '✅ Actif'} color={client.is_blacklisted ? 'red' : 'green'} /></td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  <button onClick={() => setViewClient(client)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg" title="Voir"><Users size={14} /></button>
                  <button onClick={() => handleEdit(client)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Modifier"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg" title="Supprimer"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card><EmptyState icon="👥" message="Aucun client trouvé" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter un client</Button>} /></Card>
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
            <label htmlFor="blacklist" className="text-sm font-semibold text-red-700 cursor-pointer">🚫 Mettre en liste noire</label>
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
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">{viewClient.first_name.charAt(0)}</div>
              <div>
                <p className="text-xl font-bold">{viewClient.first_name} {viewClient.last_name}</p>
                <p className="text-gray-500">{viewClient.phone}</p>
                <Badge label={(viewClient as any).group_name || 'standard'} color={GROUP_COLORS[(viewClient as any).group_name || 'standard']} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Email', v: viewClient.email || '-' },
                { l: 'WhatsApp', v: (viewClient as any).whatsapp || '-' },
                { l: 'Points fidélité', v: `⭐ ${viewClient.loyalty_points || 0}` },
                { l: 'Remise', v: `${viewClient.discount_rate || 0}%` },
                { l: 'Adresse', v: (viewClient as any).address || '-' },
                { l: 'Statut', v: viewClient.is_blacklisted ? '🚫 Liste noire' : '✅ Actif' },
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
              <Button className="flex-1" onClick={() => { setViewClient(null); handleEdit(viewClient) }} icon={<Edit2 size={16} />}>Modifier</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setViewClient(null)}>Fermer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
