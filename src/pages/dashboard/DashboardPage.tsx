import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/store'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Icône Material Symbols (Google) — celle utilisée par le design Stitch,
// différente de la police lucide-react utilisée avant ailleurs dans l'app.
const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 20, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
)

const COLORS = ['#630ed4', '#4b41e1', '#005b3d', '#f97316', '#ba1a1a', '#8b5cf6', '#14b8a6']

const STATUS_LABELS: Record<string, string> = {
  recu: 'Reçu', en_attente: 'En attente', tri: 'Tri', lavage: 'Lavage',
  sechage: 'Séchage', repassage: 'Repassage', emballage: 'Emballage',
  pret: 'Prêt', livre: 'Livré', annule: 'Annulé'
}

async function getTenantId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
  return emp?.tenant_id || null
}

export const DashboardPage: React.FC = () => {
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

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const tenantId = await getTenantId()
      if (!tenantId) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()
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
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      const { count: activeEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      const statusMap: Record<string, number> = {}
      orders.forEach(o => {
        const s = STATUS_LABELS[o.status] || o.status
        statusMap[s] = (statusMap[s] || 0) + 1
      })
      const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

      const caByDay = []
      const clothesByDay = []
      const dayNames = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0)
        const nextD = new Date(d)
        nextD.setDate(nextD.getDate() + 1)
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
        if (!clientMap[id]) clientMap[id] = { name: `${o.client.first_name} ${o.client.last_name}`, total: 0, count: 0 }
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

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-space-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Tableau de Bord</h1>
          <p className="font-body-md text-body-md text-on-surface-variant capitalize">{today}</p>
        </div>
        <button onClick={() => navigate('/orders')} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary active:scale-95 transition-all self-start sm:self-auto">
          <Icon name="add_circle" size={18} /> Nouvelle commande
        </button>
      </div>

      {/* Alerte retards */}
      {lateOrdersList.length > 0 && (
        <div onClick={() => navigate('/orders')} className="relative overflow-hidden rounded-lg bg-gradient-to-r from-error-container/80 via-error-container/40 to-surface-container-low p-space-lg shadow-sm flex items-center gap-space-md cursor-pointer hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-full bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="notification_important" size={20} />
          </div>
          <div>
            <p className="font-label-lg text-label-lg text-on-error-container font-bold">{lateOrdersList.length} commande(s) en retard</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">Clients à contacter immédiatement — cliquez pour voir</p>
          </div>
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md lg:gap-space-lg">
        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Commandes Aujourd'hui</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold mt-space-2xs">{stats.todayOrders}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <Icon name="receipt_long" size={20} />
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-md">{stats.todayClothes} vêtements</p>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Vêtements Reçus</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold mt-space-2xs">{stats.todayClothes}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
              <Icon name="local_laundry_service" size={20} />
            </div>
          </div>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Prêts à Récupérer</span>
              <span className="font-headline-lg text-headline-lg text-tertiary font-bold mt-space-2xs">{stats.readyOrders}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
              <Icon name="check_circle" size={20} />
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-md">À notifier</p>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Livrés Aujourd'hui</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold mt-space-2xs">{stats.todayDeliveries}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0">
              <Icon name="local_shipping" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats financières */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md lg:gap-space-lg">
        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">CA Aujourd'hui</span>
              <div className="flex items-baseline gap-space-xs mt-space-2xs">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">{stats.todayCA.toLocaleString('fr-FR')}</span>
                <span className="font-label-md text-label-md text-outline font-bold">XOF</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
              <Icon name="payments" size={20} />
            </div>
          </div>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">CA du Mois</span>
              <div className="flex items-baseline gap-space-xs mt-space-2xs">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">{stats.monthCA.toLocaleString('fr-FR')}</span>
                <span className="font-label-md text-label-md text-outline font-bold">XOF</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <Icon name="trending_up" size={20} />
            </div>
          </div>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Clients en Attente</span>
              <span className="font-headline-md text-headline-md text-on-surface font-bold mt-space-2xs">{stats.readyOrders}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
              <Icon name="groups" size={20} />
            </div>
          </div>
        </div>

        <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider font-semibold">Retards</span>
              <span className="font-headline-md text-headline-md text-error font-bold mt-space-2xs">{stats.lateOrders}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
              <Icon name="warning" size={20} />
            </div>
          </div>
          {stats.lateOrders > 0 && <p className="font-body-sm text-body-sm text-error mt-space-md font-semibold">Action requise</p>}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl">
        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">CA 7 derniers jours</h3>
          <div className="h-56 w-full flex items-end justify-between gap-space-sm pt-space-xl pb-space-sm px-space-sm bg-surface-container-low/40 rounded-DEFAULT">
            {(() => {
              const maxCa = Math.max(1, ...caByDay.map(d => d.ca))
              const peakIndex = caByDay.reduce((best, d, i) => d.ca > (caByDay[best]?.ca || 0) ? i : best, 0)
              return caByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-space-xs h-full justify-end group">
                  <div className="w-full max-w-[32px] flex items-end justify-center h-full relative">
                    {i === peakIndex && d.ca > 0 && (
                      <span className="absolute -top-6 text-[10px] font-bold px-1.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-full shadow-xs whitespace-nowrap">Pic</span>
                    )}
                    <div
                      className={`w-full rounded-t-sm transition-all ${i === peakIndex && d.ca > 0 ? 'bg-primary-container group-hover:bg-primary' : 'bg-primary group-hover:bg-primary-container'}`}
                      style={{ height: `${Math.max(4, (d.ca / maxCa) * 100)}%` }}
                      title={`${d.ca.toLocaleString('fr-FR')} XOF`}
                    />
                  </div>
                  <span className={`font-label-sm text-label-sm font-semibold ${i === peakIndex && d.ca > 0 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{d.name}</span>
                  <span className={`font-body-sm text-[10px] ${i === peakIndex && d.ca > 0 ? 'text-primary font-bold' : 'text-outline'}`}>{d.ca >= 1000 ? `${Math.round(d.ca / 1000)}k` : d.ca}</span>
                </div>
              ))
            })()}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Commandes par Statut</h3>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="font-body-md text-body-md text-outline text-center py-8">Aucune commande</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl">
        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Vêtements reçus (7 jours)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={clothesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eaedff" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="habits" fill="#630ed4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Top Clients</h3>
          {topClients.length > 0 ? (
            <div className="flex flex-col gap-space-md">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-on-primary-fixed font-bold text-sm">{c.name.charAt(0)}</div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface font-semibold">{c.name}</p>
                      <p className="font-body-sm text-body-sm text-outline">{c.count} commande(s)</p>
                    </div>
                  </div>
                  <p className="font-numeric-currency text-numeric-currency text-primary font-bold">{c.total.toLocaleString('fr-FR')} XOF</p>
                </div>
              ))}
            </div>
          ) : <p className="font-body-md text-body-md text-outline text-center py-8">Aucune vente</p>}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Statistiques Rapides</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-space-md text-center">
          {[
            { label: 'Total commandes', value: recentOrders.length > 0 ? (recentOrders.length + 1) : 0 },
            { label: 'Total clients', value: stats.totalClients },
            { label: 'Employés actifs', value: stats.activeEmployees },
            { label: 'Livraisons aujourd\'hui', value: stats.todayDeliveries },
            { label: 'Commandes terminées', value: stats.completedOrders },
            { label: 'Annulations', value: stats.cancelledOrders },
          ].map((s, i) => (
            <div key={i} className="bg-surface-container-low rounded-DEFAULT p-space-md">
              <p className="font-body-sm text-body-sm text-outline mb-space-2xs">{s.label}</p>
              <p className="font-headline-md text-headline-md text-on-surface font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
        <div className="flex items-center justify-between mb-space-lg">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Commandes Récentes</h3>
          <button onClick={() => navigate('/orders')} className="font-label-md text-label-md text-primary hover:underline font-semibold">Voir tout</button>
        </div>
        {recentOrders.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {recentOrders.map(o => (
              <div key={o.id} onClick={() => navigate('/orders')} className="flex items-center justify-between p-space-md bg-surface-container-low rounded-DEFAULT cursor-pointer hover:bg-surface-container transition-all">
                <div>
                  <p className="font-numeric-currency text-numeric-currency text-primary font-bold">#{o.ticket_number}</p>
                  <p className="font-body-sm text-body-sm text-outline mt-space-2xs">{o.client?.first_name} {o.client?.last_name} — {o.clothes?.length || 0} vêtement(s) — {new Date(o.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-numeric-currency text-numeric-currency text-on-surface font-bold">{(o.total || 0).toLocaleString('fr-FR')} XOF</p>
                  <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-space-sm py-0.5 rounded-full mt-space-2xs inline-block">{STATUS_LABELS[o.status] || o.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-space-xl">
            <Icon name="shopping_bag" size={32} className="mx-auto text-outline mb-space-sm" />
            <p className="font-body-md text-body-md text-outline">Aucune commande encore</p>
            <button onClick={() => navigate('/orders')} className="mt-space-sm font-label-md text-label-md text-primary hover:underline">Créer la première</button>
          </div>
        )}
      </div>

      <p className="text-center font-body-sm text-body-sm text-outline">© 2026 — PressingManager. Tous droits réservés.</p>
    </div>
  )
}
