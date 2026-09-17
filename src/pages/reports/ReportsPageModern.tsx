// src/pages/reports/ReportsPageModern.tsx
import React, { useState, useMemo } from 'react'
import { useOrderStore, useClientStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import {
  Package, DollarSign, TrendingUp, TrendingDown, BarChart3, Users,
  Receipt, Download, ArrowUpCircle, ArrowDownCircle, Crown, Trophy,
  Award, Target, Calendar, Sparkles, Filter
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6c47ff', '#06b6d4', '#ec4899']

export const ReportsPageModern: React.FC = () => {
  const orders = useOrderStore(s => s.orders)
  const clients = useClientStore(s => s.clients)
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'orders'>('overview')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  // ============================================
  // STATS GLOBALES
  // ============================================
  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const monthOrders = orders.filter(o => o.created_at.startsWith(month))
    const monthRevenue = monthOrders
      .filter(o => o.payment_status === 'paye')
      .reduce((s, o) => s + o.total, 0)
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paye')
      .reduce((s, o) => s + o.total, 0)
    const paidOrders = orders.filter(o => o.payment_status === 'paye')
    const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
    const lateOrders = orders.filter(o =>
      o.status !== 'livre' && o.status !== 'annule' &&
      new Date(o.expected_at) < new Date()
    ).length
    const cancelled = orders.filter(o => o.status === 'annule').length
    const cancelRate = orders.length > 0 ? (cancelled / orders.length) * 100 : 0

    return {
      monthOrders: monthOrders.length,
      monthRevenue,
      totalRevenue,
      totalOrders: orders.length,
      lateOrders,
      avgTicket,
      cancelRate,
      paidCount: paidOrders.length,
      pendingRevenue: orders
        .filter(o => o.payment_status !== 'paye')
        .reduce((s, o) => s + (o.remaining || 0), 0),
    }
  }, [orders])

  // ============================================
  // TENDANCE CA selon période
  // ============================================
  const revenueTrend = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const ds = d.toISOString().split('T')[0]
      const ca = orders
        .filter(o => o.created_at.startsWith(ds) && o.payment_status === 'paye')
        .reduce((s, o) => s + o.total, 0)
      return {
        date: days <= 7
          ? d.toLocaleDateString('fr-FR', { weekday: 'short' })
          : d.getDate().toString(),
        CA: ca,
      }
    })
  }, [orders, period])

  // ============================================
  // REPARTITION PAIEMENTS
  // ============================================
  const paymentBreakdown = useMemo(() => {
    const paid = orders.filter(o => o.payment_status === 'paye').length
    const partial = orders.filter(o => o.payment_status === 'acompte').length
    const unpaid = orders.filter(o => o.payment_status === 'non_paye').length
    return [
      { name: 'Paye', value: paid, color: '#10b981' },
      { name: 'Acompte', value: partial, color: '#f59e0b' },
      { name: 'Non paye', value: unpaid, color: '#ef4444' },
    ].filter(p => p.value > 0)
  }, [orders])

  // ============================================
  // TOP CLIENTS
  // ============================================
  const topClients = useMemo(() =>
    clients
      .map(c => ({
        name: `${c.first_name} ${c.last_name || ''}`.trim(),
        phone: c.phone,
        total: orders
          .filter(o => o.client_id === c.id && o.payment_status === 'paye')
          .reduce((s, o) => s + o.total, 0),
        count: orders.filter(o => o.client_id === c.id).length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .filter(c => c.total > 0),
    [clients, orders]
  )

  // ============================================
  // TOP PRESTATIONS
  // ============================================
  const topServices = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    orders.forEach(o => {
      o.clothes?.forEach(c => {
        const key = c.service || 'lavage_simple'
        const entry = map.get(key) || { count: 0, total: 0 }
        entry.count += c.quantity || 1
        entry.total += (c.price || 0) * (c.quantity || 1)
        map.set(key, entry)
      })
    })
    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0) || 1
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: data.count,
        total: data.total,
        pct: (data.total / grandTotal) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [orders])

  // ============================================
  // EXPORT CSV
  // ============================================
  const exportCSV = () => {
    const headers = ['Ticket', 'Client', 'Date', 'Total', 'Statut', 'Paiement']
    const rows = orders.map(o => [
      o.ticket_number,
      `${o.client?.first_name || ''} ${o.client?.last_name || ''}`.trim(),
      new Date(o.created_at).toLocaleDateString('fr-FR'),
      o.total,
      o.status,
      o.payment_status
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Rapport exporte', { description: 'Fichier CSV telecharge' })
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
              Rapports & Statistiques
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              Performance
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Analyse complete des performances · {orders.length} commande(s) au total
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-sm transition self-start md:self-auto"
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-violet-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">CA ce mois</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                <DollarSign size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-violet-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.monthRevenue.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-violet-700 mt-2 font-medium">
              {stats.monthOrders} commande(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Ticket moyen</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <TrendingUp size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {Math.round(stats.avgTicket).toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">
              {stats.paidCount} commande(s) payee(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total paye</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <ArrowUpCircle size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.totalRevenue.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              Depuis le debut
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-orange-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">En attente</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                <Target size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-orange-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.pendingRevenue.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-orange-700 mt-2 font-medium">
              A recouvrer
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {[
          { key: 'overview' as const, label: 'Vue globale', icon: BarChart3 },
          { key: 'clients' as const, label: 'Clients', icon: Users },
          { key: 'orders' as const, label: 'Commandes', icon: Receipt },
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

      {/* VUE GLOBALE */}
      {activeTab === 'overview' && (
        <>
          {/* Graphique CA */}
          <div className="card-modern">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Evolution du chiffre d'affaires
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Chiffre d'affaires encaisse sur la periode
                </p>
              </div>
              <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
                {(['7d', '30d', '90d'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={
                      'px-3 py-1.5 rounded-md text-xs font-bold transition-all ' +
                      (period === p ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
                    }
                  >
                    {p === '7d' ? '7j' : p === '30d' ? '30j' : '90j'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6c47ff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6c47ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)', fontSize: 13 }}
                    formatter={(v: any) => [v.toLocaleString('fr-FR') + ' XOF', 'CA']}
                  />
                  <Area
                    type="monotone"
                    dataKey="CA"
                    stroke="#6c47ff"
                    strokeWidth={2.5}
                    fill="url(#gradCA)"
                    dot={revenueTrend.length <= 7 ? { r: 4, fill: '#6c47ff', strokeWidth: 2, stroke: '#fff' } : false}
                    activeDot={{ r: 6, fill: '#6c47ff', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2 colonnes : Donut paiements + Top services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Donut paiements */}
            <div className="card-modern">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Repartition des paiements
                </h2>
                <Receipt size={18} className="text-primary" />
              </div>

              {paymentBreakdown.length > 0 ? (
                <>
                  <div className="h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentBreakdown}
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={48}
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {paymentBreakdown.map((p, i) => <Cell key={i} fill={p.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)', fontSize: 13 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl font-extrabold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {orders.length}
                        </div>
                        <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Commandes</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    {paymentBreakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                          <span className="text-on-surface-variant font-medium">{p.name}</span>
                        </div>
                        <span className="font-bold text-on-surface">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Receipt size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
                  <p className="text-sm text-on-surface-variant">Aucune commande</p>
                </div>
              )}
            </div>

            {/* Top services */}
            <div className="card-modern">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Top prestations
                </h2>
                <Crown size={18} className="text-amber-500" />
              </div>

              {topServices.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {topServices.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={
                            'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 text-white ' +
                            (i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                             i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                             i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-600' :
                             'bg-surface-container text-on-surface-variant')
                          }>
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-on-surface truncate">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-primary shrink-0 ml-2">
                          {s.total.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500 transition-all"
                            style={{ width: s.pct + '%' }}
                          />
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-medium shrink-0">
                          {s.pct.toFixed(0)}% · {s.count} pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Crown size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
                  <p className="text-sm text-on-surface-variant">Aucune prestation enregistree</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-modern text-center">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total commandes</p>
              <p className="text-3xl font-black text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {stats.totalOrders}
              </p>
            </div>
            <div className="card-modern text-center">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Clients</p>
              <p className="text-3xl font-black text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {clients.length}
              </p>
            </div>
            <div className="card-modern text-center">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">En retard</p>
              <p className={`text-3xl font-black ${stats.lateOrders > 0 ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {stats.lateOrders}
              </p>
            </div>
            <div className="card-modern text-center">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Taux annulation</p>
              <p className={`text-3xl font-black ${stats.cancelRate > 10 ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {stats.cancelRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </>
      )}

      {/* TAB CLIENTS */}
      {activeTab === 'clients' && (
        <div className="card-modern">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Top 10 clients
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Meilleurs chiffres d'affaires
              </p>
            </div>
            <Trophy size={20} className="text-amber-500" />
          </div>

          {topClients.length > 0 ? (
            <div className="flex flex-col gap-2">
              {topClients.map((c, i) => {
                const maxTotal = topClients[0]?.total || 1
                const pct = (c.total / maxTotal) * 100
                const isMedal = i < 3
                const medalColors = [
                  'bg-gradient-to-br from-amber-400 to-yellow-500',
                  'bg-gradient-to-br from-slate-300 to-slate-400',
                  'bg-gradient-to-br from-amber-700 to-amber-600',
                ]
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all">
                    <div className={
                      'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 ' +
                      (isMedal ? medalColors[i] : 'bg-surface-container text-on-surface-variant')
                    }>
                      {i + 1}
                    </div>
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
                            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500 transition-all"
                            style={{ width: pct + '%' }}
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
            <div className="text-center py-12">
              <Users size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">Aucune vente enregistree</p>
            </div>
          )}
        </div>
      )}

      {/* TAB COMMANDES */}
      {activeTab === 'orders' && (
        orders.length > 0 ? (
          <div className="card-modern !p-0 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30">
              <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Toutes les commandes
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {orders.length} commande(s) enregistree(s)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ticket</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Client</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Total</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {[...orders].reverse().slice(0, 50).map(o => (
                    <tr key={o.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-3 px-5 text-sm font-bold text-primary whitespace-nowrap">#{o.ticket_number}</td>
                      <td className="py-3 px-5 text-sm text-on-surface whitespace-nowrap">
                        {o.client?.first_name} {o.client?.last_name}
                      </td>
                      <td className="py-3 px-5 text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-5 text-sm font-bold text-on-surface text-right whitespace-nowrap">
                        {o.total.toLocaleString('fr-FR')} XOF
                      </td>
                      <td className="py-3 px-5">
                        <span className={
                          'badge-modern ' +
                          (o.status === 'pret' ? 'bg-emerald-50 text-emerald-700' :
                           o.status === 'livre' ? 'bg-slate-100 text-slate-600' :
                           o.status === 'annule' ? 'bg-red-50 text-red-700' :
                           'bg-amber-50 text-amber-700')
                        }>
                          <span className={
                            'w-1.5 h-1.5 rounded-full ' +
                            (o.status === 'pret' ? 'bg-emerald-500' :
                             o.status === 'livre' ? 'bg-slate-400' :
                             o.status === 'annule' ? 'bg-red-500' :
                             'bg-amber-500')
                          } />
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={
                          'badge-modern ' +
                          (o.payment_status === 'paye' ? 'bg-emerald-50 text-emerald-700' :
                           o.payment_status === 'acompte' ? 'bg-amber-50 text-amber-700' :
                           'bg-red-50 text-red-700')
                        }>
                          <span className={
                            'w-1.5 h-1.5 rounded-full ' +
                            (o.payment_status === 'paye' ? 'bg-emerald-500' :
                             o.payment_status === 'acompte' ? 'bg-amber-500' :
                             'bg-red-500')
                          } />
                          {o.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-modern text-center py-16">
            <Receipt size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
            <p className="text-sm text-on-surface-variant">Aucune commande enregistree</p>
          </div>
        )
      )}
    </div>
  )
}

export default ReportsPageModern
