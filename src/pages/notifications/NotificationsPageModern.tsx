// src/pages/notifications/NotificationsPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useNotificationStore, useOrderStore, useClientStore } from '../../lib/store'
import { notificationService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Textarea, Button, Modal, Avatar } from '../../components/ui'
import {
  Bell, Plus, Send, MessageCircle, Mail, Smartphone, CheckCircle2,
  XCircle, Clock, Zap, TrendingUp, Filter, Search, Sparkles,
  History, FileText, ToggleLeft, ToggleRight, AlertTriangle, ChevronRight
} from 'lucide-react'
import type { Notification } from '../../types'

const CHANNEL_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any; color: string }> = {
  whatsapp: { label: 'WhatsApp', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: MessageCircle, color: '#25d366' },
  sms:      { label: 'SMS',      bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Smartphone,    color: '#3b82f6' },
  email:    { label: 'Email',    bg: 'bg-violet-50',  text: 'text-violet-700',  icon: Mail,          color: '#8b5cf6' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'En attente', bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  sent:    { label: 'Envoye',     bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  failed:  { label: 'Echoue',     bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500' },
}

const TRIGGERS = [
  { id: 'auto-ready', label: 'SMS automatique quand statut = Pret', desc: 'Envoi instantane du solde restant et du lieu de retrait', active: true },
  { id: 'auto-reminder', label: 'Rappel automatique apres 5 jours', desc: 'Alerte client par SMS ou WhatsApp pour liberer les portants', active: true },
  { id: 'auto-driver', label: 'Alerte WhatsApp assignation livreur', desc: 'Partage du nom et contact du coursier au destinataire', active: false },
  { id: 'auto-birthday', label: 'Message anniversaire client', desc: 'Offre speciale automatique le jour d anniversaire', active: false },
]

export const NotificationsPageModern: React.FC = () => {
  const { notifications: localNotifs, addNotification, updateNotification } = useNotificationStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const orders = useOrderStore(s => s.orders)
  const clients = useClientStore(s => s.clients)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'triggers'>('history')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [triggers, setTriggers] = useState(TRIGGERS)

  const [form, setForm] = useState({
    client_id: '',
    type: 'whatsapp' as Notification['type'],
    message: ''
  })

  useEffect(() => {
    notificationService.getAll()
      .then(data => setNotifications(data as any[]))
      .catch(() => setNotifications(localNotifs as any[]))
  }, [])

  // ============================================
  // CALCULS
  // ============================================
  const readyOrders = useMemo(() => orders.filter(o => o.status === 'pret'), [orders])
  const pendingCount = useMemo(() => notifications.filter(n => n.status === 'pending').length, [notifications])
  const sentCount = useMemo(() => notifications.filter(n => n.status === 'sent').length, [notifications])
  const failedCount = useMemo(() => notifications.filter(n => n.status === 'failed').length, [notifications])

  const filtered = useMemo(() => {
    return notifications
      .slice()
      .reverse()
      .filter(n => {
        const ms = !search ||
          n.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          n.client_phone?.includes(search)
        const mst = !filterStatus || n.status === filterStatus
        return ms && mst
      })
  }, [notifications, search, filterStatus])

  // ============================================
  // ACTIONS
  // ============================================
  const handleBulkReady = () => {
    if (readyOrders.length === 0) {
      toast.warning('Aucune commande prete', { description: 'Il n y a rien a notifier' })
      return
    }
    readyOrders.forEach(order => {
      addNotification({
        id: crypto.randomUUID(),
        client_id: order.client_id,
        client_name: `${order.client?.first_name} ${order.client?.last_name}`,
        client_phone: order.client?.phone || '',
        type: 'whatsapp',
        message: `Bonjour ${order.client?.first_name} ! Votre commande #${order.ticket_number} est prete. - PressingManager`,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    })
    toast.success(`${readyOrders.length} notification(s) preparee(s)`, {
      description: 'Consultez la liste pour les envoyer'
    })
  }

  const handleSendNotification = (n: Notification) => {
    const url = n.type === 'whatsapp'
      ? `https://wa.me/${n.client_phone.replace(/\s/g, '')}?text=${encodeURIComponent(n.message)}`
      : `sms:${n.client_phone}`
    window.open(url, '_blank')
    updateNotification(n.id, { status: 'sent', sent_at: new Date().toISOString() })
    toast.success('Message envoye', { description: n.client_name })
  }

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault()
    const c = clients.find(cl => cl.id === form.client_id)
    if (!c) {
      toast.warning('Client non selectionne')
      return
    }
    if (!form.message.trim()) {
      toast.warning('Message vide')
      return
    }
    addNotification({
      id: crypto.randomUUID(),
      client_id: c.id,
      client_name: `${c.first_name} ${c.last_name}`,
      client_phone: c.phone,
      type: form.type,
      message: form.message,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    toast.success('Notification preparee', { description: c.first_name })
    setShowForm(false)
    setForm({ client_id: '', type: 'whatsapp', message: '' })
  }

  const toggleTrigger = (id: string) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
    const trigger = triggers.find(t => t.id === id)
    if (trigger) {
      toast.success(trigger.active ? 'Declencheur desactive' : 'Declencheur active', {
        description: trigger.label
      })
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
              Notifications & Alertes
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              {pendingCount + sentCount} message(s)
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Communication client par SMS, WhatsApp et Email
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {readyOrders.length > 0 && (
            <button
              onClick={handleBulkReady}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md transition-all"
            >
              <Bell size={16} />
              Notifier {readyOrders.length} client(s)
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-modern-primary">
            <Plus size={18} strokeWidth={2.5} />
            Nouveau message
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">SMS envoyes</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <Send size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {sentCount}
              <span className="text-sm font-bold ml-1.5">messages</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              99.2% delivres
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">En attente</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                <Clock size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pendingCount}
              <span className="text-sm font-bold ml-1.5">messages</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              Prets a envoyer
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Credit SMS</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <Smartphone size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              1518
              <span className="text-sm font-bold ml-1.5">restants</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">
              Orange - MTN - Moov
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-red-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Alertes systeme</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-400 text-white flex items-center justify-center shadow-md">
                <AlertTriangle size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {failedCount}
              <span className="text-sm font-bold ml-1.5">echecs</span>
            </div>
            <p className="text-[11px] text-red-700 mt-2 font-medium">
              A reessayer
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
          {[
            { key: 'history' as const, label: 'Historique', icon: History },
            { key: 'templates' as const, label: 'Modeles', icon: FileText },
            { key: 'triggers' as const, label: 'Declencheurs', icon: Zap },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ' +
                  (isActive ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
                }
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'history' && (
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-56">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher client..."
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="sent">Envoye</option>
              <option value="failed">Echoue</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB HISTORY */}
      {activeTab === 'history' && (
        filtered.length > 0 ? (
          <div className="card-modern !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Client</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Canal</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Message</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(n => {
                    const channel = CHANNEL_CONFIG[n.type] || CHANNEL_CONFIG.whatsapp
                    const status = STATUS_CONFIG[n.status] || STATUS_CONFIG.pending
                    const ChannelIcon = channel.icon
                    return (
                      <tr key={n.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={n.client_name || '?'} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-on-surface truncate">{n.client_name}</p>
                              <p className="text-xs text-on-surface-variant">{n.client_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={'badge-modern ' + channel.bg + ' ' + channel.text}>
                            <ChannelIcon size={11} />
                            {channel.label}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-sm text-on-surface-variant max-w-md truncate">
                            {n.message}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <span className={'badge-modern ' + status.bg + ' ' + status.text}>
                            <span className={'w-1.5 h-1.5 rounded-full ' + status.dot} />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          {n.status === 'pending' && (
                            <button
                              onClick={() => handleSendNotification(n)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-semibold transition-all"
                            >
                              <Send size={12} />
                              Envoyer
                            </button>
                          )}
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
              <Bell size={28} className="text-on-surface-variant/50" />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">Aucune notification</p>
            <p className="text-xs text-on-surface-variant mb-4">Preparez votre premier message client</p>
            <button onClick={() => setShowForm(true)} className="btn-modern-primary mx-auto">
              <Plus size={16} strokeWidth={2.5} />
              Nouveau message
            </button>
          </div>
        )
      )}

      {/* TAB TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Message de reception', desc: 'Bonjour {prenom}, votre commande {ticket} de {nb} article(s) est enregistree. Retrait prevu le {date}.', channel: 'sms' },
            { title: 'Vetements prets', desc: 'Bonjour {prenom}, vos vetements sont prets ! Ticket {ticket}. Reste a payer : {reste} XOF.', channel: 'whatsapp' },
            { title: 'Rappel J+5', desc: 'Bonjour {prenom}, votre commande {ticket} vous attend depuis 5 jours au {adresse}.', channel: 'whatsapp' },
            { title: 'Confirmation livraison', desc: 'Votre coursier {coursier} arrive dans 15 min pour la livraison de {ticket}.', channel: 'sms' },
            { title: 'Anniversaire client', desc: 'Joyeux anniversaire {prenom} ! Profitez de -20% sur votre prochain depot.', channel: 'whatsapp' },
            { title: 'Solde a payer', desc: 'Bonjour {prenom}, il reste {reste} XOF a regler pour votre commande {ticket}.', channel: 'sms' },
          ].map((tpl, i) => {
            const channel = CHANNEL_CONFIG[tpl.channel]
            const ChannelIcon = channel.icon
            return (
              <div key={i} className="card-modern hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center ' + channel.bg + ' ' + channel.text}>
                      <ChannelIcon size={14} />
                    </div>
                    <h3 className="font-bold text-sm text-on-surface">{tpl.title}</h3>
                  </div>
                  <span className={'badge-modern ' + channel.bg + ' ' + channel.text}>
                    {channel.label}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4 p-3 bg-surface-container-low rounded-lg font-mono text-xs">
                  {tpl.desc}
                </p>
                <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  Utiliser ce modele <ChevronRight size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB TRIGGERS */}
      {activeTab === 'triggers' && (
        <div className="card-modern">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Declencheurs automatiques
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Automatisez la communication avec vos clients
              </p>
            </div>
            <Zap size={20} className="text-amber-500" />
          </div>

          <div className="flex flex-col gap-3">
            {triggers.map(trigger => (
              <div
                key={trigger.id}
                className={
                  'flex items-start gap-4 p-4 rounded-xl border transition-all ' +
                  (trigger.active
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-surface-container-low border-outline-variant/30')
                }
              >
                <div className={
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' +
                  (trigger.active ? 'bg-emerald-500 text-white' : 'bg-surface-container text-on-surface-variant')
                }>
                  <Zap size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface">{trigger.label}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{trigger.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleTrigger(trigger.id)}
                      className={
                        'shrink-0 transition-all ' +
                        (trigger.active ? 'text-emerald-500' : 'text-on-surface-variant')
                      }
                    >
                      {trigger.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>
                {triggers.filter(t => t.active).length} declencheur(s) actif(s) sur {triggers.length}
              </span>
            </div>
            <button className="text-xs font-semibold text-primary hover:underline">
              Gerer les scenarios avances
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE NOTIFICATION */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau message client" size="md">
        <form onSubmit={handleCreateNotification} className="space-y-4">
          <Field label="Client" required>
            <Select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Selectionner...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Canal" required>
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </Select>
          </Field>

          <Field label="Message" required>
            <Textarea
              required
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="Bonjour {prenom}, votre commande est prete..."
              rows={5}
            />
          </Field>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertTriangle size={14} className="text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800">
              Variables : <code className="bg-white px-1 rounded">{'{prenom}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{ticket}'}</code>{' '}
              <code className="bg-white px-1 rounded">{'{reste}'}</code>
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Preparer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default NotificationsPageModern

