import React, { useState, useMemo } from 'react'
import { useCashStore, useOrderStore, useAuthStore } from '../../lib/store'
import { PageHeader, Button, Modal, Field, Input, Select, Textarea, Card, StatCard, Table, EmptyState, Badge } from '../../components/ui'
import { Plus, Lock, Unlock, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { CashSession, CashTransaction } from '../../types'

export const CashierPage: React.FC = () => {
  const { sessions, cashTransactions, addSession, updateSession, addCashTransaction, getCurrentSession } = useCashStore()
  const orders = useOrderStore(s => s.orders)
  const user = useAuthStore(s => s.user)
  const currentSession = getCurrentSession()

  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)
  const [openAmount, setOpenAmount] = useState(0)
  const [closeAmount, setCloseAmount] = useState(0)
  const [closeNotes, setCloseNotes] = useState('')
  const [txForm, setTxForm] = useState({ type: 'entree' as 'entree' | 'sortie', amount: 0, reason: '' })

  const sessionTransactions = useMemo(() =>
    currentSession ? cashTransactions.filter(t => t.session_id === currentSession.id) : [],
    [cashTransactions, currentSession]
  )

  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return orders.filter(o => o.created_at.startsWith(today) && o.payment_status === 'paye')
  }, [orders])

  const salesTotal = todayOrders.reduce((s, o) => s + o.total, 0)
  const cashIn = sessionTransactions.filter(t => t.type === 'entree').reduce((s, t) => s + t.amount, 0)
  const cashOut = sessionTransactions.filter(t => t.type === 'sortie').reduce((s, t) => s + t.amount, 0)
  const expectedAmount = currentSession ? currentSession.opening_amount + salesTotal + cashIn - cashOut : 0

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault()
    const session: CashSession = {
      id: crypto.randomUUID(), agency_id: 'default',
      opened_by: user?.full_name || 'Admin',
      opened_at: new Date().toISOString(),
      opening_amount: openAmount,
      status: 'open', notes: ''
    }
    addSession(session)
    setShowOpen(false)
    setOpenAmount(0)
  }

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentSession) return
    const diff = closeAmount - expectedAmount
    updateSession(currentSession.id, {
      status: 'closed', closed_at: new Date().toISOString(),
      closing_amount: closeAmount, expected_amount: expectedAmount,
      difference: diff, notes: closeNotes
    })
    setShowClose(false)
    setCloseAmount(0)
    setCloseNotes('')
    alert(`✅ Caisse fermée !\nMontant attendu: ${expectedAmount.toLocaleString('fr-FR')} XOF\nMontant réel: ${closeAmount.toLocaleString('fr-FR')} XOF\nÉcart: ${diff.toLocaleString('fr-FR')} XOF`)
  }

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentSession) return
    addCashTransaction({
      id: crypto.randomUUID(), session_id: currentSession.id,
      type: txForm.type, amount: txForm.amount,
      reason: txForm.reason, created_by: user?.full_name || 'Admin',
      created_at: new Date().toISOString()
    })
    setShowTransaction(false)
    setTxForm({ type: 'entree', amount: 0, reason: '' })
  }

  const closedSessions = sessions.filter(s => s.status === 'closed').slice(-5).reverse()

  return (
    <div className="space-y-6">
      <PageHeader title="Caisse" subtitle={currentSession ? `Session ouverte depuis ${new Date(currentSession.opened_at).toLocaleTimeString('fr-FR')}` : 'Aucune session active'} />

      {/* Session Status */}
      {!currentSession ? (
        <Card className="text-center py-10">
          <Lock size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Caisse fermée</h2>
          <p className="text-gray-400 mb-6">Ouvrez une session pour commencer les opérations</p>
          <Button icon={<Unlock size={18} />} onClick={() => setShowOpen(true)} size="lg">Ouvrir la caisse</Button>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Fond de caisse" value={`${currentSession.opening_amount.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={22} />} color="purple" />
            <StatCard label="Ventes du jour" value={`${salesTotal.toLocaleString('fr-FR')} XOF`} icon={<TrendingUp size={22} />} color="green" sub={`${todayOrders.length} vente(s)`} />
            <StatCard label="Sorties caisse" value={`${cashOut.toLocaleString('fr-FR')} XOF`} icon={<TrendingDown size={22} />} color="red" />
            <StatCard label="Solde attendu" value={`${expectedAmount.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={22} />} color="blue" />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button icon={<Plus size={18} />} variant="success" onClick={() => setShowTransaction(true)}>Mouvement caisse</Button>
            <Button icon={<Lock size={18} />} variant="danger" onClick={() => setShowClose(true)}>Fermer la caisse</Button>
          </div>

          {/* Ventes du jour */}
          <Card>
            <h2 className="text-base font-bold text-gray-900 mb-4">Ventes du jour ({todayOrders.length})</h2>
            {todayOrders.length > 0 ? (
              <Table headers={['Ticket', 'Client', 'Mode paiement', 'Montant']}>
                {todayOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-bold text-purple-700 text-sm">#{o.ticket_number}</td>
                    <td className="px-5 py-3 text-sm">{o.client?.first_name} {o.client?.last_name}</td>
                    <td className="px-5 py-3"><Badge label={o.payment_method.replace('_', ' ')} color="blue" /></td>
                    <td className="px-5 py-3 font-bold text-sm text-green-700">{o.total.toLocaleString('fr-FR')} XOF</td>
                  </tr>
                ))}
              </Table>
            ) : <EmptyState icon="💰" message="Aucune vente aujourd'hui" />}
          </Card>

          {/* Mouvements caisse */}
          <Card>
            <h2 className="text-base font-bold text-gray-900 mb-4">Mouvements de caisse</h2>
            {sessionTransactions.length > 0 ? (
              <Table headers={['Heure', 'Type', 'Raison', 'Montant', 'Par']}>
                {sessionTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(t.created_at).toLocaleTimeString('fr-FR')}</td>
                    <td className="px-5 py-3"><Badge label={t.type === 'entree' ? '📥 Entrée' : '📤 Sortie'} color={t.type === 'entree' ? 'green' : 'red'} /></td>
                    <td className="px-5 py-3 text-sm">{t.reason}</td>
                    <td className={`px-5 py-3 font-bold text-sm ${t.type === 'entree' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'entree' ? '+' : '-'}{t.amount.toLocaleString('fr-FR')} XOF
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{t.created_by}</td>
                  </tr>
                ))}
              </Table>
            ) : <EmptyState icon="📋" message="Aucun mouvement" />}
          </Card>
        </>
      )}

      {/* Historique sessions */}
      {closedSessions.length > 0 && (
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Historique sessions (5 dernières)</h2>
          <Table headers={['Date', 'Ouverture', 'Fermeture', 'Fond initial', 'Montant final', 'Attendu', 'Écart']}>
            {closedSessions.map(s => {
              const diff = (s.difference || 0)
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm">{new Date(s.opened_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-sm">{new Date(s.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3 text-sm">{s.closed_at ? new Date(s.closed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="px-5 py-3 text-sm">{s.opening_amount.toLocaleString('fr-FR')} XOF</td>
                  <td className="px-5 py-3 font-bold text-sm">{(s.closing_amount || 0).toLocaleString('fr-FR')} XOF</td>
                  <td className="px-5 py-3 text-sm">{(s.expected_amount || 0).toLocaleString('fr-FR')} XOF</td>
                  <td className={`px-5 py-3 font-bold text-sm ${diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-FR')} XOF
                    {Math.abs(diff) > 0 && <AlertTriangle size={12} className="inline ml-1" />}
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}

      {/* MODALS */}
      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Ouverture de caisse">
        <form onSubmit={handleOpenSession} className="space-y-4">
          <Field label="Fond de caisse initial (XOF)" hint="Montant en espèces dans la caisse au démarrage" required>
            <Input type="number" min="0" required value={openAmount} onChange={e => setOpenAmount(parseFloat(e.target.value) || 0)} placeholder="Ex: 50000" />
          </Field>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">Ouverture par</p>
            <p className="font-bold text-purple-700">{user?.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleString('fr-FR')}</p>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" icon={<Unlock size={16} />}>Ouvrir la caisse</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowOpen(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showClose} onClose={() => setShowClose(false)} title="Fermeture de caisse">
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Fond initial</span><span>{currentSession?.opening_amount.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm text-green-600"><span>+ Ventes du jour</span><span>{salesTotal.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm text-blue-600"><span>+ Entrées caisse</span><span>{cashIn.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>- Sorties caisse</span><span>{cashOut.toLocaleString('fr-FR')} XOF</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Montant attendu</span><span className="text-purple-700">{expectedAmount.toLocaleString('fr-FR')} XOF</span></div>
          </div>
          <Field label="Montant réel en caisse (XOF)" required>
            <Input type="number" min="0" required value={closeAmount} onChange={e => setCloseAmount(parseFloat(e.target.value) || 0)} placeholder="Comptez et saisissez le montant réel" />
          </Field>
          {closeAmount > 0 && (
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${closeAmount === expectedAmount ? 'bg-green-50 text-green-700' : closeAmount > expectedAmount ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
              Écart: {closeAmount > expectedAmount ? '+' : ''}{(closeAmount - expectedAmount).toLocaleString('fr-FR')} XOF
              {closeAmount === expectedAmount && ' ✅ Parfait !'}
            </div>
          )}
          <Field label="Notes">
            <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Observations sur la session..." />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" className="flex-1" icon={<Lock size={16} />}>Fermer la caisse</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowClose(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showTransaction} onClose={() => setShowTransaction(false)} title="Mouvement de caisse">
        <form onSubmit={handleTransaction} className="space-y-4">
          <Field label="Type de mouvement">
            <Select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value as any })}>
              <option value="entree">📥 Entrée (dépôt, remboursement reçu...)</option>
              <option value="sortie">📤 Sortie (dépense, achat, remboursement...)</option>
            </Select>
          </Field>
          <Field label="Montant (XOF)" required>
            <Input type="number" min="1" required value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Raison / Description" required>
            <Input required value={txForm.reason} onChange={e => setTxForm({ ...txForm, reason: e.target.value })} placeholder="Ex: Achat lessive, Remboursement client..." />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowTransaction(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
