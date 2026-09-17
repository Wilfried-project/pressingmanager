import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/store'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  ScanLine, Wallet, MessageSquare, Tag,
  TrendingUp, TrendingDown, ArrowRight, Sparkles
} from 'lucide-react'
import { KpiCard, StatusBadge, Avatar } from '../../components/ui'

// ============================================
// ICONES MATERIAL SYMBOLS
// ============================================
const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({
  name, size = 20, className = ''
}) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
    {name}
  </span>
)

// ============================================
// CONSTANTES
// ============================================
const COLORS = ['#630ed4', '#4b41e1', '#005b3d', '#f97316', '#ba1a1a', '#8b5cf6', '#14b8a6']

const STATUS_LABELS: Record<string, string> = {
  recu: 'Recu', en_attente: 'En attente', tri: 'Tri', lavage: 'Lavage',
  sechage: 'Sechage', repassage: 'Repassage', emballage: 'Emballage',
  pret: 'Pret', livre: 'Livre', annule: 'Annule'
}

const STATUS_TO_BADGE: Record<string, any> = {
  recu: 'pending', en_attente: 'pending', tri: 'inProgress', lavage: 'inProgress',
  sechage: 'inProgress', repassage: 'inProgress', emballage: 'inProgress',
  pret: 'ready', livre: 'delivered', annule: 'cancelled'
}

async function getTenantId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: emp } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', session.user.id)
    .single()
  return emp?.tenant_id || null
}

// ============================================
// COMPOSANT
// ============================================
export const DashboardModern: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayOrders: 0, todayClothes: 0, readyOrders: 0,
    todayCA: 0, monthCA: 0, totalClients: 0,
    lateOrders: 0, activeEmployees: 0, todayDeliveries: 0,
    completedOrders: 0, cancelledOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([])
  const [caByDay, setCaByDay] = useState<any[]>([])
  const [clothesByDay, setClothesByDay] = useState<any[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [lateOrdersList, setLateOrdersList] = useState<any[]>([])

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const tenantId = await getTenantId()
      if (!tenantId) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

      const { data: orders } = await supabase
        .from('orders')
        .select('*, client:clients(*), clothes(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (!orders) return

      const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
      const todayClothes = todayOrders.reduce((s, o) => s + (o.clothes?.length || 0), 0)
      const readyOrders = orders.filter(o => o.status === 'pret').length
      const todayCA = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
      const monthOrders = orders.filter(o => new Date(o.created_at) >= new Date(monthStart))
      const monthCA = monthOrders.reduce((s, o) => s + (o.total || 0), 0)
      const lateOrders = orders.filter(o => {
        if (!o.expected_at || ['livre', 'annule'].includes(o.status)) return false
        return new Date(o.expected_at) < new Date()
      })
      const completedOrders = orders.filter(o => o.status === 'livre').length
      const cancelledOrders = orders.filter(o => o.status === 'annule').length

      const { count: totalClients } = await supabase
        .from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)

      const { count: activeEmployees } = await supabase
        .from('employees').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('is_active', true)

      const statusMap: Record<string, number> = {}
      orders.forEach(o => {
        const s = STATUS_LABELS[o.status] || o.status
        statusMap[s] = (statusMap[s] || 0) + 1
      })
      const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

      const caByDay: any[] = []
      const clothesByDay: any[] = []
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
        const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1)
        const dayOrders = orders.filter(o => {
          const created = new Date(o.created_at)
          return created >= d && created < nextD
        })
        const ca = dayOrders.reduce((s, o) => s + (o.total || 0), 0)
        const clothes = dayOrders.reduce((s, o) => s + (o.clothes?.length || 0), 0)
        caByDay.push({ name: dayNames[d.getDay()], ca })
        clothesByDay.push({ name: dayNames[d.getDay()], habits: clothes })
      }

      const clientMap: Record<string, { name: string, total: number, count: number }> = {}
      orders.forEach(o => {
        if (!o.client) return
        const id = o.client_id
        if (!clientMap[id]) {
          clientMap[id] = {
            name: `${o.client.first_name} ${o.client.last_name}`,
            total: 0, count: 0
          }
        }
        clientMap[id].total += o.total || 0
        clientMap[id].count++
      })
      const topClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 5)

      setStats({
        todayOrders: todayOrders.length, todayClothes, readyOrders,
        todayCA, monthCA, totalClients: totalClients || 0,
        lateOrders: lateOrders.length, activeEmployees: activeEmployees || 0,
        todayDeliveries: 0, completedOrders, cancelledOrders
      })
      setRecentOrders(orders.slice(0, 5))
      setOrdersByStatus(ordersByStatus)
      setCaByDay(caByDay)
      setClothesByDay(clothesByDay)
      setTopClients(topClients)
      setLateOrdersList(lateOrders.slice(0, 3))
    } catch (err) {
      console.error('Erreur dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-on-surface-variant font-medium">Chargement du tableau de bord...</p>
    </div>
  )

  const maxCA = Math.max(...caByDay.map(d => d.ca), 1)
  const totalCA7j = caByDay.reduce((s, d) => s + d.ca, 0)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-3xl font-extrabold text-on-surface tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Tableau de Bord
            </h1>
            <span className="badge-modern bg-emerald-50 text-emerald-700">
              <span className="badge-dot bg-emerald-500 animate-pulse" />
              EN TEMPS REEL
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1 capitalize">{today}</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="btn-modern-primary self-start sm:self-auto"
        >
          <Icon name="add_circle" size={18} />
          Nouvelle commande
        </button>
      </div>

      {/* ============ BANDEAU ALERTES ============ */}
      {lateOrdersList.length > 0 && (
        <div
          onClick={() => navigate('/orders')}
          className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 via-red-50/50 to-white border border-red-100 cursor-pointer hover:shadow-md transition-all animate-fade-in"
        >
          <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="notification_important" size={22} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">
              {lateOrdersList.length} commande(s) en retard
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Clients a contacter immediatement - cliquez pour voir
            </p>
          </div>
          <ArrowRight size={18} className="text-red-500 shrink-0" />
        </div>
      )}

      {/* ============ KPI LIGNE 1 - OPERATIONS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Commandes aujourd'hui"
          value={stats.todayOrders}
          unit="tickets"
          icon={<Icon name="receipt_long" size={18} />}
          sub={`${stats.todayClothes} vetements`}
          trend={14}
        />
        <KpiCard
          label="Vetements recus"
          value={stats.todayClothes}
          unit="pieces"
          icon={<Icon name="local_laundry_service" size={18} />}
          trend={8}
        />
        <KpiCard
          label="Prets a recuperer"
          value={stats.readyOrders}
          unit="commandes"
          icon={<Icon name="check_circle" size={18} />}
          sub="A notifier"
        />
        <KpiCard
          label="Livre aujourd'hui"
          value={stats.todayDeliveries}
          unit="commandes"
          icon={<Icon name="local_shipping" size={18} />}
        />
      </div>

      {/* ============ KPI LIGNE 2 - FINANCE ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CA aujourd'hui"
          value={stats.todayCA.toLocaleString('fr-FR')}
          unit="XOF"
          icon={<Icon name="payments" size={18} />}
          variant="primary"
          trend={14}
        />
        <KpiCard
          label="CA du mois"
          value={stats.monthCA.toLocaleString('fr-FR')}
          unit="XOF"
          icon={<TrendingUp size={18} />}
          trend={6}
        />
        <KpiCard
          label="Clients actifs"
          value={stats.totalClients}
          unit="clients"
          icon={<Icon name="groups" size={18} />}
        />
        <KpiCard
          label="Retards"
          value={stats.lateOrders}
          unit="a traiter"
          icon={<Icon name="warning" size={18} />}
          sub={stats.lateOrders > 0 ? 'Action requise' : 'Tout est bon'}
        />
      </div>

      {/* ============ GRAPHIQUE CA + DONUT ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart CA */}
        <div className="lg:col-span-2 card-modern">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="font-bold text-base text-on-surface"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Evolution du chiffre d'affaires
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">7 derniers jours</p>
            </div>
            <div className="text-right">
              <div className="badge-modern bg-primary-fixed text-primary">
                <Sparkles size={12} />
                {totalCA7j.toLocaleString('fr-FR')} XOF
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">Total semaine</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={caByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#630ed4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#630ed4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eaedff" vertical={false} />
                <XAxis
                  dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: '#7b7487', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#7b7487', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: 'none',
                    boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13
                  }}
                  formatter={(v: any) => [`${v.toLocaleString('fr-FR')} XOF`, 'CA']}
                />
                <Area
                  type="monotone" dataKey="ca"
                  stroke="#630ed4" strokeWidth={3}
                  fill="url(#gradCA)"
                  dot={{ r: 4, fill: '#630ed4', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#630ed4', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut statuts */}
        <div className="card-modern">
          <h3
            className="font-bold text-base text-on-surface mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Commandes par statut
          </h3>
          <p className="text-xs text-on-surface-variant mb-4">Repartition actuelle</p>

          {ordersByStatus.length > 0 ? (
            <>
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatus} cx="50%" cy="50%"
                      outerRadius={70} innerRadius={45}
                      dataKey="value" paddingAngle={3}
                    >
                      {ordersByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, border: 'none',
                        boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)',
                        fontSize: 12
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {ordersByStatus.reduce((s, d) => s + d.value, 0)}
                    </div>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-3 max-h-32 overflow-y-auto">
                {ordersByStatus.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-on-surface-variant font-medium">{s.name}</span>
                    </div>
                    <span className="font-bold text-on-surface">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-12">Aucune commande</p>
          )}
        </div>
      </div>

      {/* ============ TOP CLIENTS + VETEMENTS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top clients */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="font-bold text-base text-on-surface"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Top Clients
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Meilleurs chiffres d'affaires</p>
            </div>
            <button
              onClick={() => navigate('/clients')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tous
            </button>
          </div>

          {topClients.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topClients.map((c, i) => {
                const maxTotal = topClients[0].total || 1
                const pct = (c.total / maxTotal) * 100
                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-primary-fixed text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <Avatar name={c.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-on-surface truncate">{c.name}</p>
                        <p className="text-xs font-bold text-primary shrink-0">
                          {c.total.toLocaleString('fr-FR')} XOF
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-on-surface-variant shrink-0">
                          {c.count} cmd
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant text-center py-8">Aucune vente</p>
          )}
        </div>

        {/* Vetements 7 jours */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="font-bold text-base text-on-surface"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Volume de vetements
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">7 derniers jours</p>
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clothesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHabits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4b41e1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4b41e1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eaedff" vertical={false} />
                <XAxis
                  dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: '#7b7487', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7b7487', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: 'none',
                    boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)',
                    fontSize: 13
                  }}
                  formatter={(v: any) => [`${v} pieces`, 'Vetements']}
                />
                <Area
                  type="monotone" dataKey="habits"
                  stroke="#4b41e1" strokeWidth={3}
                  fill="url(#gradHabits)"
                  dot={{ r: 4, fill: '#4b41e1', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#4b41e1', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ============ COMMANDES RECENTES ============ */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="font-bold text-base text-on-surface"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Commandes recentes
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">5 dernieres commandes</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="btn-modern-ghost text-primary text-xs font-semibold"
          >
            Voir tout <ArrowRight size={14} />
          </button>
        </div>

        {recentOrders.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => navigate('/orders')}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    name={`${o.client?.first_name || '?'} ${o.client?.last_name || ''}`}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary truncate">
                      #{o.ticket_number}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {o.client?.first_name} {o.client?.last_name} - {o.clothes?.length || 0} vet.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <StatusBadge status={STATUS_TO_BADGE[o.status] || 'pending'} />
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-on-surface">
                    {(o.total || 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">XOF</p>
                </div>

                <ArrowRight
                  size={16}
                  className="text-on-surface-variant group-hover:text-primary transition-colors shrink-0"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Icon name="shopping_bag" size={36} className="text-on-surface-variant/50" />
            <p className="text-sm text-on-surface-variant mt-3">Aucune commande</p>
            <button
              onClick={() => navigate('/orders')}
              className="btn-modern-primary mt-4 text-xs"
            >
              Creer la premiere
            </button>
          </div>
        )}
      </div>

      {/* ============ RACCOURCIS ============ */}
      <div className="card-modern">
        <h3
          className="font-bold text-base text-on-surface mb-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Raccourcis operationnels
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: ScanLine, label: 'Scan QR Atelier', desc: 'Pointer les lots', path: '/atelier', color: 'from-primary to-primary-container' },
            { icon: Wallet, label: 'Ouvrir la Caisse', desc: 'Enregistrer les paiements', path: '/cashier', color: 'from-emerald-500 to-emerald-600' },
            { icon: MessageSquare, label: 'SMS Groupe', desc: 'Informer les clients', path: '/notifications', color: 'from-blue-500 to-blue-600' },
            { icon: Tag, label: 'Grille tarifs', desc: 'Prix des prestations', path: '/services', color: 'from-amber-500 to-orange-500' },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => navigate(s.path)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 transition-all text-left group hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{s.label}</p>
                <p className="text-[11px] text-on-surface-variant">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-on-surface-variant py-4">
        2026 - PressingManager. Tous droits reserves.
      </p>
    </div>
  )
}

export default DashboardModern
