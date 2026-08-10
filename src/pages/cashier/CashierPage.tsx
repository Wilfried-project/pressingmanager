import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../lib/store'
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
    <div className="space-y-6">
      <PageHeader title="Caisse" subtitle={currentSession ? `Session ouverte depuis ${new Date(currentSession.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Caisse fermée'} action={
        <div className="flex gap-2">
          {currentSession
            ? <><Button icon={<Plus size={18} />} onClick={() => setShowTx(true)} variant="ghost">Mouvement</Button><Button icon={<Lock size={18} />} onClick={() => setShowClose(true)} variant="danger">Fermer la caisse</Button></>
            : <Button icon={<Unlock size={18} />} onClick={() => setShowOpen(true)}>Ouvrir la caisse</Button>}
        </div>
      } />

      {showUnclosedAlert && currentSession && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <h3 className="font-bold text-red-800 mb-2">⚠️ Caisse non fermée !</h3>
          <p className="text-sm text-red-700 mb-4">La caisse du <strong>{new Date(currentSession.opened_at).toLocaleDateString('fr-FR')}</strong> n'a pas été fermée.</p>
          <Button onClick={() => { setShowUnclosedAlert(false); setShowClose(true) }} variant="danger" icon={<Lock size={16} />}>Clôturer maintenant</Button>
        </div>
      )}

      {showReminder && currentSession && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
          <h3 className="font-bold text-yellow-800 mb-2">🔔 Il est 18h00 — N'oubliez pas de fermer la caisse !</h3>
          <p className="text-sm text-yellow-700 mb-4">Solde attendu : <strong>{soldeAttendu.toLocaleString('fr-FR')} XOF</strong></p>
          <div className="flex gap-3">
            <Button onClick={() => { setShowReminder(false); setShowClose(true) }} variant="danger" icon={<Lock size={16} />}>Fermer la caisse</Button>
            <Button onClick={() => setShowReminder(false)} variant="secondary">Plus tard</Button>
          </div>
        </div>
      )}

      {!currentSession && <Alert type="warning" message="⚠️ La caisse est fermée. Ouvrez-la avant d'enregistrer des paiements." />}

      {!currentSession && lastClosedSession && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-blue-800 mb-2">☀️ Vérification du solde avant ouverture</h3>
          <p className="text-sm text-blue-700 mb-4">Dernière clôture : <strong>{(lastClosedSession.closing_amount || 0).toLocaleString('fr-FR')} XOF</strong></p>
          <Field label="Solde physique compté (XOF)">
            <Input type="number" value={confirmedSolde} onChange={e => setConfirmedSolde(e.target.value)} placeholder="Comptez votre caisse..." />
          </Field>
          {confirmedSolde && parseFloat(confirmedSolde) !== (lastClosedSession.closing_amount || 0) && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-bold text-red-700">⚠️ Écart : {(parseFloat(confirmedSolde) - (lastClosedSession.closing_amount || 0)).toLocaleString('fr-FR')} XOF</p>
            </div>
          )}
          <div className="mt-4">
            <Button onClick={() => { setOpenAmount(confirmedSolde || String(lastClosedSession.closing_amount || 0)); handleOpenSession() }} disabled={!confirmedSolde} className="w-full">
              Confirmer et ouvrir la caisse
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium">Fond de caisse</p><p className="text-2xl font-bold mt-1">{(currentSession?.opening_amount || 0).toLocaleString('fr-FR')} XOF</p></div><div className="bg-purple-100 text-purple-600 p-3 rounded-full"><DollarSign size={20} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium">Entrées du jour</p><p className="text-2xl font-bold mt-1">{totalEntrees.toLocaleString('fr-FR')} XOF</p><p className="text-xs text-gray-400 mt-0.5">{sessionTx.filter((t: any) => t.type === 'entree').length} entrée(s)</p></div><div className="bg-green-100 text-green-600 p-3 rounded-full"><TrendingUp size={20} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium">Sorties caisse</p><p className="text-2xl font-bold mt-1">{totalSorties.toLocaleString('fr-FR')} XOF</p></div><div className="bg-red-100 text-red-600 p-3 rounded-full"><TrendingDown size={20} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium">Solde attendu</p><p className="text-2xl font-bold text-purple-700 mt-1">{soldeAttendu.toLocaleString('fr-FR')} XOF</p></div><div className="bg-blue-100 text-blue-600 p-3 rounded-full"><DollarSign size={20} /></div></div></Card>
      </div>

      <Card>
        <h2 className="font-bold mb-4">Mouvements de caisse ({sessionTx.length})</h2>
        {loading ? <div className="text-center py-8"><div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" /></div> :
        sessionTx.length > 0 ? (
          <Table headers={['Heure', 'Type', 'Raison', 'Montant', 'Par']}>
            {[...sessionTx].reverse().map((tx: any) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-sm text-gray-500">{new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-5 py-4"><Badge label={tx.type === 'entree' ? '↑ Entrée' : '↓ Sortie'} color={tx.type === 'entree' ? 'green' : 'red'} /></td>
                <td className="px-5 py-4 text-sm max-w-xs truncate">{tx.reason}</td>
                <td className={`px-5 py-4 font-bold text-sm ${tx.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'entree' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4 text-xs text-gray-400">{tx.created_by}</td>
              </tr>
            ))}
          </Table>
        ) : <div className="text-center py-12"><p className="text-4xl mb-3">💰</p><p className="text-gray-400">Aucune vente aujourd'hui</p></div>}
      </Card>

      {sessions.filter(s => s.status === 'closed').length > 0 && (
        <Card>
          <h2 className="font-bold mb-4">Historique des caisses</h2>
          <Table headers={['Date ouverture', 'Fond initial', 'Clôture', 'Solde final', 'Par']}>
            {sessions.filter(s => s.status === 'closed').slice(0, 10).map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-sm">{new Date(s.opened_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-4 text-sm">{s.opening_amount.toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4 text-sm">{s.closed_at ? new Date(s.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td className="px-5 py-4 font-bold text-purple-700">{(s.closing_amount || 0).toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4 text-xs text-gray-400">{s.opened_by}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Ouvrir la caisse" size="sm">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-bold text-green-800">☀️ {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-xs text-green-600 mt-1">Comptez votre fond de caisse.</p>
          </div>
          <Field label="Fond de caisse initial (XOF)"><Input type="number" value={openAmount} onChange={e => setOpenAmount(e.target.value)} placeholder="Ex: 50 000" /></Field>
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
          <Field label="Solde physique compté (XOF)"><Input type="number" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} placeholder={String(soldeAttendu)} /></Field>
          {closeAmount && parseFloat(closeAmount) !== soldeAttendu && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm font-bold text-red-700">⚠️ Écart : {(parseFloat(closeAmount) - soldeAttendu).toLocaleString('fr-FR')} XOF</p></div>
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
              <option value="especes">💵 Espèces</option>
              <option value="wave">🌊 Wave</option>
              <option value="orange">🍊 Orange Money</option>
              <option value="mtn">📱 MTN Money</option>
            </Select>
          </Field>
          <Field label="Raison"><Input value={txForm.reason} onChange={e => setTxForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Paiement client..." /></Field>
          <Button className="w-full" onClick={handleAddTx}>Enregistrer</Button>
        </div>
      </Modal>
    </div>
  )
}
