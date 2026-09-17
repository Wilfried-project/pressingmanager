// src/pages/delivery/DeliveryPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useDeliveryStore, useOrderStore } from '../../lib/store'
import { employeeService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Textarea, Button, Modal, Avatar } from '../../components/ui'
import {
  Truck, Plus, MapPin, Phone, User, Package, Clock,
  CheckCircle2, XCircle, Navigation, TrendingUp, Filter,
  Calendar, Search, Sparkles, Target, Route
} from 'lucide-react'
import type { Delivery, Employee } from '../../types'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  planifie: { label: 'Planifie', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', icon: Calendar },
  en_route: { label: 'En route', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', icon: Navigation },
  livre: { label: 'Livre', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  echec: { label: 'Echec', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', icon: XCircle },
}

export const DeliveryPageModern: React.FC = () => {
  const { deliveries, addDelivery, updateDelivery, getTodayDeliveries } = useDeliveryStore()
  const orders = useOrderStore(s => s.orders)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({
    order_id: '',
    driver_id: '',
    address: '',
    scheduled_at: '',
    notes: ''
  })

  useEffect(() => {
    employeeService.getAll()
      .then(data => setEmployees(data as Employee[]))
      .catch(err => console.error('Erreur employes:', err))
  }, [])

  // ============================================
  // CALCULS
  // ============================================
  const readyOrders = useMemo(() => orders.filter(o => o.status === 'pret'), [orders])
  const livreurs = useMemo(() =>
    employees.filter(e => e.role === 'livreur' && e.is_active),
    [employees]
  )
  const todayDeliveries = getTodayDeliveries()

  const stats = useMemo(() => ({
    planifie: deliveries.filter(d => d.status === 'planifie').length,
    en_route: deliveries.filter(d => d.status === 'en_route').length,
    livre: deliveries.filter(d => d.status === 'livre').length,
    echec: deliveries.filter(d => d.status === 'echec').length,
    today: todayDeliveries.length,
  }), [deliveries, todayDeliveries])

  const filtered = useMemo(() => {
    return deliveries.filter(d => {
      const order = orders.find(o => o.id === d.order_id)
      const clientName = order ? `${order.client?.first_name} ${order.client?.last_name}`.toLowerCase() : ''
      const ms = !search ||
        d.address.toLowerCase().includes(search.toLowerCase()) ||
        clientName.includes(search.toLowerCase())
      const mst = !filterStatus || d.status === filterStatus
      return ms && mst
    }).slice().reverse()
  }, [deliveries, orders, search, filterStatus])

  // ============================================
  // ACTIONS
  // ============================================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.order_id || !form.scheduled_at) {
      toast.warning('Informations manquantes', { description: 'Commande et date obligatoires' })
      return
    }
    addDelivery({
      id: crypto.randomUUID(),
      ...form,
      status: 'planifie',
      created_at: new Date().toISOString()
    } as Delivery)
    toast.success('Livraison planifiee', {
      description: new Date(form.scheduled_at).toLocaleDateString('fr-FR')
    })
    setShowForm(false)
    setForm({ order_id: '', driver_id: '', address: '', scheduled_at: '', notes: '' })
  }

  const handleStatusChange = (delivery: Delivery, newStatus: string) => {
    updateDelivery(delivery.id, {
      status: newStatus as any,
      ...(newStatus === 'livre' ? { delivered_at: new Date().toISOString() } : {})
    })
    const config = STATUS_CONFIG[newStatus]
    if (config) {
      toast.success('Statut mis a jour', { description: config.label })
    }
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Livraisons & Courses
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              {stats.today} aujourd&apos;hui
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {deliveries.length} livraison(s) au total · {livreurs.length} coursier(s) actif(s)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-modern-primary self-start md:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          Planifier une livraison
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Planifiees</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                <Calendar size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.planifie}
              <span className="text-sm font-bold ml-1.5">courses</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              En attente de depart
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-violet-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">En route</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                <Navigation size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-violet-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.en_route}
              <span className="text-sm font-bold ml-1.5">actives</span>
            </div>
            <p className="text-[11px] text-violet-700 mt-2 font-medium">
              Coursiers en mouvement
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Livrees</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.livre}
              <span className="text-sm font-bold ml-1.5">OK</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              Depuis le debut
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-red-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Echouees</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-400 text-white flex items-center justify-center shadow-md">
                <XCircle size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.echec}
              <span className="text-sm font-bold ml-1.5">ratees</span>
            </div>
            <p className="text-[11px] text-red-700 mt-2 font-medium">
              A reprendre
            </p>
          </div>
        </div>
      </div>

      {/* ALERTE COMMANDES PRETES */}
      {readyOrders.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-white border border-violet-100 animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-violet-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Truck size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-violet-800 text-sm">
              {readyOrders.length} commande(s) prete(s) a livrer
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              Planifiez une course pour chaque commande
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 transition shrink-0"
          >
            Planifier
          </button>
        </div>
      )}

      {/* RECHERCHE + FILTRES */}
      <div className="card-modern flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, une adresse..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Filter size={16} className="text-on-surface-variant shrink-0" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifie</option>
            <option value="en_route">En route</option>
            <option value="livre">Livre</option>
            <option value="echec">Echec</option>
          </select>
        </div>
      </div>

      {/* TABLEAU */}
      {filtered.length > 0 ? (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Commande</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Client / Adresse</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Coursier</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date / Heure</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const order = orders.find(o => o.id === d.order_id)
                  const driver = employees.find(e => e.id === d.driver_id)
                  const config = STATUS_CONFIG[d.status] || STATUS_CONFIG.planifie
                  return (
                    <tr key={d.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                            <Package size={14} strokeWidth={2.5} />
                          </div>
                          <span className="font-bold text-primary text-sm">
                            {order ? `#${order.ticket_number}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {order ? `${order.client?.first_name} ${order.client?.last_name}` : '-'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                            <MapPin size={11} />
                            <span className="truncate max-w-48">{d.address || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {driver ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={driver.full_name} size="sm" />
                            <span className="text-sm text-on-surface">{driver.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Non assigne</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(d.scheduled_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={'badge-modern ' + config.bg + ' ' + config.text}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + config.dot} />
                          {config.label}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-2">
                          {order?.client?.phone && (
                            <a
                              href={`tel:${order.client.phone}`}
                              className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-on-surface-variant"
                              title="Appeler le client"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          <select
                            value={d.status}
                            onChange={e => handleStatusChange(d, e.target.value)}
                            className="text-xs py-1.5 px-2 bg-surface-container-low border border-outline-variant/30 rounded-lg font-semibold text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
                          >
                            <option value="planifie">Planifie</option>
                            <option value="en_route">En route</option>
                            <option value="livre">Livre</option>
                            <option value="echec">Echec</option>
                          </select>
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
            <Truck size={28} className="text-on-surface-variant/50" />
          </div>
          <p className="text-sm font-bold text-on-surface mb-1">Aucune livraison</p>
          <p className="text-xs text-on-surface-variant mb-4">Planifiez votre premiere course</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-modern-primary mx-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Planifier
          </button>
        </div>
      )}

      {/* MODAL */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Planifier une livraison"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Commande prete" required>
            <Select
              required
              value={form.order_id}
              onChange={e => {
                const o = orders.find(ord => ord.id === e.target.value)
                setForm({ ...form, order_id: e.target.value, address: o?.client?.address || '' })
              }}
            >
              <option value="">Selectionner...</option>
              {readyOrders.map(o => (
                <option key={o.id} value={o.id}>
                  #{o.ticket_number} · {o.client?.first_name} {o.client?.last_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Coursier">
              <Select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}>
                <option value="">Selectionner...</option>
                {livreurs.map(l => (
                  <option key={l.id} value={l.id}>{l.full_name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date et heure" required>
              <Input
                required
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Adresse de livraison" required>
            <Input
              required
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Rue, quartier, ville..."
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Instructions pour le coursier..."
              rows={3}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Planifier</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DeliveryPageModern
