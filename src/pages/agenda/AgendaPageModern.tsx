// src/pages/agenda/AgendaPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useAgendaStore, useOrderStore } from '../../lib/store'
import { agendaService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Textarea, Button, Modal } from '../../components/ui'
import {
  Calendar as CalendarIcon, Plus, Trash2, Truck, Bell, Plane,
  Star, ChevronLeft, ChevronRight, Clock, Package, TrendingUp,
  AlertCircle, CheckCircle2, Sparkles, Users, Target
} from 'lucide-react'
import type { AgendaEvent } from '../../types'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  livraison: { label: 'Livraison', color: '#3b82f6', bg: '#dbeafe', icon: Truck },
  rappel: { label: 'Rappel', color: '#f59e0b', bg: '#fef3c7', icon: Bell },
  conge: { label: 'Conge', color: '#10b981', bg: '#d1fae5', icon: Plane },
  autre: { label: 'Autre', color: '#6b7280', bg: '#f1f5f9', icon: Star },
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const AgendaPageModern: React.FC = () => {
  const { events: localEvents, addEvent, deleteEvent } = useAgendaStore()
  const orders = useOrderStore(s => s.orders)
  const [dbEvents, setDbEvents] = useState<AgendaEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: 'rappel' as AgendaEvent['type'],
    date: selectedDate,
    time: '09:00',
    description: ''
  })

  // ============================================
  // CHARGEMENT
  // ============================================
  useEffect(() => {
    agendaService.getAll()
      .then(data => setDbEvents(data as AgendaEvent[]))
      .catch(() => setDbEvents(localEvents))
  }, [])

  const events = useMemo(() => {
    const all = [...dbEvents]
    localEvents.forEach(le => { if (!all.find(e => e.id === le.id)) all.push(le) })
    return all
  }, [dbEvents, localEvents])

  // ============================================
  // CALENDRIER
  // ============================================
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const days = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    // On veut commencer par Lundi (1) -> on décale
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const grid = []
    for (let i = 0; i < startOffset; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) grid.push(d)
    while (grid.length % 7 !== 0) grid.push(null)
    return grid
  }, [year, month])

  const daysWithOrders = useMemo(() =>
    new Set(
      orders
        .filter(o => o.expected_at && o.status !== 'annule' && o.status !== 'livre')
        .map(o => o.expected_at.split('T')[0])
    ),
    [orders]
  )

  const daysWithEvents = useMemo(() => new Set(events.map(e => e.date)), [events])

  const dayOrders = useMemo(() =>
    orders.filter(o =>
      o.expected_at &&
      o.expected_at.startsWith(selectedDate) &&
      o.status !== 'annule' &&
      o.status !== 'livre'
    ),
    [orders, selectedDate]
  )

  const dayEvents = useMemo(() =>
    events
      .filter(e => e.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [events, selectedDate]
  )

  // ============================================
  // NAVIGATION MOIS
  // ============================================
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  // ============================================
  // ACTIONS
  // ============================================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.warning('Titre obligatoire', { description: 'Veuillez saisir un titre pour l evenement' })
      return
    }
    addEvent({
      id: crypto.randomUUID(),
      ...form,
      created_at: new Date().toISOString()
    })
    toast.success('Evenement ajoute', {
      description: `${form.title} · ${new Date(form.date).toLocaleDateString('fr-FR')}`
    })
    setShowForm(false)
    setForm({
      title: '',
      type: 'rappel',
      date: selectedDate,
      time: '09:00',
      description: ''
    })
  }

  const handleDeleteEvent = (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return
    deleteEvent(id)
    toast.success('Evenement supprime', { description: title })
  }

  // ============================================
  // STATS JOUR
  // ============================================
  const dayRevenue = dayOrders.reduce((s, o) => s + o.total, 0)
  const dayClothes = dayOrders.reduce((s, o) => s + (o.clothes?.length || 0), 0)

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
              Agenda & Planning
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              {events.length} evenement(s)
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Planification des livraisons et evenements de votre pressing
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ ...form, date: selectedDate })
            setShowForm(true)
          }}
          className="btn-modern-primary self-start md:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          Nouvel evenement
        </button>
      </div>

      {/* LAYOUT 3 COLONNES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* CALENDRIER */}
        <div className="card-modern !p-4">
          {/* Header calendrier */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="text-sm font-bold text-on-surface capitalize hover:text-primary transition"
            >
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Grille */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const hasOrders = daysWithOrders.has(dateStr)
              const hasEvents = daysWithEvents.has(dateStr)

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={
                    'aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all relative ' +
                    (isSelected ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-md' :
                     isToday ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300' :
                     'hover:bg-surface-container text-on-surface')
                  }
                >
                  <span>{day}</span>
                  {(hasOrders || hasEvents) && (
                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                      {hasOrders && <div className={'w-1 h-1 rounded-full ' + (isSelected ? 'bg-white' : 'bg-blue-500')} />}
                      {hasEvents && <div className={'w-1 h-1 rounded-full ' + (isSelected ? 'bg-white' : 'bg-amber-500')} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Légende */}
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Livraisons prevues</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Evenements</span>
            </div>
          </div>
        </div>

        {/* DETAIL JOUR + CHARGE */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Détail du jour */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg text-on-surface capitalize" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {dayOrders.length + dayEvents.length} element(s) planifie(s)
                </p>
              </div>
              <CalendarIcon size={20} className="text-primary" />
            </div>

            {/* Mini KPI du jour */}
            {dayOrders.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Livraisons</p>
                  <p className="text-xl font-black text-blue-900 mt-1">{dayOrders.length}</p>
                </div>
                <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Articles</p>
                  <p className="text-xl font-black text-emerald-900 mt-1">{dayClothes}</p>
                </div>
                <div className="rounded-xl p-3 bg-violet-50 border border-violet-100">
                  <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">CA</p>
                  <p className="text-xl font-black text-violet-900 mt-1">
                    {(dayRevenue / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            )}

            {/* Livraisons du jour */}
            {dayOrders.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck size={14} className="text-blue-600" />
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    Livraisons prevues ({dayOrders.length})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {dayOrders.map(order => (
                    <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100/60 transition">
                      <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-900 truncate">
                          #{order.ticket_number} · {order.client?.first_name} {order.client?.last_name}
                        </p>
                        <p className="text-xs text-blue-700">
                          {order.clothes?.length || 0} article(s) · {order.total.toLocaleString('fr-FR')} XOF
                          {order.remaining > 0 && ` · Reste: ${order.remaining.toLocaleString('fr-FR')}`}
                        </p>
                      </div>
                      <span className={
                        'badge-modern ' +
                        (order.status === 'pret' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')
                      }>
                        <span className={'w-1.5 h-1.5 rounded-full ' + (order.status === 'pret' ? 'bg-emerald-500' : 'bg-amber-500')} />
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Événements du jour */}
            {dayEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={14} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Evenements ({dayEvents.length})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {dayEvents.map(event => {
                    const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.autre
                    const Icon = config.icon
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition">
                        <div className="text-center shrink-0">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: config.bg, color: config.color }}>
                            <Icon size={18} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-on-surface">{event.title}</p>
                            <button
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={11} className="text-on-surface-variant" />
                            <span className="text-xs text-on-surface-variant font-medium">{event.time}</span>
                            <span className="badge-modern" style={{ backgroundColor: config.bg, color: config.color }}>
                              {config.label}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-on-surface-variant mt-1.5">{event.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {dayOrders.length === 0 && dayEvents.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center mb-4">
                  <CalendarIcon size={28} className="text-on-surface-variant/50" />
                </div>
                <p className="text-sm font-bold text-on-surface mb-1">Journee libre</p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Aucune livraison ni evenement ce jour
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-modern-primary mx-auto text-xs"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Ajouter un evenement
                </button>
              </div>
            )}
          </div>

          {/* Charge 7 jours */}
          <div className="card-modern">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Charge des 7 prochains jours
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Nombre de livraisons prevues par jour
                </p>
              </div>
              <TrendingUp size={18} className="text-primary" />
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() + i)
                const ds = d.toISOString().split('T')[0]
                const count = orders.filter(o =>
                  o.expected_at?.startsWith(ds) &&
                  o.status !== 'annule' &&
                  o.status !== 'livre'
                ).length
                const isSelected = ds === selectedDate
                const isSunday = d.getDay() === 0

                const level = isSunday ? 'ferme' : count === 0 ? 'libre' : count <= 3 ? 'calme' : count <= 7 ? 'charge' : 'plein'

                const styles: Record<string, string> = {
                  ferme: 'bg-slate-100 text-slate-400 border-slate-200',
                  libre: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                  calme: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  charge: 'bg-amber-50 text-amber-700 border-amber-200',
                  plein: 'bg-red-50 text-red-700 border-red-200',
                }

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(ds)}
                    className={
                      'p-3 rounded-xl border-2 transition-all text-center ' +
                      styles[level] +
                      (isSelected ? ' ring-2 ring-violet-400 ring-offset-1' : '')
                    }
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider capitalize">
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-black mt-1">{d.getDate()}</p>
                    <p className="text-xl font-black mt-1">{count}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">
                      {level}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-outline-variant/30 flex-wrap">
              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Calme</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Charge</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Plein</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Ferme</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL NOUVEL ÉVÉNEMENT */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvel evenement"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Titre" required>
            <Input
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Livraison client Dupont"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AgendaEvent['type'] })}>
                <option value="livraison">Livraison</option>
                <option value="rappel">Rappel</option>
                <option value="conge">Conge</option>
                <option value="autre">Autre</option>
              </Select>
            </Field>
            <Field label="Date" required>
              <Input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Heure" required>
              <Input
                type="time"
                required
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Details de l evenement..."
              rows={3}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Enregistrer
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AgendaPageModern
