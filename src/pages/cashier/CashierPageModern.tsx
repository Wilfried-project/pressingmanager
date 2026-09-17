import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { cashService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { PageHeader, Button, Field, Input, Select, Card, Table, Badge, Modal, Alert, KpiCard, StatusBadge } from '../../components/ui'
import {
  DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus,
  Wallet, Receipt, Calculator, AlertTriangle, CheckCircle2, Clock,
  Banknote, Smartphone, CreditCard, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react'

const PAYMENT_COLORS = {
  especes: { label: 'Especes', color: '#059669', icon: Banknote },
  wave: { label: 'Wave', color: '#06b6d4', icon: Smartphone },
  orange: { label: 'Orange Money', color: '#f97316', icon: Smartphone },
  mtn: { label: 'MTN Money', color: '#facc15', icon: Smartphone },
  cb: { label: 'Carte Bancaire', color: '#6366f1', icon: CreditCard },
}

export const CashierPageModern: React.FC = () => {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [showTx, setShowTx] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showUnclosedAlert, setShowUnclosedAlert] = useState(false)
  const [openAmount, setOpenAmount] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
  const [confirmedSolde, setConfirmedSolde] = useState('')
  const [txForm, setTxForm] = useState({ type: 'entree', amount: '', reason: '', method: 'especes' })

  const currentSession = sessions.find(s => s.status === 'open')
  const sessionTx = currentSession ? transactions.filter(t => t.session_id === currentSession.id) : []
  const totalEntrees = sessionTx.filter(t => t.type === 'entree').reduce((s: number, t: any) => s + t.amount, 0)
  const totalSorties = sessionTx.filter(t => t.type === 'sortie').reduce((s: number, t: any) => s + t.amount, 0)
  const soldeAttendu = (currentSession?.opening_amount || 0) + totalEntrees - totalSorties
  const lastClosedSession = sessions
    .filter(s => s.status === 'closed')
    .sort((a: any, b: any) => new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime())[0]

  const ecart = confirmedSolde
    ? parseFloat(confirmedSolde) - (lastClosedSession?.closing_amount || 0)
    : 0

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sess, txs] = await Promise.all([cashService.getSessions(), cashService.getTransactions()])
      setSessions(sess)
      setTransactions(txs)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const check = () => {
      const now = new Date()
      if (currentSession && now.getHours() === 18 && now.getMinutes() === 0) setShowReminder(true)
    }
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [currentSession])

  useEffect(() => {
    if (currentSession) {
      const openedDate = new Date(currentSession.opened_at).toDateString()
      if (openedDate !== new Date().toDateString()) setShowUnclosedAlert(true)
    }
  }, [currentSession])

  useEffect(() => {
    const checkAutoSchedule = async () => {
      if (loading) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
        if (!emp?.tenant_id) return
        const { data: tenant } = await supabase.from('tenants').select('cash_open_time, cash_close_time').eq('id', emp.tenant_id).single()
        const openTime = tenant?.cash_open_time || '08:00'
        const closeTime = tenant?.cash_close_time || '20:00'
        const now = new Date()
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        const [openH, openM] = openTime.split(':').map(Number)
        const [closeH, closeM] = closeTime.split(':').map(Number)
        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM

        if (!currentSession && nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
          const amount = lastClosedSession?.closing_amount || 0
          const newSession = await cashService.addSession({
            id: crypto.randomUUID(), agency_id: 'default',
            opening_amount: amount, opened_by: 'Systeme (auto)',
            opened_at: new Date().toISOString(), status: 'open',
            notes: 'Ouverture automatique'
          })
          setSessions(s => [newSession, ...s])
        } else if (currentSession && nowMinutes >= closeMinutes) {
          const updated = await cashService.updateSession(currentSession.id, {
            status: 'closed', closed_at: new Date().toISOString(),
            closing_amount: soldeAttendu, notes: 'Fermeture automatique'
          })
          setSessions(s => s.map((x: any) => x.id === currentSession.id ? updated : x))
        }
      } catch (err) { console.error('Erreur verification horaires caisse:', err) }
    }
    checkAutoSchedule()
  }, [loading])

  const handleOpenSession = async () => {
    const amount = parseFloat(openAmount) || 0
    try {
      const session = await cashService.addSession({
        id: crypto.randomUUID(), agency_id: 'default',
        opening_amount: amount, opened_by: user?.full_name || 'Admin',
        opened_at: new Date().toISOString(), status: 'open', notes: ''
      })
      setSessions([session, ...sessions])
      setOpenAmount('')
      setShowOpen(false)
      setConfirmedSolde('')
    } catch (err) { toast.error('Erreur ouverture caisse', { description: 'Verifiez votre connexion et reessayez' }) }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    const amount = parseFloat(closeAmount) || soldeAttendu
    try {
      const updated = await cashService.updateSession(currentSession.id, {
        status: 'closed', closed_at: new Date().toISOString(), closing_amount: amount
      })
      setSessions(sessions.map(s => s.id === currentSession.id ? updated : s))
      setCloseAmount('')
      setShowClose(false)
      setShowUnclosedAlert(false)
    } catch (err) { toast.error('Erreur fermeture caisse', { description: 'Verifiez votre connexion et reessayez' }) }
  }

  const handleAddTx = async () => {
    if (!currentSession) { toast.warning('Caisse fermee', { description: 'Ouvrez la caisse avant d enregistrer un mouvement' }); setShowOpen(true); return }
    const amount = parseFloat(txForm.amount) || 0
    if (!amount || !txForm.reason) { toast.warning('Informations manquantes', { description: 'Montant et raison sont obligatoires' }); return }
    try {
      const tx = await cashService.addTransaction({
        id: crypto.randomUUID(), session_id: currentSession.id,
        type: txForm.type, amount,
        reason: '[' + txForm.method.toUpperCase() + '] ' + txForm.reason,
        created_by: user?.full_name || 'Admin',
        created_at: new Date().toISOString()
      })
      setTransactions([tx, ...transactions])
      setTxForm({ type: 'entree', amount: '', reason: '', method: 'especes' })
      setShowTx(false)
    } catch (err) { toast.error('Erreur enregistrement', { description: 'Verifiez votre connexion et reessayez' }) }
  }

  const addQuickAmount = (val: number) => {
    setTxForm(f => ({ ...f, amount: String((parseFloat(f.amount) || 0) + val) }))
  }

  const repartitionPaiements = useMemo(() => {
    const map: Record<string, number> = {}
    sessionTx.filter((t: any) => t.type === 'entree').forEach((t: any) => {
      const m = t.reason.match(/\[([A-Z_]+)\]/)?.[1]?.toLowerCase() || 'especes'
      map[m] = (map[m] || 0) + t.amount
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
    return Object.entries(map).map(([k, v]) => ({
      key: k,
      label: (PAYMENT_COLORS as any)[k]?.label || k,
      color: (PAYMENT_COLORS as any)[k]?.color || '#630ed4',
      amount: v,
      pct: Math.round((v / total) * 100),
    })).sort((a, b) => b.amount - a.amount)
  }, [sessionTx])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant font-medium">Chargement de la caisse...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Caisse & Point de Vente
            </h1>
            {currentSession ? (
              <span className="badge-modern bg-emerald-50 text-emerald-700">
                <span className="badge-dot bg-emerald-500 animate-pulse" />
                En service
              </span>
            ) : (
              <span className="badge-modern bg-red-50 text-red-700">
                <span className="badge-dot bg-red-500" />
                Fermee
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {currentSession
              ? 'Ouverte depuis ' + new Date(currentSession.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' par ' + currentSession.opened_by
              : 'La caisse est actuellement fermee'}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {currentSession ? (
            <>
              <button onClick={() => setShowTx(true)} className="btn-modern-ghost bg-surface-container-low">
                <Plus size={16} />
                Mouvement
              </button>
              <button onClick={() => setShowClose(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all shadow-sm">
                <Lock size={16} />
                Fermer la caisse
              </button>
            </>
          ) : (
            <button onClick={() => setShowOpen(true)} className="btn-modern-primary">
              <Unlock size={16} />
              Ouvrir la caisse
            </button>
          )}
        </div>
      </div>

      {showUnclosedAlert && currentSession && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-white border border-red-100 animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">Caisse non fermee !</p>
            <p className="text-xs text-red-600 mt-0.5">La caisse du {new Date(currentSession.opened_at).toLocaleDateString('fr-FR')} n a pas ete fermee.</p>
          </div>
          <button onClick={() => { setShowUnclosedAlert(false); setShowClose(true) }} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shrink-0">
            Cloturer
          </button>
        </div>
      )}

      {showReminder && currentSession && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-white border border-amber-100 animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Il est 18h00 - N oubliez pas de fermer la caisse</p>
            <p className="text-xs text-amber-600 mt-0.5">Solde attendu : <strong>{soldeAttendu.toLocaleString('fr-FR')} XOF</strong></p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setShowReminder(false); setShowClose(true) }} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition">Fermer</button>
            <button onClick={() => setShowReminder(false)} className="px-4 py-2 rounded-xl bg-white text-on-surface text-xs font-bold border border-outline-variant/40 hover:bg-surface-container transition">Plus tard</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Fond de caisse" value={(currentSession?.opening_amount || 0).toLocaleString('fr-FR')} unit="XOF" icon={<Wallet size={18} />} sub={currentSession ? 'Fixe a l ouverture' : 'Aucune session'} />
        <KpiCard label="Entrees du jour" value={totalEntrees.toLocaleString('fr-FR')} unit="XOF" icon={<ArrowUpCircle size={18} />} sub={sessionTx.filter((t: any) => t.type === 'entree').length + ' encaissement(s)'} />
        <KpiCard label="Sorties / Depenses" value={totalSorties.toLocaleString('fr-FR')} unit="XOF" icon={<ArrowDownCircle size={18} />} sub={sessionTx.filter((t: any) => t.type === 'sortie').length + ' sortie(s)'} />
        <KpiCard label="Solde theorique" value={soldeAttendu.toLocaleString('fr-FR')} unit="XOF" icon={<Calculator size={18} />} variant="primary" sub="Montant attendu" />
      </div>

      {!currentSession && lastClosedSession && (
        <div className="card-modern">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Verification du solde avant ouverture</h3>
              <p className="text-xs text-on-surface-variant">Derniere cloture : <strong className="text-on-surface">{(lastClosedSession.closing_amount || 0).toLocaleString('fr-FR')} XOF</strong></p>
            </div>
          </div>
          <Field label="Solde physique compte (XOF)">
            <input type="number" value={confirmedSolde} onChange={e => setConfirmedSolde(e.target.value)} placeholder="Comptez votre caisse..."
              className="w-full px-5 py-4 bg-surface-container-low text-on-surface text-2xl font-bold rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary border border-outline-variant/40 transition-all text-right"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          </Field>
          {confirmedSolde && ecart !== 0 && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-between font-semibold text-sm">
              <span className="flex items-center gap-2"><AlertTriangle size={16} />Ecart detecte</span>
              <span>{ecart > 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')} XOF</span>
            </div>
          )}
          {confirmedSolde && ecart === 0 && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 font-semibold text-sm">
              <CheckCircle2 size={16} />
              Solde conforme
            </div>
          )}
          <button onClick={() => { setOpenAmount(confirmedSolde || String(lastClosedSession.closing_amount || 0)); handleOpenSession() }} disabled={!confirmedSolde}
            className="w-full mt-4 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2">
            <Unlock size={18} />
            Confirmer et ouvrir la caisse
          </button>
        </div>
      )}

      {repartitionPaiements.length > 0 && (
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Repartition des encaissements</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Total : <strong className="text-primary">{totalEntrees.toLocaleString('fr-FR')} XOF</strong></p>
            </div>
            <DollarSign size={20} className="text-primary" />
          </div>
          <div className="h-3 rounded-full bg-surface-container overflow-hidden flex mb-4">
            {repartitionPaiements.map((p, i) => (
              <div key={i} className="h-full transition-all duration-500" style={{ width: p.pct + '%', background: p.color }} title={p.label + ' - ' + p.pct + '%'} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {repartitionPaiements.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-semibold text-on-surface">{p.label}</span>
                <span className="text-xs font-bold" style={{ color: p.color }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-modern !p-0 overflow-hidden">
        <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Derniers mouvements</h3>
              <p className="text-xs text-on-surface-variant">{sessionTx.length} transaction(s) aujourd hui</p>
            </div>
          </div>
          {currentSession && (
            <button onClick={() => setShowTx(true)} className="btn-modern-primary text-xs">
              <Plus size={14} />
              Ajouter
            </button>
          )}
        </div>
        {sessionTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Heure</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Raison</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Montant</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Caissier</th>
                </tr>
              </thead>
              <tbody>
                {[...sessionTx].reverse().map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                    <td className="py-3 px-5 text-sm text-on-surface-variant font-medium">{new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 px-5">
                      <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ' + (tx.type === 'entree' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                        {tx.type === 'entree' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                        {tx.type === 'entree' ? 'Entree' : 'Sortie'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-on-surface max-w-xs truncate">{tx.reason}</td>
                    <td className={'py-3 px-5 text-sm font-bold text-right ' + (tx.type === 'entree' ? 'text-emerald-600' : 'text-red-600')}>
                      {tx.type === 'entree' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} XOF
                    </td>
                    <td className="py-3 px-5 text-xs text-on-surface-variant">{tx.created_by}</td>
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
            <p className="text-sm text-on-surface-variant">Aucun mouvement aujourd hui</p>
          </div>
        )}
      </div>

      {sessions.filter(s => s.status === 'closed').length > 0 && (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30">
            <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Historique des caisses</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">10 dernieres cloture(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fond initial</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Cloture</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Solde final</th>
                  <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Par</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter(s => s.status === 'closed').slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                    <td className="py-3 px-5 text-sm text-on-surface font-medium">{new Date(s.opened_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-5 text-sm text-on-surface-variant">{s.opening_amount.toLocaleString('fr-FR')} XOF</td>
                    <td className="py-3 px-5 text-sm text-on-surface-variant">{s.closed_at ? new Date(s.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="py-3 px-5 text-sm font-bold text-primary text-right">{(s.closing_amount || 0).toLocaleString('fr-FR')} XOF</td>
                    <td className="py-3 px-5 text-xs text-on-surface-variant">{s.opened_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Ouvrir la caisse" size="sm">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-bold text-emerald-800">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-emerald-600 mt-1">Comptez votre fond de caisse avant de commencer.</p>
          </div>
          <Field label="Fond de caisse initial (XOF)">
            <Input type="number" value={openAmount} onChange={e => setOpenAmount(e.target.value)} placeholder="Ex: 50 000" />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 50000].map(v => (
              <button key={v} onClick={() => setOpenAmount(String((parseFloat(openAmount) || 0) + v))} className="py-2 rounded-lg bg-surface-container-low hover:bg-primary-fixed text-sm font-bold text-on-surface transition">
                +{v / 1000}k
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleOpenSession} icon={<Unlock size={16} />}>
            Ouvrir la caisse
          </Button>
        </div>
      </Modal>

      <Modal open={showClose} onClose={() => setShowClose(false)} title="Fermer la caisse" size="sm">
        <div className="space-y-4">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Fond initial</span><span className="font-semibold">{(currentSession?.opening_amount || 0).toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Entrees</span><span className="font-semibold text-emerald-600">+{totalEntrees.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Sorties</span><span className="font-semibold text-red-600">-{totalSorties.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between font-bold border-t border-outline-variant/40 pt-2"><span>Solde theorique</span><span className="text-primary">{soldeAttendu.toLocaleString('fr-FR')} XOF</span></div>
          </div>
          <Field label="Solde physique compte (XOF)">
            <Input type="number" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} placeholder={String(soldeAttendu)} />
          </Field>
          {closeAmount && parseFloat(closeAmount) !== soldeAttendu && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <p className="text-sm font-bold text-red-700">Ecart : {(parseFloat(closeAmount) - soldeAttendu).toLocaleString('fr-FR')} XOF</p>
            </div>
          )}
          <Button className="w-full" onClick={handleCloseSession} icon={<Lock size={16} />} variant="danger">
            Cloturer la caisse
          </Button>
        </div>
      </Modal>

      <Modal open={showTx} onClose={() => setShowTx(false)} title="Mouvement de caisse" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTxForm(f => ({ ...f, type: 'entree' }))} className={'p-3 rounded-xl border-2 text-center font-semibold transition flex items-center justify-center gap-2 ' + (txForm.type === 'entree' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-outline-variant/40 text-on-surface-variant')}>
              <ArrowUpCircle size={16} />
              Entree
            </button>
            <button onClick={() => setTxForm(f => ({ ...f, type: 'sortie' }))} className={'p-3 rounded-xl border-2 text-center font-semibold transition flex items-center justify-center gap-2 ' + (txForm.type === 'sortie' ? 'border-red-500 bg-red-50 text-red-700' : 'border-outline-variant/40 text-on-surface-variant')}>
              <ArrowDownCircle size={16} />
              Sortie
            </button>
          </div>
          <Field label="Montant (XOF)">
            <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="Montant..."
              className="w-full px-4 py-4 bg-surface-container-low text-on-surface text-2xl font-bold rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/40"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 50000].map(v => (
              <button key={v} type="button" onClick={() => addQuickAmount(v)} className="py-2 rounded-lg bg-surface-container-low hover:bg-primary-fixed text-xs font-bold text-on-surface transition">
                +{v / 1000}k
              </button>
            ))}
          </div>
          <Field label="Mode de paiement">
            <Select value={txForm.method} onChange={e => setTxForm(f => ({ ...f, method: e.target.value }))}>
              <option value="especes">Especes</option>
              <option value="wave">Wave</option>
              <option value="orange">Orange Money</option>
              <option value="mtn">MTN Money</option>
            </Select>
          </Field>
          <Field label="Raison">
            <Input value={txForm.reason} onChange={e => setTxForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Paiement client..." />
          </Field>
          <Button className="w-full" onClick={handleAddTx}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default CashierPageModern

