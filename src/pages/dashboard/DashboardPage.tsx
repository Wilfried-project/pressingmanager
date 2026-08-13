import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/store'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingBag, Users, CheckCircle, Clock, TrendingUp, AlertTriangle, Package, DollarSign, Calendar } from 'lucide-react'

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6']

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

      // Charger toutes les commandes
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

      // Clients
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      // Employés
      const { count: activeEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      // Commandes par statut
      const statusMap: Record<string, number> = {}
      orders.forEach(o => {
        const s = STATUS_LABELS[o.status] || o.status
        statusMap[s] = (statusMap[s] || 0) + 1
      })
      const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

      // CA 7 derniers jours
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

      // Top clients
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
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-sm text-gray-500 capitalize">{today}</p>
        </div>
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl transition text-sm">
          <ShoppingBag size={16} /> Nouvelle commande
        </button>
      </div>

      {/* Alerte retards */}
      {lateOrdersList.length > 0 && (
        <div onClick={() => navigate('/orders')} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-red-100 transition">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">{lateOrdersList.length} commande(s) en retard !</p>
            <p className="text-xs text-red-500">Clients à contacter immédiatement — cliquez pour voir</p>
          </div>
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingBag size={16} className="text-purple-600" /><span className="text-xs text-gray-500">Commandes Aujourd'hui</span></div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayOrders}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.todayClothes} vêtements</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Package size={16} className="text-blue-600" /><span className="text-xs text-gray-500">Vêtements Reçus</span></div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayClothes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-600" /><span className="text-xs text-gray-500">Prêts à Récupérer</span></div>
          <p className="text-3xl font-bold text-gray-900">{stats.readyOrders}</p>
          <p className="text-xs text-gray-400 mt-1">À notifier</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-orange-600" /><span className="text-xs text-gray-500">Livrés Aujourd'hui</span></div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayDeliveries}</p>
        </div>
      </div>

      {/* Stats financières */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-green-600" /><span className="text-xs text-gray-500">CA Aujourd'hui</span></div>
          <p className="text-2xl font-bold text-gray-900">{stats.todayCA.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-purple-600" /><span className="text-xs text-gray-500">CA du Mois</span></div>
          <p className="text-2xl font-bold text-gray-900">{stats.monthCA.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Users size={16} className="text-blue-600" /><span className="text-xs text-gray-500">Clients en Attente</span></div>
          <p className="text-2xl font-bold text-gray-900">{stats.readyOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-red-600" /><span className="text-xs text-gray-500">Retards</span></div>
          <p className="text-2xl font-bold text-gray-900">{stats.lateOrders}</p>
          {stats.lateOrders > 0 && <p className="text-xs text-red-500 mt-1">Action requise</p>}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">CA 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={caByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => v.toLocaleString('fr-FR') + ' XOF'} />
              <Line type="monotone" dataKey="ca" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Commandes par Statut</h3>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucune commande</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Vêtements reçus (7 jours)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={clothesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="habits" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Clients</h3>
          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">{c.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.count} commande(s)</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-purple-600">{c.total.toLocaleString('fr-FR')} XOF</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">Aucune vente</p>}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Statistiques Rapides</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-center">
          {[
            { label: 'Total commandes', value: recentOrders.length > 0 ? (recentOrders.length + 1) : 0 },
            { label: 'Total clients', value: stats.totalClients },
            { label: 'Employés actifs', value: stats.activeEmployees },
            { label: 'Livraisons aujourd\'hui', value: stats.todayDeliveries },
            { label: 'Commandes terminées', value: stats.completedOrders },
            { label: 'Annulations', value: stats.cancelledOrders },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Commandes Récentes</h3>
          <button onClick={() => navigate('/orders')} className="text-xs text-purple-600 hover:underline font-medium">Voir tout</button>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} onClick={() => navigate('/orders')} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                <div>
                  <p className="text-sm font-bold text-gray-900">#{o.ticket_number}</p>
                  <p className="text-xs text-gray-500">{o.client?.first_name} {o.client?.last_name} — {o.clothes?.length || 0} vêtement(s) — {new Date(o.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-600">{(o.total || 0).toLocaleString('fr-FR')} XOF</p>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{STATUS_LABELS[o.status] || o.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Aucune commande encore</p>
            <button onClick={() => navigate('/orders')} className="mt-2 text-xs text-purple-600 hover:underline">Créer la première</button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">© 2026 — PressingManager. Tous droits réservés.</p>
    </div>
  )
}
