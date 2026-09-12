import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { cashService } from '../../lib/db'
import { PageHeader, Button, Field, Input, Select, Card, Table, Badge, Modal, Alert } from '../../components/ui'
import { DollarSign, TrendingUp, TrendingDown, Lock, Unlock, Plus } from 'lucide-react'

export const CashierPage: React.FC = () => {
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
  const lastClosedSession = sessions.filter(s => s.status === 'closed').sort((a: any, b: any) => new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime())[0]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sess, txs] = await Promise.all([cashService.getSessions(), cashService.getTransactions()])
      setSessions(sess)
      setTransactions(txs)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Rappel 18h
  useEffect(() => {
    const check = () => {
      const now = new Date()
      if (currentSession && now.getHours() === 18 && now.getMinutes() === 0) setShowReminder(true)
    }
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [currentSession])

  // Alerte caisse non fermée hier
  useEffect(() => {
    if (currentSession) {
      const openedDate = new Date(currentSession.opened_at).toDateString()
      if (openedDate !== new Date().toDateString()) setShowUnclosedAlert(true)
    }
  }, [currentSession])

  // Ouverture/fermeture automatique selon les heures configurées dans Paramètres —
  // vérifiée à chaque chargement de la page (dès qu'un employé se connecte)
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
          const newSession = await cashService.addSession({ id: crypto.randomUUID(), agency_id: 'default', opening_amount: amount, opened_by: 'Système (auto)', opened_at: new Date().toISOString(), status: 'open', notes: 'Ouverture automatique' })
          setSessions(s => [newSession, ...s])
        } else if (currentSession && nowMinutes >= closeMinutes) {
          const updated = await cashService.updateSession(currentSession.id, { status: 'closed', closed_at: new Date().toISOString(), closing_amount: soldeAttendu, notes: 'Fermeture automatique' })
          setSessions(s => s.map((x: any) => x.id === currentSession.id ? updated : x))
        }
      } catch (err) { console.error('Erreur verification horaires caisse:', err) }
    }
    checkAutoSchedule()
  }, [loading])

  const handleOpenSession = async () => {
    const amount = parseFloat(openAmount) || 0
    try {
      const session = await cashService.addSession({ id: crypto.randomUUID(), agency_id: 'default', opening_amount: amount, opened_by: user?.full_name || 'Admin', opened_at: new Date().toISOString(), status: 'open', notes: '' })
      setSessions([session, ...sessions])
      setOpenAmount('')
      setShowOpen(false)
      setConfirmedSolde('')
    } catch (err) { alert('Erreur ouverture caisse') }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return
    const amount = parseFloat(closeAmount) || soldeAttendu
    try {
      const updated = await cashService.updateSession(currentSession.id, { status: 'closed', closed_at: new Date().toISOString(), closing_amount: amount })
      setSessions(sessions.map(s => s.id === currentSession.id ? updated : s))
      setCloseAmount('')
      setShowClose(false)
      setShowUnclosedAlert(false)
    } catch (err) { alert('Erreur fermeture caisse') }
  }

  const handleAddTx = async () => {
    if (!currentSession) { alert('Ouvrez la caisse d\'abord'); setShowOpen(true); return }
    const amount = parseFloat(txForm.amount) || 0
    if (!amount || !txForm.reason) { alert('Montant et raison requis'); return }
    try {
      const tx = await cashService.addTransaction({ id: crypto.randomUUID(), session_id: currentSession.id, type: txForm.type, amount, reason: `[${txForm.method.toUpperCase()}] ${txForm.reason}`, created_by: user?.full_name || 'Admin', created_at: new Date().toISOString() })
      setTransactions([tx, ...transactions])
      setTxForm({ type: 'entree', amount: '', reason: '', method: 'especes' })
      setShowTx(false)
    } catch (err) { alert('Erreur enregistrement') }
  }

  return (
    <div className="flex flex-col gap-space-xl">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Caisse</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">
            {currentSession ? `Session ouverte depuis ${new Date(currentSession.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Caisse fermée'}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-space-sm">
          {currentSession ? (
            <>
              <button onClick={() => setShowTx(true)} className="flex items-center gap-space-xs px-space-lg py-space-xs bg-surface-container-highest text-on-surface font-label-md text-label-md rounded-full shadow-sm hover:bg-surface-container-high transition-all active:scale-95">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>swap_horiz</span>
                <span>Mouvement</span>
              </button>
              <button onClick={() => setShowClose(true)} className="flex items-center gap-space-xs px-space-xl py-space-xs bg-error text-on-error font-label-md text-label-md rounded-full shadow-md hover:opacity-90 transition-all active:scale-95">
                <Lock size={18} />
                <span>Fermer la caisse</span>
              </button>
            </>
          ) : (
            <button onClick={() => setShowOpen(true)} className="flex items-center gap-space-xs px-space-xl py-space-xs bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
              <Unlock size={18} />
              <span>Ouvrir la caisse</span>
            </button>
          )}
        </div>
      </div>

      {showUnclosedAlert && currentSession && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-error-container/80 via-error-container/40 to-surface-container-low p-space-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <p className="font-label-lg text-label-lg text-on-error-container font-bold">Caisse non fermée !</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">La caisse du <strong>{new Date(currentSession.opened_at).toLocaleDateString('fr-FR')}</strong> n'a pas été fermée.</p>
          </div>
          <button onClick={() => { setShowUnclosedAlert(false); setShowClose(true) }} className="px-space-lg py-space-xs bg-error text-on-error font-label-md text-label-md rounded-full shadow-sm hover:opacity-90 active:scale-95 transition-all shrink-0">
            Clôturer maintenant
          </button>
        </div>
      )}

      {showReminder && currentSession && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-tertiary-fixed/80 via-tertiary-fixed/40 to-surface-container-low p-space-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <p className="font-label-lg text-label-lg text-on-tertiary-fixed font-bold">Il est 18h00 — N'oubliez pas de fermer la caisse</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">Solde attendu : <strong>{soldeAttendu.toLocaleString('fr-FR')} XOF</strong></p>
          </div>
          <div className="flex gap-space-sm shrink-0">
            <button onClick={() => { setShowReminder(false); setShowClose(true) }} className="px-space-lg py-space-xs bg-error text-on-error font-label-md text-label-md rounded-full shadow-sm hover:opacity-90 active:scale-95 transition-all">Fermer la caisse</button>
            <button onClick={() => setShowReminder(false)} className="px-space-lg py-space-xs bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-full shadow-sm hover:bg-surface-container transition-all">Plus tard</button>
          </div>
        </div>
      )}

      {!currentSession && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-space-lg flex items-center gap-space-md">
          <span className="material-symbols-outlined text-[#b45309]" style={{ fontSize: 22 }}>warning</span>
          <p className="font-label-md text-label-md text-[#b45309] font-semibold">La caisse est fermée. Ouvrez-la avant d'enregistrer des paiements.</p>
        </div>
      )}

      {!currentSession && lastClosedSession && (
        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>point_of_sale</span>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Vérification du solde avant ouverture</h3>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Dernière clôture : <strong className="text-on-surface">{(lastClosedSession.closing_amount || 0).toLocaleString('fr-FR')} XOF</strong></p>
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Solde physique compté (XOF)</label>
            <input type="number" value={confirmedSolde} onChange={e => setConfirmedSolde(e.target.value)} placeholder="Comptez votre caisse..."
              className="w-full px-space-lg py-space-sm bg-surface-container-low text-on-surface font-numeric-currency text-headline-md rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-right font-bold" />
          </div>
          {confirmedSolde && parseFloat(confirmedSolde) !== (lastClosedSession.closing_amount || 0) && (
            <div className="px-space-md py-space-xs bg-error-container text-on-error-container rounded-full flex items-center justify-between font-label-sm text-label-sm font-bold">
              <span>Écart</span>
              <span>{(parseFloat(confirmedSolde) - (lastClosedSession.closing_amount || 0)).toLocaleString('fr-FR')} XOF</span>
            </div>
          )}
          <button onClick={() => { setOpenAmount(confirmedSolde || String(lastClosedSession.closing_amount || 0)); handleOpenSession() }} disabled={!confirmedSolde}
            className="w-full py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Confirmer et ouvrir la caisse
          </button>
        </div>
      )}

      {/* 4 cartes financières */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="rounded-lg bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Fond de caisse</span>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-sm">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-md">
            <span className="font-numeric-currency text-headline-xl text-on-surface font-bold">{(currentSession?.opening_amount || 0).toLocaleString('fr-FR')}</span>
            <span className="font-label-md text-label-md text-outline font-bold">XOF</span>
          </div>
        </div>
        <div className="rounded-lg bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Entrées du jour</span>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shadow-sm">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-md">
            <span className="font-numeric-currency text-headline-xl text-on-surface font-bold">{totalEntrees.toLocaleString('fr-FR')}</span>
            <span className="font-label-md text-label-md text-outline font-bold">XOF</span>
          </div>
          <span className="font-body-sm text-body-sm text-outline mt-space-2xs">{sessionTx.filter((t: any) => t.type === 'entree').length} entrée(s)</span>
        </div>
        <div className="rounded-lg bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Sorties / Dépenses</span>
            <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-error shadow-sm">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-md">
            <span className="font-numeric-currency text-headline-xl text-error font-bold">{totalSorties.toLocaleString('fr-FR')}</span>
            <span className="font-label-md text-label-md text-outline font-bold">XOF</span>
          </div>
        </div>
        <div className="rounded-lg bg-primary text-on-primary p-space-lg shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-primary-container uppercase font-bold tracking-wider">Solde théorique</span>
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest/15 flex items-center justify-center text-on-primary shadow-sm">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-md">
            <span className="font-numeric-currency text-headline-xl text-on-primary font-bold">{soldeAttendu.toLocaleString('fr-FR')}</span>
            <span className="font-label-md text-label-md text-primary-fixed-dim font-bold">XOF</span>
          </div>
        </div>
      </div>

      {/* Mouvements de caisse */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Mouvements de caisse ({sessionTx.length})</h2>
        {loading ? (
          <div className="text-center py-space-xl"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : sessionTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-sm px-space-md rounded-l-DEFAULT">Heure</th>
                  <th className="py-space-sm px-space-md">Type</th>
                  <th className="py-space-sm px-space-md">Raison</th>
                  <th className="py-space-sm px-space-md">Montant</th>
                  <th className="py-space-sm px-space-md rounded-r-DEFAULT">Par</th>
                </tr>
              </thead>
              <tbody>
                {[...sessionTx].reverse().map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-md font-body-md text-body-md text-outline">{new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex items-center gap-1.5 px-space-md py-1 rounded-full font-label-sm text-label-sm font-bold ${tx.type === 'entree' ? 'bg-tertiary-fixed text-tertiary' : 'bg-error-container text-error'}`}>
                        {tx.type === 'entree' ? '↑ Entrée' : '↓ Sortie'}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface max-w-xs truncate">{tx.reason}</td>
                    <td className={`py-space-md px-space-md font-numeric-currency text-numeric-currency font-bold ${tx.type === 'entree' ? 'text-tertiary' : 'text-error'}`}>{tx.type === 'entree' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} XOF</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline">{tx.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-center py-space-xl font-body-md text-body-md text-outline">Aucune vente aujourd'hui</p>}
      </div>

      {/* Historique */}
      {sessions.filter(s => s.status === 'closed').length > 0 && (
        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-lg lg:p-space-xl">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Historique des caisses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-sm px-space-md rounded-l-DEFAULT">Date ouverture</th>
                  <th className="py-space-sm px-space-md">Fond initial</th>
                  <th className="py-space-sm px-space-md">Clôture</th>
                  <th className="py-space-sm px-space-md">Solde final</th>
                  <th className="py-space-sm px-space-md rounded-r-DEFAULT">Par</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter(s => s.status === 'closed').slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{new Date(s.opened_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{s.opening_amount.toLocaleString('fr-FR')} XOF</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{s.closed_at ? new Date(s.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="py-space-md px-space-md font-numeric-currency text-numeric-currency font-bold text-primary">{(s.closing_amount || 0).toLocaleString('fr-FR')} XOF</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline">{s.opened_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Ouvrir la caisse" size="sm">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-bold text-green-800"> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-green-600 mt-1">Comptez votre fond de caisse.</p>
          </div>
          <Field label="Fond de caisse initial (XOF)"><Input type="number" value={openAmount} onChange={e => setOpenAmount(e.target.value)} onFocus={e => e.target.value === '0' && (e.target.value = '')} placeholder="Ex: 50 000" /></Field>
          <Button className="w-full" onClick={handleOpenSession} icon={<Unlock size={16} />}>Ouvrir la caisse</Button>
        </div>
      </Modal>

      <Modal open={showClose} onClose={() => setShowClose(false)} title="Fermer la caisse" size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Fond initial</span><span className="font-semibold">{(currentSession?.opening_amount || 0).toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Entrées</span><span className="font-semibold text-green-600">+{totalEntrees.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sorties</span><span className="font-semibold text-red-600">-{totalSorties.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Solde théorique</span><span className="text-purple-700">{soldeAttendu.toLocaleString('fr-FR')} XOF</span></div>
          </div>
          <Field label="Solde physique compté (XOF)"><Input type="number" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} onFocus={e => e.target.value === '0' && (e.target.value = '')} placeholder={String(soldeAttendu)} /></Field>
          {closeAmount && parseFloat(closeAmount) !== soldeAttendu && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm font-bold text-red-700"> Écart : {(parseFloat(closeAmount) - soldeAttendu).toLocaleString('fr-FR')} XOF</p></div>
          )}
          <Button className="w-full" onClick={handleCloseSession} icon={<Lock size={16} />} variant="danger">Clôturer la caisse</Button>
        </div>
      </Modal>

      <Modal open={showTx} onClose={() => setShowTx(false)} title="Mouvement de caisse" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTxForm(f => ({ ...f, type: 'entree' }))} className={`p-3 rounded-xl border-2 text-center font-semibold transition ${txForm.type === 'entree' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>↑ Entrée</button>
            <button onClick={() => setTxForm(f => ({ ...f, type: 'sortie' }))} className={`p-3 rounded-xl border-2 text-center font-semibold transition ${txForm.type === 'sortie' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'}`}>↓ Sortie</button>
          </div>
          <Field label="Montant (XOF)"><Input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="Montant..." /></Field>
          <Field label="Mode de paiement">
            <Select value={txForm.method} onChange={e => setTxForm(f => ({ ...f, method: e.target.value }))}>
              <option value="especes"> Espèces</option>
              <option value="wave"> Wave</option>
              <option value="orange"> Orange Money</option>
              <option value="mtn"> MTN Money</option>
            </Select>
          </Field>
          <Field label="Raison"><Input value={txForm.reason} onChange={e => setTxForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Paiement client..." /></Field>
          <Button className="w-full" onClick={handleAddTx}>Enregistrer</Button>
        </div>
      </Modal>
    </div>
  )
}
