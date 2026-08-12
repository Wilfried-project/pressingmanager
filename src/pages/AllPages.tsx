import React, { useState, useMemo, useEffect } from 'react'
import { useStockStore, useHRStore, useNotificationStore, useLoyaltyStore, useAgendaStore, useAgencyStore, useTransactionStore, useOrderStore, useClientStore, useDeliveryStore, useAuthStore, useShopConfig } from '../lib/store'
import { stockService, transactionService, notificationService, agendaService } from '../lib/db'
import { PageHeader, Button, Table, Modal, Field, Input, Select, Textarea, Badge, EmptyState, Card, StatCard, SearchInput, Tabs, Alert } from '../components/ui'
import { Plus, Trash2, Edit2, Bell, Calendar, Building, DollarSign, TrendingUp, TrendingDown, Package, Users, CheckCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import type { StockItem, Employee, Notification, Coupon, AgendaEvent, Agency, Transaction, Delivery, Attendance, Leave, Order } from '../types'

export { SettingsPage } from './settings/SettingsPage'

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6']

// ============================================================
// STOCK PAGE
// ============================================================
export const StockPage: React.FC = () => {
  const { items: localItems, addItem, deleteItem, addMovement, getLowStockItems } = useStockStore()
  const [items, setItems] = useState<StockItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showMovement, setShowMovement] = useState<StockItem | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', category: 'lessive' as StockItem['category'], quantity: 0, unit: 'L', min_threshold: 5, purchase_price: 0, supplier: '' })
  const [mvt, setMvt] = useState({ type: 'entree' as 'entree' | 'sortie', quantity: 0, reason: '' })

  useEffect(() => {
    stockService.getAll().then(data => setItems(data as StockItem[])).catch(() => setItems(localItems))
  }, [])

  const lowStock = items.filter(i => i.quantity <= i.min_threshold)
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const item = await stockService.create({ id: crypto.randomUUID(), agency_id: 'default', ...form, quantity: Number(form.quantity), min_threshold: Number(form.min_threshold), purchase_price: Number(form.purchase_price), created_at: new Date().toISOString() })
      setItems([...items, item as StockItem])
    } catch { addItem({ id: crypto.randomUUID(), agency_id: 'default', ...form, quantity: Number(form.quantity), min_threshold: Number(form.min_threshold), purchase_price: Number(form.purchase_price), created_at: new Date().toISOString() }) }
    setShowForm(false)
    setForm({ name: '', category: 'lessive', quantity: 0, unit: 'L', min_threshold: 5, purchase_price: 0, supplier: '' })
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showMovement) return
    const newQty = mvt.type === 'entree' ? showMovement.quantity + Number(mvt.quantity) : showMovement.quantity - Number(mvt.quantity)
    try {
      await stockService.update(showMovement.id, { quantity: newQty })
      setItems(items.map(i => i.id === showMovement.id ? { ...i, quantity: newQty } : i))
    } catch { addMovement({ id: crypto.randomUUID(), stock_item_id: showMovement.id, type: mvt.type, quantity: Number(mvt.quantity), reason: mvt.reason, created_by: 'system', created_at: new Date().toISOString() }) }
    setShowMovement(null)
    setMvt({ type: 'entree', quantity: 0, reason: '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion des Stocks" subtitle={`${items.length} produit(s) — ${lowStock.length} en rupture`} action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter produit</Button>} />
      {lowStock.length > 0 && <Alert type="error" message={`⚠️ Rupture: ${lowStock.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}`} />}
      <Card className="p-4"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit..." /></Card>
      {filtered.length > 0 ? (
        <Table headers={['Produit', 'Catégorie', 'Quantité', 'Seuil min', 'Prix achat', 'Fournisseur', 'Actions']}>
          {filtered.map(item => (
            <tr key={item.id} className="hover:bg-purple-50">
              <td className="px-5 py-4 font-semibold text-sm">{item.name}</td>
              <td className="px-5 py-4 text-sm capitalize">{item.category.replace('_', ' ')}</td>
              <td className="px-5 py-4"><span className={`font-bold text-sm ${item.quantity <= item.min_threshold ? 'text-red-600' : 'text-green-600'}`}>{item.quantity} {item.unit}</span>{item.quantity <= item.min_threshold && <span className="ml-1 text-xs text-red-500">⚠️</span>}</td>
              <td className="px-5 py-4 text-sm text-gray-500">{item.min_threshold} {item.unit}</td>
              <td className="px-5 py-4 text-sm">{item.purchase_price.toLocaleString('fr-FR')} XOF</td>
              <td className="px-5 py-4 text-sm">{item.supplier || '-'}</td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  <button onClick={() => setShowMovement(item)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">Mouvement</button>
                  <button onClick={async () => { if (confirm('Supprimer ?')) { try { await stockService.delete(item.id); setItems(items.filter(i => i.id !== item.id)) } catch { deleteItem(item.id) } } }} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : <Card><EmptyState icon="📦" message="Aucun produit en stock" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter</Button>} /></Card>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau produit en stock">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nom du produit" required><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lessive liquide Ariel" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie"><Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as StockItem['category'] })}>{['lessive','eau_javel','detachant','parfum','sacs','etiquettes','cintres','emballages','autre'].map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}</Select></Field>
            <Field label="Unité"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="L, kg, pièces..." /></Field>
            <Field label="Quantité initiale"><Input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Seuil d'alerte"><Input type="number" min="0" value={form.min_threshold} onChange={e => setForm({ ...form, min_threshold: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Prix d'achat (XOF)"><Input type="number" min="0" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Fournisseur"><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Nom du fournisseur" /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>

      <Modal open={!!showMovement} onClose={() => setShowMovement(null)} title={`Mouvement — ${showMovement?.name}`}>
        <form onSubmit={handleMovement} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-sm text-gray-500">Stock actuel</p><p className="text-3xl font-bold text-purple-700">{showMovement?.quantity} {showMovement?.unit}</p></div>
          <Field label="Type"><Select value={mvt.type} onChange={e => setMvt({ ...mvt, type: e.target.value as any })}><option value="entree">📥 Entrée</option><option value="sortie">📤 Sortie</option></Select></Field>
          <Field label="Quantité" required><Input type="number" min="1" required value={mvt.quantity} onChange={e => setMvt({ ...mvt, quantity: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Raison" required><Input required value={mvt.reason} onChange={e => setMvt({ ...mvt, reason: e.target.value })} placeholder="Ex: Achat fournisseur..." /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowMovement(null)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// HR PAGE
// ============================================================
export const HRPage: React.FC = () => {
  const { employees, attendances, leaves, addEmployee, updateEmployee, deleteEmployee, addAttendance, addLeave, updateLeave, getTodayAttendance } = useHRStore()
  const [showForm, setShowForm] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [activeTab, setActiveTab] = useState('employees')
  const [form, setForm] = useState({ full_name: '', role: 'laveur' as Employee['role'], phone: '', salary: 0, hire_date: '' })
  const [attForm, setAttForm] = useState({ employee_id: '', status: 'present' as Attendance['status'] })
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', type: 'conge' as Leave['type'], start_date: '', end_date: '', notes: '' })
  const todayAtt = getTodayAttendance()
  const activeEmployees = employees.filter(e => e.is_active)
  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const totalSalaries = employees.filter(e => e.is_active).reduce((s, e) => s + e.salary, 0)
  const roleColors: Record<string, string> = { admin: 'purple', manager: 'blue', caissier: 'green', reception: 'cyan', laveur: 'orange', repasseur: 'yellow', livreur: 'indigo' }

  return (
    <div className="space-y-6">
      <PageHeader title="Employés & RH" subtitle={`${activeEmployees.length} employé(s) actif(s)`} action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter employé</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Employés actifs" value={activeEmployees.length} icon={<Users size={20} />} color="purple" />
        <StatCard label="Présents aujourd'hui" value={todayAtt.filter(a => a.status === 'present').length} icon={<CheckCircle size={20} />} color="green" />
        <StatCard label="Congés en attente" value={pendingLeaves.length} icon={<Calendar size={20} />} color="yellow" />
        <StatCard label="Masse salariale" value={`${totalSalaries.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={20} />} color="blue" />
      </div>
      <Tabs tabs={[{ key: 'employees', label: 'Employés', icon: '👷' }, { key: 'attendance', label: 'Pointage', icon: '⏱️' }, { key: 'leaves', label: 'Congés', icon: '🏖️' }]} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <Card key={emp.id}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-700 font-bold text-lg">{emp.full_name.charAt(0)}</div>
                <div className="flex gap-1">
                  <button onClick={() => updateEmployee(emp.id, { is_active: !emp.is_active })} className={`px-2 py-1 rounded text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{emp.is_active ? 'Actif' : 'Inactif'}</button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteEmployee(emp.id) }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900">{emp.full_name}</h3>
              <Badge label={emp.role} color={roleColors[emp.role] || 'gray'} />
              <div className="mt-4 space-y-1.5">
                {emp.phone && <p className="text-sm text-gray-500">📞 {emp.phone}</p>}
                <p className="text-sm font-semibold text-gray-700">💰 {Number(emp.salary).toLocaleString('fr-FR')} XOF/mois</p>
                {emp.hire_date && <p className="text-xs text-gray-400">📅 Depuis {new Date(emp.hire_date).toLocaleDateString('fr-FR')}</p>}
              </div>
            </Card>
          ))}
          {employees.length === 0 && <div className="col-span-3 bg-white rounded-xl shadow-sm border"><EmptyState icon="👷" message="Aucun employé" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter</Button>} /></div>}
        </div>
      )}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button icon={<Plus size={18} />} onClick={() => setShowAttendance(true)}>Enregistrer présence</Button></div>
          {todayAtt.length > 0 ? (
            <Table headers={['Employé', 'Statut', 'Heure arrivée', 'Heure départ']}>
              {todayAtt.map(att => { const emp = employees.find(e => e.id === att.employee_id); return (
                <tr key={att.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-sm">{emp?.full_name || 'Inconnu'}</td>
                  <td className="px-5 py-4"><Badge label={att.status} color={att.status === 'present' ? 'green' : att.status === 'absent' ? 'red' : 'yellow'} /></td>
                  <td className="px-5 py-4 text-sm">{new Date(att.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-4 text-sm">{att.check_out ? new Date(att.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                </tr>
              )})}
            </Table>
          ) : <Card><EmptyState icon="⏱️" message="Aucun pointage aujourd'hui" /></Card>}
        </div>
      )}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button icon={<Plus size={18} />} onClick={() => setShowLeave(true)}>Demande de congé</Button></div>
          {leaves.length > 0 ? (
            <Table headers={['Employé', 'Type', 'Du', 'Au', 'Statut', 'Actions']}>
              {leaves.map(leave => { const emp = employees.find(e => e.id === leave.employee_id); return (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-sm">{emp?.full_name || 'Inconnu'}</td>
                  <td className="px-5 py-4"><Badge label={leave.type} color="blue" /></td>
                  <td className="px-5 py-4 text-sm">{new Date(leave.start_date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-4 text-sm">{new Date(leave.end_date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-4"><Badge label={leave.status} color={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'yellow'} /></td>
                  <td className="px-5 py-4">{leave.status === 'pending' && <div className="flex gap-1"><button onClick={() => updateLeave(leave.id, { status: 'approved' })} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✅</button><button onClick={() => updateLeave(leave.id, { status: 'rejected' })} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">❌</button></div>}</td>
                </tr>
              )})}
            </Table>
          ) : <Card><EmptyState icon="🏖️" message="Aucune demande" /></Card>}
        </div>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel employé">
        <form onSubmit={e => { e.preventDefault(); addEmployee({ id: crypto.randomUUID(), user_id: crypto.randomUUID(), agency_id: 'default', ...form, salary: Number(form.salary), is_active: true }); setShowForm(false); setForm({ full_name: '', role: 'laveur', phone: '', salary: 0, hire_date: '' }) }} className="space-y-4">
          <Field label="Nom complet" required><Input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prénom et Nom" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rôle"><Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Employee['role'] })}>{['admin','manager','caissier','reception','laveur','repasseur','livreur'].map(r => <option key={r} value={r}>{r}</option>)}</Select></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Salaire (XOF)"><Input type="number" min="0" value={form.salary} onChange={e => setForm({ ...form, salary: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Date d'embauche"><Input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
      <Modal open={showAttendance} onClose={() => setShowAttendance(false)} title="Enregistrer présence">
        <form onSubmit={e => { e.preventDefault(); addAttendance({ id: crypto.randomUUID(), employee_id: attForm.employee_id, date: new Date().toISOString().split('T')[0], check_in: new Date().toISOString(), status: attForm.status }); setShowAttendance(false) }} className="space-y-4">
          <Field label="Employé" required><Select required value={attForm.employee_id} onChange={e => setAttForm({ ...attForm, employee_id: e.target.value })}><option value="">Sélectionner...</option>{employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
          <Field label="Statut"><Select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}><option value="present">✅ Présent</option><option value="absent">❌ Absent</option><option value="retard">⚠️ Retard</option><option value="conge">🏖️ Congé</option></Select></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAttendance(false)}>Annuler</Button></div>
        </form>
      </Modal>
      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Demande de congé">
        <form onSubmit={e => { e.preventDefault(); addLeave({ id: crypto.randomUUID(), ...leaveForm, status: 'pending' }); setShowLeave(false); setLeaveForm({ employee_id: '', type: 'conge', start_date: '', end_date: '', notes: '' }) }} className="space-y-4">
          <Field label="Employé" required><Select required value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}><option value="">Sélectionner...</option>{employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}><option value="conge">🏖️ Congé</option><option value="maladie">🏥 Maladie</option><option value="autre">📋 Autre</option></Select></Field>
            <div />
            <Field label="Date début"><Input type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} /></Field>
            <Field label="Date fin"><Input type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Soumettre</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowLeave(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// NOTIFICATIONS PAGE
// ============================================================
export const NotificationsPage: React.FC = () => {
  const { notifications: localNotifs, addNotification, updateNotification } = useNotificationStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const orders = useOrderStore(s => s.orders)
  const clients = useClientStore(s => s.clients)

  useEffect(() => {
    notificationService.getAll().then(data => setNotifications(data as any[])).catch(() => setNotifications(localNotifs as any[]))
  }, [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', type: 'whatsapp' as Notification['type'], message: '' })
  const readyOrders = orders.filter(o => o.status === 'pret')
  const pendingCount = notifications.filter(n => n.status === 'pending').length
  const sentCount = notifications.filter(n => n.status === 'sent').length

  const sendBulkReady = () => {
    readyOrders.forEach(order => addNotification({ id: crypto.randomUUID(), client_id: order.client_id, client_name: `${order.client?.first_name} ${order.client?.last_name}`, client_phone: order.client?.phone || '', type: 'whatsapp', message: `Bonjour ${order.client?.first_name} ! 🧺 Votre commande #${order.ticket_number} est prête. — PressingManager`, status: 'pending', created_at: new Date().toISOString() }))
    alert(`✅ ${readyOrders.length} notification(s) préparée(s)`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={`${pendingCount} en attente, ${sentCount} envoyées`} action={<div className="flex gap-2">{readyOrders.length > 0 && <Button variant="success" icon={<Bell size={18} />} onClick={sendBulkReady}>Notifier {readyOrders.length} client(s)</Button>}<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle</Button></div>} />
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p><p className="text-xs text-gray-500 mt-1">En attente</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{sentCount}</p><p className="text-xs text-gray-500 mt-1">Envoyées</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{notifications.filter(n => n.status === 'failed').length}</p><p className="text-xs text-gray-500 mt-1">Échouées</p></Card>
      </div>
      {notifications.length > 0 ? (
        <Table headers={['Client', 'Téléphone', 'Type', 'Message', 'Statut', 'Actions']}>
          {notifications.slice().reverse().map(n => (
            <tr key={n.id} className="hover:bg-gray-50">
              <td className="px-5 py-4 font-medium text-sm">{n.client_name}</td>
              <td className="px-5 py-4 text-sm">{n.client_phone}</td>
              <td className="px-5 py-4"><Badge label={n.type === 'whatsapp' ? '📱 WhatsApp' : n.type === 'sms' ? '💬 SMS' : '📧 Email'} color={n.type === 'whatsapp' ? 'green' : 'blue'} /></td>
              <td className="px-5 py-4 text-sm max-w-xs truncate">{n.message}</td>
              <td className="px-5 py-4"><Badge label={n.status} color={n.status === 'sent' ? 'green' : n.status === 'failed' ? 'red' : 'yellow'} /></td>
              <td className="px-5 py-4">{n.status === 'pending' && <button onClick={() => { window.open(n.type === 'whatsapp' ? `https://wa.me/${n.client_phone.replace(/\s/g,'')}?text=${encodeURIComponent(n.message)}` : `sms:${n.client_phone}`, '_blank'); updateNotification(n.id, { status: 'sent', sent_at: new Date().toISOString() }) }} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Envoyer</button>}</td>
            </tr>
          ))}
        </Table>
      ) : <Card><EmptyState icon="🔔" message="Aucune notification" /></Card>}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle notification">
        <form onSubmit={e => { e.preventDefault(); const c = clients.find(cl => cl.id === form.client_id); if (!c) return; addNotification({ id: crypto.randomUUID(), client_id: c.id, client_name: `${c.first_name} ${c.last_name}`, client_phone: c.phone, type: form.type, message: form.message, status: 'pending', created_at: new Date().toISOString() }); setShowForm(false); setForm({ client_id: '', type: 'whatsapp', message: '' }) }} className="space-y-4">
          <Field label="Client" required><Select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</Select></Field>
          <Field label="Canal"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}><option value="whatsapp">📱 WhatsApp</option><option value="sms">💬 SMS</option><option value="email">📧 Email</option></Select></Field>
          <Field label="Message" required><Textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Préparer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// LOYALTY PAGE
// ============================================================
export const LoyaltyPage: React.FC = () => {
  const clients = useClientStore(s => s.clients)
  const { coupons, addCoupon, getLevelFromPoints } = useLoyaltyStore()
  const [showCoupon, setShowCoupon] = useState(false)
  const [couponForm, setCouponForm] = useState({ code: '', discount_percent: 10, valid_until: '', client_id: '' })
  const levelConfig = { bronze: { min: 0, max: 499, color: 'from-amber-700 to-amber-500', icon: '🥉' }, silver: { min: 500, max: 1999, color: 'from-gray-500 to-gray-400', icon: '🥈' }, gold: { min: 2000, max: 4999, color: 'from-yellow-500 to-yellow-400', icon: '🥇' }, platinum: { min: 5000, max: Infinity, color: 'from-purple-600 to-indigo-500', icon: '💎' } }
  const clientsByLevel = useMemo(() => ({ bronze: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'bronze').length, silver: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'silver').length, gold: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'gold').length, platinum: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'platinum').length }), [clients])
  const topByPoints = [...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader title="Programme de Fidélité" subtitle="Points, niveaux et coupons" action={<Button icon={<Plus size={18} />} onClick={() => setShowCoupon(true)}>Créer un coupon</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(levelConfig).map(([level, config]) => (
          <div key={level} className={`bg-gradient-to-br ${config.color} rounded-2xl p-5 text-white`}>
            <div className="flex items-center justify-between mb-3"><span className="text-3xl">{config.icon}</span><span className="text-2xl font-bold">{clientsByLevel[level as keyof typeof clientsByLevel]}</span></div>
            <p className="font-bold capitalize text-lg">{level}</p>
            <p className="text-xs opacity-70">{config.min === 0 ? '0' : config.min.toLocaleString()} — {config.max === Infinity ? '∞' : config.max.toLocaleString()} pts</p>
          </div>
        ))}
      </div>
      <Card>
        <h2 className="text-base font-bold mb-4">🏆 Classement fidélité</h2>
        {topByPoints.filter(c => c.loyalty_points > 0).length > 0 ? (
          <div className="space-y-2">
            {topByPoints.filter(c => c.loyalty_points > 0).map((c, i) => {
              const level = getLevelFromPoints(c.loyalty_points)
              const icons: Record<string,string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3"><span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span><div><p className="font-semibold text-sm">{c.first_name} {c.last_name}</p><p className="text-xs text-gray-400">{c.phone}</p></div></div>
                  <div className="flex items-center gap-2"><span className="text-lg">{icons[level]}</span><div><p className="font-bold text-sm text-purple-700">{c.loyalty_points} pts</p><p className="text-xs text-gray-400 capitalize">{level}</p></div></div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState icon="⭐" message="Aucun point attribué" />}
      </Card>
      <Card>
        <h2 className="text-base font-bold mb-4">🎫 Coupons</h2>
        {coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map(coupon => (
              <div key={coupon.id} className={`rounded-xl p-4 border-2 border-dashed ${coupon.is_used ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-purple-300 bg-purple-50'}`}>
                <div className="flex justify-between items-start"><div><p className="font-bold text-lg text-purple-700">{coupon.discount_percent}% OFF</p><p className="font-mono text-sm font-bold">{coupon.code}</p></div><Badge label={coupon.is_used ? 'Utilisé' : 'Actif'} color={coupon.is_used ? 'gray' : 'green'} /></div>
                <p className="text-xs text-gray-400 mt-2">Expire: {new Date(coupon.valid_until).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="🎫" message="Aucun coupon" action={<Button icon={<Plus size={18} />} onClick={() => setShowCoupon(true)}>Créer</Button>} />}
      </Card>
      <Modal open={showCoupon} onClose={() => setShowCoupon(false)} title="Créer un coupon">
        <form onSubmit={e => { e.preventDefault(); addCoupon({ id: crypto.randomUUID(), ...couponForm, discount_percent: Number(couponForm.discount_percent), is_used: false, created_at: new Date().toISOString() }); setShowCoupon(false); setCouponForm({ code: '', discount_percent: 10, valid_until: '', client_id: '' }) }} className="space-y-4">
          <Field label="Code" required><Input required value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="Ex: FIDELITE20" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Réduction (%)" required><Input type="number" min="1" max="100" required value={couponForm.discount_percent} onChange={e => setCouponForm({ ...couponForm, discount_percent: parseInt(e.target.value) })} /></Field>
            <Field label="Valide jusqu'au" required><Input type="date" required value={couponForm.valid_until} onChange={e => setCouponForm({ ...couponForm, valid_until: e.target.value })} /></Field>
          </div>
          <Field label="Client (optionnel)"><Select value={couponForm.client_id} onChange={e => setCouponForm({ ...couponForm, client_id: e.target.value })}><option value="">Tous les clients</option>{clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</Select></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Créer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCoupon(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// AGENDA PAGE
// ============================================================
export const AgendaPage: React.FC = () => {
  const { events: localEvents, addEvent, deleteEvent, getEventsByDate } = useAgendaStore()
  const [dbEvents, setDbEvents] = useState<AgendaEvent[]>([])
  const orders = useOrderStore(s => s.orders)

  useEffect(() => {
    agendaService.getAll().then(data => setDbEvents(data as AgendaEvent[])).catch(() => setDbEvents(localEvents))
  }, [])

  const events = useMemo(() => {
    const all = [...dbEvents]
    localEvents.forEach(le => { if (!all.find(e => e.id === le.id)) all.push(le) })
    return all
  }, [dbEvents, localEvents])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'rappel' as AgendaEvent['type'], date: selectedDate, time: '09:00', description: '' })
  const typeColors: Record<string,string> = { livraison: 'blue', rappel: 'yellow', conge: 'green', autre: 'gray' }
  const typeIcons: Record<string,string> = { livraison: '🚚', rappel: '🔔', conge: '🏖️', autre: '📋' }
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: 42 }, (_, i) => { const day = i - firstDay + 1; return day > 0 && day <= daysInMonth ? day : null })
  const dayOrders = orders.filter(o => o.expected_at && o.expected_at.startsWith(selectedDate) && o.status !== 'annule' && o.status !== 'livre')
  const dayEvents = events.filter(e => e.date === selectedDate)
  const daysWithOrders = new Set(orders.filter(o => o.expected_at && o.status !== 'annule' && o.status !== 'livre').map(o => o.expected_at.split('T')[0]))
  const daysWithEvents = new Set(events.map(e => e.date))

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda & Planning" subtitle={`${events.length} événement(s) — ${orders.filter(o => o.expected_at && o.status !== 'annule').length} livraison(s) planifiée(s)`} action={<Button icon={<Plus size={18} />} onClick={() => { setForm({ ...form, date: selectedDate }); setShowForm(true) }}>Nouvel événement</Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="font-bold text-center mb-4">{today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
          <div className="grid grid-cols-7 gap-1 mb-2">{['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map(d => <p key={d} className="text-center text-xs font-semibold text-gray-400">{d}</p>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const hasOrders = daysWithOrders.has(dateStr)
              const hasEvents = daysWithEvents.has(dateStr)
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-purple-50 text-purple-700 font-bold' : 'hover:bg-gray-100'}`}>
                  {day}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasOrders && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                    {hasEvents && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-yellow-500'}`} />}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-500" /> Livraisons</div>
            <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Événements</div>
          </div>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="font-bold mb-4">{new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {dayOrders.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-blue-600 uppercase mb-2">Livraisons prévues ({dayOrders.length})</p>
                <div className="space-y-2">
                  {dayOrders.map(order => (
                    <div key={order.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-blue-900 truncate">#{order.ticket_number} — {order.client?.first_name} {order.client?.last_name}</p>
                        <p className="text-xs text-blue-600">{order.clothes.length} article(s) • {order.total.toLocaleString('fr-FR')} XOF {order.remaining > 0 ? `• Reste: ${order.remaining.toLocaleString('fr-FR')} XOF` : '✅ Soldé'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${order.status === 'pret' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status.replace('_',' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayEvents.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Événements ({dayEvents.length})</p>
                <div className="space-y-2">
                  {dayEvents.sort((a,b) => a.time.localeCompare(b.time)).map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="text-center flex-shrink-0"><p className="text-xl">{typeIcons[event.type]}</p><p className="text-xs font-bold text-gray-600">{event.time}</p></div>
                      <div className="flex-1"><div className="flex justify-between"><p className="font-semibold">{event.title}</p><button onClick={() => deleteEvent(event.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></div><Badge label={event.type} color={typeColors[event.type]} />{event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayOrders.length === 0 && dayEvents.length === 0 && <EmptyState icon="📅" message="Aucune livraison ni événement ce jour" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Ajouter</Button>} />}
          </Card>
          <Card>
            <h2 className="font-bold mb-4">Charge de travail — 7 prochains jours</h2>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i)
                const ds = d.toISOString().split('T')[0]
                const count = orders.filter(o => o.expected_at?.startsWith(ds) && o.status !== 'annule' && o.status !== 'livre').length
                const isSelected = ds === selectedDate
                const isSunday = d.getDay() === 0
                const level = isSunday ? 'ferme' : count === 0 ? 'libre' : count <= 3 ? 'calme' : count <= 7 ? 'charge' : 'plein'
                const colors: Record<string,string> = { ferme: 'bg-gray-200 text-gray-400', libre: 'bg-gray-100 text-gray-500', calme: 'bg-green-100 text-green-700', charge: 'bg-yellow-100 text-yellow-700', plein: 'bg-red-100 text-red-700' }
                return (
                  <button key={i} onClick={() => setSelectedDate(ds)} className={`p-2 rounded-xl text-center transition ${colors[level]} ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
                    <p className="text-xs font-semibold">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="text-xs">{d.getDate()}</p>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs">{level}</p>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel événement">
        <form onSubmit={e => { e.preventDefault(); addEvent({ id: crypto.randomUUID(), ...form, created_at: new Date().toISOString() }); setShowForm(false); setForm({ title: '', type: 'rappel', date: selectedDate, time: '09:00', description: '' }) }} className="space-y-4">
          <Field label="Titre" required><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AgendaEvent['type'] })}><option value="livraison">🚚 Livraison</option><option value="rappel">🔔 Rappel</option><option value="conge">🏖️ Congé</option><option value="autre">📋 Autre</option></Select></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Heure"><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// MULTI-AGENCY PAGE
// ============================================================
export const MultiAgencyPage: React.FC = () => {
  const { agencies, addAgency, deleteAgency } = useAgencyStore()
  const orders = useOrderStore(s => s.orders)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' })
  const getAgencyRevenue = (id: string) => orders.filter(o => o.agency_id === id && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)
  const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Multi-agences" subtitle="Vue consolidée" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle agence</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total agences" value={agencies.length} icon={<Building size={20} />} color="purple" />
        <StatCard label="Total commandes" value={orders.length} icon={<Package size={20} />} color="blue" />
        <StatCard label="CA global" value={`${totalRevenue.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={20} />} color="green" />
        <StatCard label="Agences actives" value={agencies.filter(a => a.is_active).length} icon={<CheckCircle size={20} />} color="indigo" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agencies.map(agency => { const revenue = getAgencyRevenue(agency.id); const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0; return (
          <Card key={agency.id}>
            <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">🏢</div><div className="flex gap-2"><Badge label={agency.is_active ? 'Active' : 'Inactive'} color={agency.is_active ? 'green' : 'red'} />{agency.id !== 'default' && <button onClick={() => { if (confirm('Supprimer ?')) deleteAgency(agency.id) }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>}</div></div>
            <h3 className="font-bold text-lg">{agency.name}</h3>
            <p className="text-sm text-gray-500">📍 {agency.address || '-'}</p>
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">CA</span><span className="font-bold text-purple-700">{revenue.toLocaleString('fr-FR')} XOF</span></div>
              <div className="bg-gray-100 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
            </div>
          </Card>
        )})}
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle agence">
        <form onSubmit={e => { e.preventDefault(); addAgency({ id: crypto.randomUUID(), ...form, is_active: true, created_at: new Date().toISOString() }); setShowForm(false); setForm({ name: '', address: '', phone: '', email: '' }) }} className="space-y-4">
          <Field label="Nom" required><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Créer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// ACCOUNTING PAGE
// ============================================================
export const AccountingPage: React.FC = () => {
  const { transactions: localTx, addTransaction, getTotalRecettes, getTotalDepenses, getBenefice } = useTransactionStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    transactionService.getAll().then(data => setTransactions(data as Transaction[])).catch(() => setTransactions(localTx))
  }, [])

  const totalRecettes = transactions.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0)
  const totalDepenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0)
  const benefice = totalRecettes - totalDepenses
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState({ type: 'recette' as 'recette' | 'depense', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] })
  const trend = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6-i)); const ds = d.toISOString().split('T')[0]; const dayT = transactions.filter(t => t.date === ds); return { date: d.toLocaleDateString('fr-FR', { weekday: 'short' }), Recettes: dayT.filter(t => t.type === 'recette').reduce((s,t) => s+t.amount,0), Dépenses: dayT.filter(t => t.type === 'depense').reduce((s,t) => s+t.amount,0) } })
  const byCategory = useMemo(() => { const map = new Map<string,number>(); transactions.filter(t => t.type === 'depense').forEach(t => map.set(t.category, (map.get(t.category)||0)+t.amount)); return Array.from(map.entries()).map(([name,value]) => ({ name, value })) }, [transactions])

  return (
    <div className="space-y-6">
      <PageHeader title="Comptabilité" subtitle="Journal des recettes et dépenses" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle transaction</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white"><TrendingUp size={28} className="mb-3 opacity-80" /><p className="text-sm opacity-80">Total Recettes</p><p className="text-2xl font-bold mt-1">{getTotalRecettes().toLocaleString('fr-FR')} XOF</p></div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white"><TrendingDown size={28} className="mb-3 opacity-80" /><p className="text-sm opacity-80">Total Dépenses</p><p className="text-2xl font-bold mt-1">{getTotalDepenses().toLocaleString('fr-FR')} XOF</p></div>
        <div className={`bg-gradient-to-br ${benefice >= 0 ? 'from-purple-600 to-indigo-600' : 'from-red-600 to-rose-700'} rounded-2xl p-6 text-white`}><DollarSign size={28} className="mb-3 opacity-80" /><p className="text-sm opacity-80">Bénéfice Net</p><p className="text-2xl font-bold mt-1">{benefice >= 0 ? '+' : ''}{benefice.toLocaleString('fr-FR')} XOF</p></div>
      </div>
      <Tabs tabs={[{ key: 'overview', label: "Vue d'ensemble", icon: '📊' }, { key: 'journal', label: 'Journal', icon: '📒' }]} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card><h2 className="text-base font-bold mb-4">Tendance 7 jours</h2><ResponsiveContainer width="100%" height={220}><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /><Bar dataKey="Recettes" fill="#10b981" radius={[4,4,0,0]} /><Bar dataKey="Dépenses" fill="#ef4444" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></Card>
          <Card><h2 className="text-base font-bold mb-4">Dépenses par catégorie</h2>{byCategory.length > 0 ? <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{byCategory.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /></PieChart></ResponsiveContainer> : <EmptyState icon="📊" message="Aucune dépense" />}</Card>
        </div>
      )}
      {activeTab === 'journal' && (transactions.length > 0 ? <Table headers={['Date','Type','Catégorie','Description','Montant','Par']}>{transactions.slice().reverse().map(t => <tr key={t.id} className="hover:bg-gray-50"><td className="px-5 py-4 text-sm">{new Date(t.date).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4"><Badge label={t.type === 'recette' ? '📈 Recette' : '📉 Dépense'} color={t.type === 'recette' ? 'green' : 'red'} /></td><td className="px-5 py-4 text-sm capitalize">{t.category}</td><td className="px-5 py-4 text-sm">{t.description}</td><td className={`px-5 py-4 font-bold text-sm ${t.type === 'recette' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'depense' ? '-' : '+'}{t.amount.toLocaleString('fr-FR')} XOF</td><td className="px-5 py-4 text-xs text-gray-400">{t.created_by}</td></tr>)}</Table> : <Card><EmptyState icon="📒" message="Aucune transaction" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter</Button>} /></Card>)}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle transaction">
        <form onSubmit={e => { e.preventDefault(); transactionService.create({ id: crypto.randomUUID(), agency_id: 'default', ...form, amount: Number(form.amount), created_by: 'system' }).then(tx => setTransactions([tx as Transaction, ...transactions])).catch(() => addTransaction({ id: crypto.randomUUID(), agency_id: 'default', ...form, amount: Number(form.amount), created_by: 'system' })); setShowForm(false); setForm({ type: 'recette', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}><option value="recette">📈 Recette</option><option value="depense">📉 Dépense</option></Select></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Catégorie" required><Input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Vente, Salaire, Loyer..." /></Field>
            <Field label="Montant (XOF)" required><Input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// REPORTS PAGE
// ============================================================
export const ReportsPage: React.FC = () => {
  const orders = useOrderStore(s => s.orders)
  const clients = useClientStore(s => s.clients)
  const { employees } = useHRStore()
  const [activeTab, setActiveTab] = useState('overview')
  const stats = useMemo(() => { const month = new Date().toISOString().slice(0,7); const monthOrders = orders.filter(o => o.created_at.startsWith(month)); const monthRevenue = monthOrders.filter(o => o.payment_status === 'paye').reduce((s,o) => s+o.total,0); const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s,o) => s+o.total,0); const avgTicket = orders.filter(o => o.payment_status === 'paye').length > 0 ? totalRevenue / orders.filter(o => o.payment_status === 'paye').length : 0; return { monthOrders: monthOrders.length, monthRevenue, totalRevenue, totalOrders: orders.length, lateOrders: orders.filter(o => o.status !== 'livre' && o.status !== 'annule' && new Date(o.expected_at) < new Date()).length, avgTicket, cancelRate: orders.length > 0 ? (orders.filter(o => o.status === 'annule').length / orders.length) * 100 : 0 } }, [orders])
  const revenueTrend = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29-i)); const ds = d.toISOString().split('T')[0]; return { date: String(d.getDate()), CA: orders.filter(o => o.created_at.startsWith(ds) && o.payment_status === 'paye').reduce((s,o) => s+o.total,0) } })
  const topClients = clients.map(c => ({ name: `${c.first_name} ${c.last_name}`, total: orders.filter(o => o.client_id === c.id && o.payment_status === 'paye').reduce((s,o) => s+o.total,0), count: orders.filter(o => o.client_id === c.id).length })).sort((a,b) => b.total - a.total).slice(0,10).filter(c => c.total > 0)
  const exportCSV = () => { const headers = ['Ticket','Client','Date','Total','Statut','Paiement']; const rows = orders.map(o => [o.ticket_number,`${o.client?.first_name} ${o.client?.last_name}`,new Date(o.created_at).toLocaleDateString('fr-FR'),o.total,o.status,o.payment_status]); const csv = [headers,...rows].map(r => r.join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `rapport_${new Date().toISOString().split('T')[0]}.csv`; a.click() }

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports & Statistiques" subtitle="Vue complète des performances" action={<Button variant="ghost" onClick={exportCSV}>📥 Exporter CSV</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Commandes ce mois" value={stats.monthOrders} icon={<Package size={20} />} color="purple" />
        <StatCard label="CA ce mois" value={`${stats.monthRevenue.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={20} />} color="green" />
        <StatCard label="Ticket moyen" value={`${Math.round(stats.avgTicket).toLocaleString('fr-FR')} XOF`} icon={<TrendingUp size={20} />} color="blue" />
        <StatCard label="Taux annulation" value={`${stats.cancelRate.toFixed(1)}%`} icon={<TrendingDown size={20} />} color={stats.cancelRate > 10 ? 'red' : 'green'} />
      </div>
      <Tabs tabs={[{ key: 'overview', label: 'Vue globale', icon: '📊' }, { key: 'clients', label: 'Clients', icon: '👥' }, { key: 'orders', label: 'Commandes', icon: '🧺' }]} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && <Card><h2 className="text-base font-bold mb-4">CA 30 derniers jours</h2><ResponsiveContainer width="100%" height={250}><LineChart data={revenueTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /><Line type="monotone" dataKey="CA" stroke="#7c3aed" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></Card>}
      {activeTab === 'clients' && <Card><h2 className="text-base font-bold mb-4">Top 10 clients</h2>{topClients.length > 0 ? <div className="space-y-2">{topClients.map((c,i) => <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-purple-400'}`}>{i+1}</span><div className="flex-1"><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-gray-400">{c.count} commande(s)</p></div><p className="font-bold text-purple-700 text-sm">{c.total.toLocaleString('fr-FR')} XOF</p></div>)}</div> : <EmptyState icon="👥" message="Aucune vente" />}</Card>}
      {activeTab === 'orders' && (orders.length > 0 ? <Table headers={['Ticket','Client','Date','Total','Statut','Paiement']}>{orders.slice().reverse().map(o => <tr key={o.id} className="hover:bg-gray-50"><td className="px-5 py-4 font-bold text-purple-700 text-sm">#{o.ticket_number}</td><td className="px-5 py-4 text-sm">{o.client?.first_name} {o.client?.last_name}</td><td className="px-5 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4 font-bold text-sm">{o.total.toLocaleString('fr-FR')} XOF</td><td className="px-5 py-4"><Badge label={o.status.replace('_',' ')} color={o.status === 'pret' ? 'green' : o.status === 'livre' ? 'gray' : 'yellow'} /></td><td className="px-5 py-4"><Badge label={o.payment_status} color={o.payment_status === 'paye' ? 'green' : o.payment_status === 'acompte' ? 'yellow' : 'red'} /></td></tr>)}</Table> : <Card><EmptyState icon="🧺" message="Aucune commande" /></Card>)}
    </div>
  )
}

// ============================================================
// SERVICES PAGE
// ============================================================
const DEFAULT_PRICES = [
  { id: '1', cloth_type: 'chemise', service_type: 'lavage_simple', price: 1500, express_surcharge: 300, duration_hours: 48 },
  { id: '2', cloth_type: 'chemise', service_type: 'repassage', price: 750, express_surcharge: 150, duration_hours: 24 },
  { id: '3', cloth_type: 'chemise', service_type: 'nettoyage_sec', price: 2500, express_surcharge: 500, duration_hours: 72 },
  { id: '4', cloth_type: 'pantalon', service_type: 'lavage_simple', price: 1500, express_surcharge: 300, duration_hours: 48 },
  { id: '5', cloth_type: 'pantalon', service_type: 'nettoyage_sec', price: 2500, express_surcharge: 500, duration_hours: 72 },
  { id: '6', cloth_type: 'costume', service_type: 'nettoyage_sec', price: 5000, express_surcharge: 1000, duration_hours: 72 },
  { id: '7', cloth_type: 'robe', service_type: 'nettoyage_sec', price: 3500, express_surcharge: 700, duration_hours: 72 },
  { id: '8', cloth_type: 'couverture', service_type: 'lavage_simple', price: 3000, express_surcharge: 600, duration_hours: 96 },
  { id: '9', cloth_type: 'tapis', service_type: 'lavage_simple', price: 5000, express_surcharge: 1000, duration_hours: 96 },
  { id: '10', cloth_type: 'couette', service_type: 'lavage_simple', price: 4000, express_surcharge: 800, duration_hours: 96 },
  { id: '11', cloth_type: 'chaussures', service_type: 'detachage', price: 2000, express_surcharge: 400, duration_hours: 48 },
  { id: '12', cloth_type: 'tout', service_type: 'service_vip', price: 8000, express_surcharge: 2000, duration_hours: 24 },
]

export const ServicesPage: React.FC = () => {
  const [prices, setPrices] = useState(DEFAULT_PRICES)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ price: 0, express_surcharge: 0, duration_hours: 0 })

  return (
    <div className="space-y-6">
      <PageHeader title="Services & Tarifs" subtitle="Configurez vos prix et délais" />
      <Alert type="info" message="💡 Cliquez sur ✏️ pour modifier un prix." />
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
              <tr>{['Type', 'Service', 'Prix normal (XOF)', 'Express (XOF)', 'Délai (h)', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-purple-700 uppercase whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prices.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-semibold capitalize text-sm">{p.cloth_type}</td>
                  <td className="px-5 py-4 text-sm capitalize text-gray-600">{p.service_type.replace(/_/g,' ')}</td>
                  <td className="px-5 py-4">{editId === p.id ? <Input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: parseInt(e.target.value) })} className="w-24" /> : <span className="font-bold text-purple-700">{p.price.toLocaleString('fr-FR')}</span>}</td>
                  <td className="px-5 py-4">{editId === p.id ? <Input type="number" value={editData.express_surcharge} onChange={e => setEditData({ ...editData, express_surcharge: parseInt(e.target.value) })} className="w-24" /> : <span className="text-sm text-orange-600 font-medium">+{p.express_surcharge.toLocaleString('fr-FR')}</span>}</td>
                  <td className="px-5 py-4">{editId === p.id ? <Input type="number" value={editData.duration_hours} onChange={e => setEditData({ ...editData, duration_hours: parseInt(e.target.value) })} className="w-20" /> : <span className="text-sm">{p.duration_hours}h</span>}</td>
                  <td className="px-5 py-4">{editId === p.id ? <div className="flex gap-2"><button onClick={() => { setPrices(ps => ps.map(pp => pp.id === p.id ? { ...pp, ...editData } : pp)); setEditId(null) }} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs">✅ Sauver</button><button onClick={() => setEditId(null)} className="px-3 py-1 bg-gray-300 rounded-lg text-xs">Annuler</button></div> : <button onClick={() => { setEditId(p.id); setEditData({ price: p.price, express_surcharge: p.express_surcharge, duration_hours: p.duration_hours }) }} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg"><Edit2 size={16} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DELIVERY PAGE
// ============================================================
export const DeliveryPage: React.FC = () => {
  const { deliveries, addDelivery, updateDelivery, getTodayDeliveries } = useDeliveryStore()
  const orders = useOrderStore(s => s.orders)
  const { employees } = useHRStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ order_id: '', driver_id: '', address: '', scheduled_at: '', notes: '' })
  const readyOrders = orders.filter(o => o.status === 'pret')
  const livreurs = employees.filter(e => e.role === 'livreur' && e.is_active)
  const todayDeliveries = getTodayDeliveries()
  const statusColors: Record<string,string> = { planifie: 'yellow', en_route: 'blue', livre: 'green', echec: 'red' }

  return (
    <div className="space-y-6">
      <PageHeader title="Livraisons" subtitle={`${deliveries.length} livraison(s) — ${todayDeliveries.length} aujourd'hui`} action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Planifier livraison</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ l:'Planifiées', s:'planifie', c:'yellow' },{ l:'En route', s:'en_route', c:'blue' },{ l:'Livrées', s:'livre', c:'green' },{ l:'Échouées', s:'echec', c:'red' }].map(({ l, s, c }) => <Card key={s} className="p-4 text-center"><p className="text-2xl font-bold">{deliveries.filter(d => d.status === s).length}</p><Badge label={l} color={c} /></Card>)}
      </div>
      {readyOrders.length > 0 && <Alert type="info" message={`📦 ${readyOrders.length} commande(s) prête(s) à livrer`} />}
      {deliveries.length > 0 ? (
        <Table headers={['Commande','Client','Adresse','Livreur','Date/Heure','Statut','Actions']}>
          {deliveries.slice().reverse().map(d => { const order = orders.find(o => o.id === d.order_id); const driver = employees.find(e => e.id === d.driver_id); return (
            <tr key={d.id} className="hover:bg-purple-50">
              <td className="px-5 py-4 font-bold text-purple-700 text-sm">{order ? `#${order.ticket_number}` : '-'}</td>
              <td className="px-5 py-4 text-sm">{order ? `${order.client?.first_name} ${order.client?.last_name}` : '-'}</td>
              <td className="px-5 py-4 text-sm max-w-32 truncate">{d.address}</td>
              <td className="px-5 py-4 text-sm">{driver?.full_name || '-'}</td>
              <td className="px-5 py-4 text-sm">{new Date(d.scheduled_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
              <td className="px-5 py-4"><Badge label={d.status} color={statusColors[d.status]} /></td>
              <td className="px-5 py-4"><Select value={d.status} onChange={e => updateDelivery(d.id, { status: e.target.value as any, ...(e.target.value === 'livre' ? { delivered_at: new Date().toISOString() } : {}) })} className="text-xs py-1 w-32"><option value="planifie">Planifié</option><option value="en_route">En route</option><option value="livre">Livré ✅</option><option value="echec">Échec ❌</option></Select></td>
            </tr>
          )})}
        </Table>
      ) : <Card><EmptyState icon="🚚" message="Aucune livraison" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Planifier</Button>} /></Card>}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Planifier une livraison">
        <form onSubmit={e => { e.preventDefault(); addDelivery({ id: crypto.randomUUID(), ...form, status: 'planifie', created_at: new Date().toISOString() } as Delivery); setShowForm(false); setForm({ order_id: '', driver_id: '', address: '', scheduled_at: '', notes: '' }) }} className="space-y-4">
          <Field label="Commande prête" required><Select required value={form.order_id} onChange={e => { const o = orders.find(ord => ord.id === e.target.value); setForm({ ...form, order_id: e.target.value, address: o?.client?.address || '' }) }}><option value="">Sélectionner...</option>{readyOrders.map(o => <option key={o.id} value={o.id}>#{o.ticket_number} — {o.client?.first_name} {o.client?.last_name}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Livreur"><Select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}><option value="">Sélectionner...</option>{livreurs.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}</Select></Field>
            <Field label="Date et heure" required><Input required type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></Field>
          </div>
          <Field label="Adresse" required><Input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Planifier</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// BILLING PAGE
// ============================================================
export const BillingPage: React.FC = () => {
  const orders = useOrderStore(s => s.orders)
  const { config } = useShopConfig()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const filtered = orders.filter(o => { const ms = o.ticket_number.toLowerCase().includes(search.toLowerCase()) || `${o.client?.first_name} ${o.client?.last_name}`.toLowerCase().includes(search.toLowerCase()); return ms && (!filter || o.payment_status === filter) })
  const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s,o) => s+o.total,0)
  const pendingRevenue = orders.filter(o => o.payment_status === 'non_paye').reduce((s,o) => s+o.remaining,0)
  const acompteRevenue = orders.filter(o => o.payment_status === 'acompte').reduce((s,o) => s+o.remaining,0)

  const printInvoice = (order: Order) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Facture #${order.ticket_number}</title><style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto} .header{display:flex;justify-content:space-between;border-bottom:3px solid #7c3aed;padding-bottom:20px;margin-bottom:30px} table{width:100%;border-collapse:collapse;margin:20px 0} th{background:#7c3aed;color:white;padding:10px;text-align:left} td{padding:8px 10px;border-bottom:1px solid #eee} .total{font-size:18px;font-weight:900;color:#7c3aed} .footer{margin-top:40px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:20px}</style></head><body>
    <div class="header">
      <div>
        ${config.logo ? `<img src="${config.logo}" alt="logo" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : '<h1 style="color:#7c3aed;margin:0">🧺</h1>'}
        <h1 style="color:#7c3aed;margin:0">${config.name || 'PressingManager'}</h1>
        ${config.slogan ? `<p style="color:#666;font-size:13px;margin-top:4px">${config.slogan}</p>` : ''}
        ${config.phone ? `<p style="color:#666;font-size:12px">📞 ${config.phone}</p>` : ''}
        ${config.address ? `<p style="color:#666;font-size:12px">📍 ${config.address}</p>` : ''}
      </div>
      <div style="text-align:right"><h2 style="color:#7c3aed;margin:0">FACTURE</h2><p>#${order.ticket_number}</p><p>${new Date(order.created_at).toLocaleDateString('fr-FR')}</p></div>
    </div>
    <h3>Client: ${order.client?.first_name} ${order.client?.last_name} — ${order.client?.phone}</h3>
    <table><tr><th>Article</th><th>Service</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>${order.clothes.map(c => `<tr><td style="text-transform:capitalize">${c.type}</td><td>${(c.service||'').replace(/_/g,' ')}</td><td>${c.quantity}</td><td>${c.price.toLocaleString('fr-FR')} XOF</td><td>${(c.price*c.quantity).toLocaleString('fr-FR')} XOF</td></tr>`).join('')}</table>
    <div style="text-align:right"><p>Sous-total: ${order.subtotal.toLocaleString('fr-FR')} XOF</p>${order.discount > 0 ? `<p style="color:green">Remise: -${order.discount.toLocaleString('fr-FR')} XOF</p>` : ''}<p class="total">TOTAL: ${order.total.toLocaleString('fr-FR')} XOF</p>${order.remaining > 0 ? `<p style="color:red;font-weight:bold">Reste à payer: ${order.remaining.toLocaleString('fr-FR')} XOF</p>` : ''}</div>
    <div class="footer">${config.footer || 'Merci pour votre confiance'} — Facture générée le ${new Date().toLocaleDateString('fr-FR')}</div>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Facturation" subtitle={`${orders.length} facture(s)`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center"><p className="text-xs text-green-600 font-semibold uppercase">CA Encaissé</p><p className="text-2xl font-bold text-green-700 mt-1">{totalRevenue.toLocaleString('fr-FR')} XOF</p></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center"><p className="text-xs text-yellow-600 font-semibold uppercase">Acomptes restants</p><p className="text-2xl font-bold text-yellow-700 mt-1">{acompteRevenue.toLocaleString('fr-FR')} XOF</p></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center"><p className="text-xs text-red-600 font-semibold uppercase">Impayés</p><p className="text-2xl font-bold text-red-700 mt-1">{pendingRevenue.toLocaleString('fr-FR')} XOF</p></div>
      </div>
      <Card className="p-4"><div className="flex gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Ticket, nom client..." className="flex-1" /><Select value={filter} onChange={e => setFilter(e.target.value)} className="w-44"><option value="">Tous</option><option value="paye">✅ Payés</option><option value="acompte">⚠️ Acompte</option><option value="non_paye">❌ Non payés</option></Select></div></Card>
      {filtered.length > 0 ? (
        <Table headers={['Ticket','Client','Date','Total','Reste','Statut','Actions']}>
          {filtered.map(o => <tr key={o.id} className="hover:bg-purple-50"><td className="px-5 py-4 font-bold text-purple-700 text-sm">#{o.ticket_number}</td><td className="px-5 py-4 text-sm">{o.client?.first_name} {o.client?.last_name}</td><td className="px-5 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4 font-bold text-sm">{o.total.toLocaleString('fr-FR')} XOF</td><td className={`px-5 py-4 font-bold text-sm ${o.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{o.remaining > 0 ? `${o.remaining.toLocaleString('fr-FR')} XOF` : '✅ Soldé'}</td><td className="px-5 py-4"><Badge label={o.payment_status === 'paye' ? '✅ Payé' : o.payment_status === 'acompte' ? '⚠️ Acompte' : '❌ Impayé'} color={o.payment_status === 'paye' ? 'green' : o.payment_status === 'acompte' ? 'yellow' : 'red'} /></td><td className="px-5 py-4"><button onClick={() => printInvoice(o)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">🖨️ Facture</button></td></tr>)}
        </Table>
      ) : <Card><EmptyState icon="🧾" message="Aucune facture trouvée" /></Card>}
    </div>
  )
}
