import React, { useState, useEffect, useMemo } from 'react'
import { clientsService, ordersService } from '../../lib/db'
import { Modal, Field, Input, Select, Textarea, Button, KpiCard, StatusBadge, Avatar } from '../../components/ui'
import type { Client } from '../../types'
import {
  Users, Star, ShieldCheck, TrendingUp, Search, Filter, Plus, Eye, Pencil, Trash2,
  Download, Upload, ArrowRight
} from 'lucide-react'

const GROUP_COLORS: Record<string, string> = {
  standard: 'bg-surface-container text-on-surface-variant',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-amber-100 text-amber-700',
  vip: 'bg-primary-fixed text-primary',
}

const GROUP_TO_BADGE: Record<string, any> = {
  standard: 'pending',
  silver: 'inactive',
  gold: 'partial',
  vip: 'vip',
}

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '', address: '',
  whatsapp: '', group_name: 'standard', discount_rate: 0,
  is_blacklisted: false, notes: '', loyalty_points: 0, balance: 0, credit: 0
}

export const ClientsPageModern: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [clientsData, ordersData] = await Promise.all([
        clientsService.getAll(),
        ordersService.getAll().catch(() => [])
      ])
      setClients(clientsData as Client[])
      setOrders(ordersData as any[])
    } catch (err) {
      console.error('Erreur chargement:', err)
    } finally {
      setLoading(false)
    }
  }

  const ordersByClient = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {}
    orders.forEach((o: any) => {
      if (!o.client_id) return
      if (!map[o.client_id]) map[o.client_id] = { count: 0, total: 0 }
      map[o.client_id].count++
      map[o.client_id].total += o.total || 0
    })
    return map
  }, [orders])

  const filtered = useMemo(() => {
    let result = clients.filter(c => {
      const ms = `${c.first_name} ${c.last_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())
      const mg = !filterGroup || (c as any).group_name === filterGroup
      return ms && mg
    })

    if (sortBy === 'recent') {
      result = [...result].sort((a, b) => new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime())
    } else if (sortBy === 'points') {
      result = [...result].sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
    }

    return result
  }, [clients, search, filterGroup, sortBy])

  const stats = useMemo(() => ({
    total: clients.length,
    vip: clients.filter(c => (c as any).group_name === 'vip').length,
    blacklisted: clients.filter(c => c.is_blacklisted).length,
    totalPoints: clients.reduce((s, c) => s + (c.loyalty_points || 0), 0),
    totalCA: Object.values(ordersByClient).reduce((s, v) => s + v.total, 0)
  }), [clients, ordersByClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.phone) { setError('Prenom et telephone requis'); return }
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

  const exportCSV = () => {
    const rows = [
      ['Prenom', 'Nom', 'Telephone', 'Email', 'Groupe', 'Points', 'Remise', 'Statut'],
      ...clients.map(c => [
        c.first_name, c.last_name, c.phone, c.email || '',
        (c as any).group_name || 'standard', String(c.loyalty_points || 0),
        String(c.discount_rate || 0), c.is_blacklisted ? 'Liste noire' : 'Actif'
      ])
    ]
    const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients-' + new Date().toISOString().split('T')[0] + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant font-medium">Chargement des clients...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Clients
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary uppercase tracking-wider">
              Repertoire
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {clients.length} client(s) enregistre(s) - Base de donnees et historique
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn-modern-ghost bg-surface-container-low">
            <Download size={16} />
            Exporter
          </button>
          <button onClick={() => setShowForm(true)} className="btn-modern-primary">
            <Plus size={16} strokeWidth={2.5} />
            Nouveau client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total clients"
          value={stats.total}
          unit="clients"
          icon={<Users size={18} />}
          trend={100}
        />
        <KpiCard
          label="Clients VIP"
          value={stats.vip}
          unit={stats.total > 0 ? Math.round((stats.vip / stats.total) * 100) + '%' : '0%'}
          icon={<Star size={18} />}
          sub="Du volume d affaires"
        />
        <KpiCard
          label="Liste noire / Litiges"
          value={stats.blacklisted}
          unit="clients"
          icon={<ShieldCheck size={18} />}
          sub={stats.blacklisted === 0 ? 'Sante optimale - aucun litige' : 'A verifier'}
        />
        <KpiCard
          label="Points cumules"
          value={stats.totalPoints.toLocaleString('fr-FR')}
          unit="pts"
          icon={<TrendingUp size={18} />}
          variant="primary"
          sub={stats.totalCA.toLocaleString('fr-FR') + ' XOF generes'}
        />
      </div>

      <div className="card-modern flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, telephone, email..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-on-surface-variant shrink-0" />
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Tous les groupes</option>
            <option value="standard">Standard</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="vip">VIP</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="recent">Plus recents</option>
            <option value="points">Plus de points</option>
            <option value="name">Nom (A-Z)</option>
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Client</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Telephone</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Groupe</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Commandes</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Points</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Remise</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const group = (client as any).group_name || 'standard'
                  const isVip = group === 'vip'
                  const ordersInfo = ordersByClient[client.id] || { count: 0, total: 0 }
                  return (
                    <tr key={client.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${client.first_name} ${client.last_name || ''}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-on-surface truncate">
                                {client.first_name} {client.last_name}
                              </span>
                              {isVip && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                            </div>
                            <span className="text-xs text-on-surface-variant truncate block">
                              {client.email || 'Non renseigne'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm text-on-surface font-medium whitespace-nowrap">
                        {client.phone}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={'badge-modern ' + (GROUP_COLORS[group] || GROUP_COLORS.standard)}>
                          {isVip && <Star size={10} />}
                          {group.charAt(0).toUpperCase() + group.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">
                            {ordersInfo.count} commande(s)
                          </span>
                          {ordersInfo.total > 0 && (
                            <span className="text-xs text-on-surface-variant">
                              {ordersInfo.total.toLocaleString('fr-FR')} XOF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={'badge-modern ' + ((client.loyalty_points || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant')}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + ((client.loyalty_points || 0) > 0 ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {client.loyalty_points || 0} pts
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-on-surface-variant font-semibold whitespace-nowrap">
                        {client.discount_rate || 0}%
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <StatusBadge status={client.is_blacklisted ? 'cancelled' : 'active'} label={client.is_blacklisted ? 'Liste noire' : 'Actif'} />
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setViewClient(client)} className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white transition-all flex items-center justify-center text-on-surface-variant" title="Voir">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handleEdit(client)} className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white transition-all flex items-center justify-center text-on-surface-variant" title="Modifier">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(client.id)} className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Supprimer">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-modern text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
            <Users size={28} className="text-on-surface-variant/50" />
          </div>
          <p className="text-on-surface-variant mb-4">Aucun client trouve</p>
          <button onClick={() => setShowForm(true)} className="btn-modern-primary mx-auto">
            <Plus size={18} strokeWidth={2.5} />
            Ajouter un client
          </button>
        </div>
      )}

      <Modal open={showForm} onClose={resetForm} title={editClient ? 'Modifier le client' : 'Nouveau client'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prenom" required>
              <Input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Prenom" />
            </Field>
            <Field label="Nom">
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Nom" />
            </Field>
            <Field label="Telephone" required>
              <Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 07 XX XX XX XX" />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+225 07 XX XX XX XX" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@..." />
            </Field>
            <Field label="Groupe">
              <Select value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="vip">VIP</option>
              </Select>
            </Field>
            <Field label="Remise (%)">
              <Input type="number" min="0" max="100" value={form.discount_rate} onChange={e => setForm({ ...form, discount_rate: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Points fidelite">
              <Input type="number" min="0" value={form.loyalty_points} onChange={e => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Adresse">
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse..." />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes sur ce client..." />
          </Field>
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <input type="checkbox" id="blacklist" checked={form.is_blacklisted} onChange={e => setForm({ ...form, is_blacklisted: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="blacklist" className="text-sm font-semibold text-red-700 cursor-pointer">Mettre en liste noire</label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" loading={saving}>{editClient ? 'Modifier' : 'Creer le client'}</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {viewClient && (
        <Modal open={!!viewClient} onClose={() => setViewClient(null)} title="Detail client">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-primary-fixed/40 rounded-xl">
              <Avatar name={`${viewClient.first_name} ${viewClient.last_name || ''}`} size="lg" />
              <div>
                <p className="text-xl font-bold text-on-surface">{viewClient.first_name} {viewClient.last_name}</p>
                <p className="text-sm text-on-surface-variant">{viewClient.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Email', v: viewClient.email || '-' },
                { l: 'WhatsApp', v: (viewClient as any).whatsapp || '-' },
                { l: 'Points fidelite', v: String(viewClient.loyalty_points || 0) },
                { l: 'Remise', v: (viewClient.discount_rate || 0) + '%' },
                { l: 'Adresse', v: (viewClient as any).address || '-' },
                { l: 'Statut', v: viewClient.is_blacklisted ? 'Liste noire' : 'Actif' },
              ].map((item, i) => (
                <div key={i} className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant">{item.l}</p>
                  <p className="font-semibold text-sm mt-0.5 text-on-surface">{item.v}</p>
                </div>
              ))}
            </div>
            {(viewClient as any).notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-on-surface">{(viewClient as any).notes}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => { setViewClient(null); handleEdit(viewClient) }} icon={<Pencil size={16} />}>Modifier</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setViewClient(null)}>Fermer</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ClientsPageModern
