// src/pages/accounting/AccountingPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useTransactionStore } from '../../lib/store'
import { transactionService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Textarea, Button, Modal } from '../../components/ui'
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Wallet,
  BarChart3, PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle,
  Receipt, ArrowRight, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts'
import type { Transaction } from '../../types'

const COLORS = ['#6c47ff', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#8b5cf6']

export const AccountingPageModern: React.FC = () => {
  const { transactions: localTx, addTransaction } = useTransactionStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'journal'>('overview')
  const [form, setForm] = useState({
    type: 'recette' as 'recette' | 'depense',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    transactionService.getAll()
      .then(data => setTransactions(data as Transaction[]))
      .catch(() => setTransactions(localTx))
  }, [])

  const totalRecettes = transactions.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0)
  const totalDepenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0)
  const benefice = totalRecettes - totalDepenses
  const marge = totalRecettes > 0 ? (benefice / totalRecettes) * 100 : 0

  const trend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const ds = d.toISOString().split('T')[0]
      const dayT = transactions.filter(t => t.date === ds)
      return {
        date: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        Recettes: dayT.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0),
        Depenses: dayT.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [transactions])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    transactions.filter(t => t.type === 'depense').forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [transactions])

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10),
    [transactions]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category || form.amount <= 0) {
      toast.warning('Informations manquantes', { description: 'Categorie et montant sont obligatoires' })
      return
    }
    try {
      const tx = await transactionService.create({
        id: crypto.randomUUID(),
        ...form,
        amount: Number(form.amount),
        created_by: 'system'
      })
      setTransactions([tx as Transaction, ...transactions])
      toast.success(form.type === 'recette' ? 'Recette enregistree' : 'Depense enregistree', {
        description: form.amount.toLocaleString('fr-FR') + ' XOF · ' + form.category
      })
      setShowForm(false)
      setForm({ type: 'recette', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      addTransaction({ id: crypto.randomUUID(), ...form, amount: Number(form.amount), created_by: 'system' })
      toast.success('Enregistre localement', { description: 'Sera synchronise plus tard' })
      setShowForm(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Comptabilite & Tresorerie
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              Journal financier
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Suivi des recettes et depenses · {transactions.length} ecriture(s)
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-modern-primary self-start md:self-auto">
          <Plus size={18} strokeWidth={2.5} />
          Nouvelle transaction
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total recettes</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <TrendingUp size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalRecettes.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              {transactions.filter(t => t.type === 'recette').length} entree(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-red-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total depenses</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-400 text-white flex items-center justify-center shadow-md">
                <TrendingDown size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalDepenses.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-red-700 mt-2 font-medium">
              {transactions.filter(t => t.type === 'depense').length} sortie(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #6c47ff 0%, #8b5cf6 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Benefice net</span>
              <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center">
                <DollarSign size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {benefice >= 0 ? '+' : ''}{benefice.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-white/70 mt-2 font-medium">Marge : {marge.toFixed(1)}%</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Tresorerie nette</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {Math.max(0, benefice).toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">{benefice >= 0 ? 'Positive' : 'Negative'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
        {[
          { key: 'overview' as const, label: "Vue d'ensemble", icon: BarChart3 },
          { key: 'journal' as const, label: 'Journal', icon: Receipt },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (isActive ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="card-modern">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Evolution sur 7 jours</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Recettes vs Depenses</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-on-surface-variant font-medium">Recettes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-xs text-on-surface-variant font-medium">Depenses</span>
                </div>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRecettes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDepenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)', fontSize: 13 }} formatter={(v: any) => [v.toLocaleString('fr-FR') + ' XOF']} />
                  <Area type="monotone" dataKey="Recettes" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRecettes)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }} />
                  <Area type="monotone" dataKey="Depenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradDepenses)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-modern">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Depenses par categorie</h2>
                <PieIcon size={18} className="text-primary" />
              </div>

              {byCategory.length > 0 ? (
                <>
                  <div className="h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} cx="50%" cy="50%" outerRadius={75} innerRadius={48} dataKey="value" paddingAngle={3}>
                          {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 20px 50px -12px rgba(15,23,42,0.25)', fontSize: 13 }} formatter={(v: any) => [v.toLocaleString('fr-FR') + ' XOF']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl font-extrabold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{byCategory.length}</div>
                        <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Categories</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-4 max-h-40 overflow-y-auto">
                    {byCategory.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-on-surface-variant font-medium capitalize truncate">{cat.name}</span>
                        </div>
                        <span className="font-bold text-on-surface shrink-0">{cat.value.toLocaleString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <PieIcon size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
                  <p className="text-sm text-on-surface-variant">Aucune depense enregistree</p>
                </div>
              )}
            </div>

            <div className="card-modern">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Transactions recentes</h2>
                <ArrowRight size={18} className="text-on-surface-variant" />
              </div>

              {recentTransactions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recentTransactions.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ' + (t.type === 'recette' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')}>
                          {t.type === 'recette' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-on-surface truncate capitalize">{t.category}</p>
                          <p className="text-xs text-on-surface-variant truncate">{t.description || 'Sans description'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={'text-sm font-bold ' + (t.type === 'recette' ? 'text-emerald-600' : 'text-red-600')}>
                          {t.type === 'recette' ? '+' : '-'}{t.amount.toLocaleString('fr-FR')}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
                  <p className="text-sm text-on-surface-variant">Aucune transaction</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'journal' && (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30">
            <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Journal comptable</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{transactions.length} ecriture(s) enregistree(s)</p>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Categorie</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Description</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Montant</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Par</th>
                  </tr>
                </thead>
                <tbody>
                  {[...transactions].reverse().map(t => (
                    <tr key={t.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-3 px-5 text-sm text-on-surface font-medium whitespace-nowrap">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 px-5">
                        <span className={'badge-modern ' + (t.type === 'recette' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + (t.type === 'recette' ? 'bg-emerald-500' : 'bg-red-500')} />
                          {t.type === 'recette' ? 'Recette' : 'Depense'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-on-surface capitalize font-medium">{t.category}</td>
                      <td className="py-3 px-5 text-sm text-on-surface-variant max-w-xs truncate">{t.description || '-'}</td>
                      <td className={'py-3 px-5 text-sm font-bold text-right whitespace-nowrap ' + (t.type === 'recette' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.type === 'depense' ? '-' : '+'}{t.amount.toLocaleString('fr-FR')} XOF
                      </td>
                      <td className="py-3 px-5 text-xs text-on-surface-variant">{t.created_by || 'Systeme'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
                <Receipt size={28} className="text-on-surface-variant/50" />
              </div>
              <p className="text-sm text-on-surface-variant mb-4">Aucune transaction enregistree</p>
              <button onClick={() => setShowForm(true)} className="btn-modern-primary mx-auto">
                <Plus size={16} strokeWidth={2.5} />
                Ajouter une transaction
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle transaction" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                <option value="recette">Recette</option>
                <option value="depense">Depense</option>
              </Select>
            </Field>
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categorie" required>
              <Input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Vente, Salaire, Loyer..." />
            </Field>
            <Field label="Montant (XOF)" required>
              <Input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detail de la transaction..." rows={3} />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AccountingPageModern
