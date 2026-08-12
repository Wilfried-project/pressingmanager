import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrderStore, useClientStore, useStockStore, useDeliveryStore, useHRStore } from '../../lib/store'
import { StatCard, Card, Button, Badge, getOrderStatusColor } from '../../components/ui'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingBag, Users, CheckCircle, Clock, TrendingUp, AlertTriangle, Truck, Package, DollarSign, Calendar } from 'lucide-react'

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6']

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const orders = useOrderStore(s => s.orders)
  const getTodayOrders = useOrderStore(s => s.getTodayOrders)
  const getLateOrders = useOrderStore(s => s.getLateOrders)
  const getTodayRevenue = useOrderStore(s => s.getTodayRevenue)
  const getMonthRevenue = useOrderStore(s => s.getMonthRevenue)
  const clients = useClientStore(s => s.clients)
  const getLowStockItems = useStockStore(s => s.getLowStockItems)
  const getTodayDeliveries = useDeliveryStore(s => s.getTodayDeliveries)
  const { employees } = useHRStore()

  const todayOrders = getTodayOrders()
  const lateOrders = getLateOrders()
  const lowStock = getLowStockItems()
  const todayDeliveries = getTodayDeliveries()
  const totalClothes = todayOrders.reduce((sum, o) => sum + o.clothes.length, 0)
  const readyOrders = orders.filter(o => o.status === 'pret')
  const deliveredToday = orders.filter(o => { const t = new Date().toISOString().split('T')[0]; return o.status === 'livre' && o.delivered_at?.startsWith(t) })
  const waitingClients = orders.filter(o => ['en_attente', 'en_cours'].includes(o.status)).length

  const revenueTrend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const dayOrders = orders.filter(o => o.created_at.startsWith(ds) && o.payment_status === 'paye')
    return { date: d.toLocaleDateString('fr-FR', { weekday: 'short' }), CA: dayOrders.reduce((s, o) => s + o.total, 0), Commandes: dayOrders.length }
  }), [orders])

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach(o => map.set(o.status, (map.get(o.status) || 0) + 1))
    return Array.from(map.entries()).map(([status, count]) => ({ status: status.replace('_', ' '), count }))
  }, [orders])

  const topClients = useMemo(() => {
    return clients.map(c => ({
      name: `${c.first_name} ${c.last_name}`,
      total: orders.filter(o => o.client_id === c.id && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0),
      count: orders.filter(o => o.client_id === c.id).length
    })).sort((a, b) => b.total - a.total).slice(0, 5).filter(c => c.total > 0)
  }, [clients, orders])

  const clothesTrend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const dayClothes = orders.filter(o => o.created_at.startsWith(ds)).reduce((s, o) => s + o.clothes.length, 0)
    return { date: d.toLocaleDateString('fr-FR', { weekday: 'short' }), vêtements: dayClothes }
  }), [orders])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-500 text-sm mt-0.5">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button icon={<ShoppingBag size={18} />} onClick={() => navigate('/orders')}>Nouvelle commande</Button>
      </div>

      {/* Alerts */}
      {(lateOrders.length > 0 || lowStock.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lateOrders.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition" onClick={() => navigate('/orders')}>
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-red-800">{lateOrders.length} commande(s) en retard !</p>
                <p className="text-xs text-red-600 mt-0.5">Clients à contacter immédiatement — cliquez pour voir</p>
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 cursor-pointer hover:bg-orange-100 transition" onClick={() => navigate('/stock')}>
              <Package className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-orange-800">{lowStock.length} produit(s) en rupture</p>
                <p className="text-xs text-orange-600 mt-0.5">{lowStock.map(i => i.name).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Commandes Aujourd'hui" value={todayOrders.length} icon={<ShoppingBag size={22} />} color="purple" sub={`${totalClothes} vêtements`} />
        <StatCard label="Vêtements Reçus" value={totalClothes} icon={<Package size={22} />} color="blue" />
        <StatCard label="Prêts à Récupérer" value={readyOrders.length} icon={<CheckCircle size={22} />} color="green" sub="À notifier" />
        <StatCard label="Livrés Aujourd'hui" value={deliveredToday.length} icon={<Truck size={22} />} color="indigo" />
      </div>

      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA Aujourd'hui" value={`${getTodayRevenue().toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={22} />} color="green" />
        <StatCard label="CA du Mois" value={`${getMonthRevenue().toLocaleString('fr-FR')} XOF`} icon={<TrendingUp size={22} />} color="purple" />
        <StatCard label="Clients en Attente" value={waitingClients} icon={<Clock size={22} />} color="yellow" />
        <StatCard label="Retards" value={lateOrders.length} icon={<AlertTriangle size={22} />} color="red" sub={lateOrders.length > 0 ? 'Action requise' : 'Aucun retard'} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">CA 7 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} />
              <Line type="monotone" dataKey="CA" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Commandes par Statut</h2>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="count" nameKey="status" label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-gray-400 flex-col gap-2"><span className="text-4xl"></span><p className="text-sm">Aucune commande</p></div>}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Vêtements reçus (7 jours)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={clothesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="vêtements" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Top Clients</h2>
          {topClients.length > 0 ? (
            <div className="space-y-2.5">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition cursor-pointer" onClick={() => navigate('/clients')}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-purple-400'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.count} commande(s)</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-purple-700">{c.total.toLocaleString('fr-FR')} XOF</p>
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-32 text-gray-400 flex-col gap-2"><span className="text-3xl"></span><p className="text-sm">Aucune vente</p></div>}
        </Card>
      </div>

      {/* Quick stats + recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Statistiques Rapides</h2>
          <div className="space-y-3">
            {[
              { label: 'Total commandes', value: orders.length, icon: '' },
              { label: 'Total clients', value: clients.length, icon: '' },
              { label: 'Employés actifs', value: employees.filter(e => e.is_active).length, icon: '' },
              { label: 'Livraisons aujourd\'hui', value: todayDeliveries.length, icon: '' },
              { label: 'Commandes terminées', value: orders.filter(o => o.status === 'livre').length, icon: '' },
              { label: 'Annulations', value: orders.filter(o => o.status === 'annule').length, icon: '' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm text-gray-600">{s.label}</span>
                </div>
                <span className="font-bold text-gray-900">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Commandes Récentes</h2>
              <button onClick={() => navigate('/orders')} className="text-purple-600 hover:underline text-sm">Voir tout</button>
            </div>
            {orders.length > 0 ? (
              <div className="space-y-2">
                {orders.slice(-6).reverse().map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition cursor-pointer" onClick={() => navigate('/orders')}>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="font-bold text-xs text-purple-600">#{order.ticket_number}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{order.client?.first_name} {order.client?.last_name}</p>
                        <p className="text-xs text-gray-400">{order.clothes.length} vêtement(s) — {new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-gray-900">{order.total.toLocaleString('fr-FR')} XOF</p>
                      <Badge label={order.status.replace('_', ' ')} color={getOrderStatusColor(order.status)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2"></p>
                <p className="text-sm">Aucune commande encore</p>
                <Button className="mt-3" size="sm" onClick={() => navigate('/orders')}>Créer la première</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
