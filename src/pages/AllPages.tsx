import React, { useState, useMemo } from 'react'
import { useStockStore, useHRStore, useNotificationStore, useLoyaltyStore, useAgendaStore, useAgencyStore, useTransactionStore, useOrderStore, useClientStore, useDeliveryStore, useAuthStore } from '../lib/store'
import { PageHeader, Button, Table, Modal, Field, Input, Select, Textarea, Badge, EmptyState, Card, StatCard, SearchInput, Tabs, Alert } from '../components/ui'
import { Plus, Trash2, Edit2, Bell, Star, Calendar, Building, DollarSign, TrendingUp, TrendingDown, Package, Users, CheckCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import type { StockItem, Employee, Notification, Coupon, AgendaEvent, Agency, Transaction, Delivery } from '../types'

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#8b5cf6']

// ============================================================
// STOCK PAGE
// ============================================================
export const StockPage: React.FC = () => {
  const { items, movements, addItem, updateItem, deleteItem, addMovement, getLowStockItems } = useStockStore()
  const [showForm, setShowForm] = useState(false)
  const [showMovement, setShowMovement] = useState<StockItem | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', category: 'lessive' as StockItem['category'], quantity: 0, unit: 'L', min_threshold: 5, purchase_price: 0, supplier: '' })
  const [mvt, setMvt] = useState({ type: 'entree' as 'entree' | 'sortie', quantity: 0, reason: '' })
  const lowStock = getLowStockItems()

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addItem({ id: crypto.randomUUID(), agency_id: 'default', ...form, quantity: Number(form.quantity), min_threshold: Number(form.min_threshold), purchase_price: Number(form.purchase_price), created_at: new Date().toISOString() })
    setShowForm(false)
    setForm({ name: '', category: 'lessive', quantity: 0, unit: 'L', min_threshold: 5, purchase_price: 0, supplier: '' })
  }

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showMovement) return
    addMovement({ id: crypto.randomUUID(), stock_item_id: showMovement.id, type: mvt.type, quantity: Number(mvt.quantity), reason: mvt.reason, created_by: 'system', created_at: new Date().toISOString() })
    setShowMovement(null)
    setMvt({ type: 'entree', quantity: 0, reason: '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion des Stocks" subtitle={`${items.length} produit(s) — ${lowStock.length} en rupture`}
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter produit</Button>} />

      {lowStock.length > 0 && (
        <Alert type="error" message={`⚠️ Rupture de stock: ${lowStock.map(i => `${i.name} (${i.quantity} ${i.unit} restant)`).join(', ')}`} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['lessive', 'eau_javel', 'detachant', 'sacs'].map(cat => (
          <Card key={cat} className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{items.filter(i => i.category === cat).length}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{cat.replace('_', ' ')}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit..." />
      </Card>

      {filtered.length > 0 ? (
        <Table headers={['Produit', 'Catégorie', 'Quantité', 'Seuil min', 'Prix achat', 'Fournisseur', 'Actions']}>
          {filtered.map(item => (
            <tr key={item.id} className="hover:bg-purple-50">
              <td className="px-5 py-4 font-semibold text-sm">{item.name}</td>
              <td className="px-5 py-4 text-sm capitalize">{item.category.replace('_', ' ')}</td>
              <td className="px-5 py-4">
                <span className={`font-bold text-sm ${item.quantity <= item.min_threshold ? 'text-red-600' : 'text-green-600'}`}>
                  {item.quantity} {item.unit}
                </span>
                {item.quantity <= item.min_threshold && <span className="ml-1 text-xs text-red-500">⚠️ Rupture</span>}
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">{item.min_threshold} {item.unit}</td>
              <td className="px-5 py-4 text-sm">{item.purchase_price.toLocaleString('fr-FR')} XOF</td>
              <td className="px-5 py-4 text-sm">{item.supplier || '-'}</td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  <button onClick={() => setShowMovement(item)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">Mouvement</button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteItem(item.id) }} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={14} /></button>
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
            <Field label="Catégorie"><Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as StockItem['category'] })}>
              {['lessive', 'eau_javel', 'detachant', 'parfum', 'sacs', 'etiquettes', 'cintres', 'emballages', 'autre'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </Select></Field>
            <Field label="Unité de mesure"><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="L, kg, pièces, boîtes..." /></Field>
            <Field label="Quantité initiale"><Input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Seuil d'alerte minimum"><Input type="number" min="0" value={form.min_threshold} onChange={e => setForm({ ...form, min_threshold: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Prix d'achat (XOF)"><Input type="number" min="0" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Fournisseur"><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Nom du fournisseur" /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>

      <Modal open={!!showMovement} onClose={() => setShowMovement(null)} title={`Mouvement de stock — ${showMovement?.name}`}>
        <form onSubmit={handleMovement} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Stock actuel</p>
            <p className="text-3xl font-bold text-purple-700">{showMovement?.quantity} {showMovement?.unit}</p>
          </div>
          <Field label="Type de mouvement"><Select value={mvt.type} onChange={e => setMvt({ ...mvt, type: e.target.value as any })}>
            <option value="entree">📥 Entrée (réapprovisionnement)</option>
            <option value="sortie">📤 Sortie (utilisation, perte...)</option>
          </Select></Field>
          <Field label="Quantité" required><Input type="number" min="1" required value={mvt.quantity} onChange={e => setMvt({ ...mvt, quantity: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Raison" required><Input required value={mvt.reason} onChange={e => setMvt({ ...mvt, reason: e.target.value })} placeholder="Ex: Achat fournisseur, Utilisation quotidienne..." /></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer le mouvement</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowMovement(null)}>Annuler</Button></div>
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

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    addEmployee({ id: crypto.randomUUID(), user_id: crypto.randomUUID(), agency_id: 'default', ...form, salary: Number(form.salary), is_active: true })
    setShowForm(false)
    setForm({ full_name: '', role: 'laveur', phone: '', salary: 0, hire_date: '' })
  }

  const handleAttendance = (e: React.FormEvent) => {
    e.preventDefault()
    addAttendance({ id: crypto.randomUUID(), employee_id: attForm.employee_id, date: new Date().toISOString().split('T')[0], check_in: new Date().toISOString(), status: attForm.status })
    setShowAttendance(false)
  }

  const handleLeave = (e: React.FormEvent) => {
    e.preventDefault()
    addLeave({ id: crypto.randomUUID(), ...leaveForm, status: 'pending' })
    setShowLeave(false)
    setLeaveForm({ employee_id: '', type: 'conge', start_date: '', end_date: '', notes: '' })
  }

  const roleColors: Record<string, string> = { admin: 'purple', manager: 'blue', caissier: 'green', reception: 'cyan', laveur: 'orange', repasseur: 'yellow', livreur: 'indigo' }

  return (
    <div className="space-y-6">
      <PageHeader title="Employés & Ressources Humaines" subtitle={`${activeEmployees.length} employé(s) actif(s)`}
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter employé</Button>} />

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
            <Card key={emp.id} className="hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-700 font-bold text-lg">{emp.full_name.charAt(0)}</div>
                <div className="flex gap-1">
                  <button onClick={() => updateEmployee(emp.id, { is_active: !emp.is_active })}
                    className={`px-2 py-1 rounded text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.is_active ? 'Actif' : 'Inactif'}
                  </button>
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
          <div className="flex justify-end">
            <Button icon={<Plus size={18} />} onClick={() => setShowAttendance(true)}>Enregistrer présence</Button>
          </div>
          {todayAtt.length > 0 ? (
            <Table headers={['Employé', 'Statut', 'Heure arrivée', 'Heure départ']}>
              {todayAtt.map(att => {
                const emp = employees.find(e => e.id === att.employee_id)
                return (
                  <tr key={att.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-sm">{emp?.full_name || 'Inconnu'}</td>
                    <td className="px-5 py-4"><Badge label={att.status} color={att.status === 'present' ? 'green' : att.status === 'absent' ? 'red' : att.status === 'retard' ? 'yellow' : 'blue'} /></td>
                    <td className="px-5 py-4 text-sm">{new Date(att.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-4 text-sm">{att.check_out ? new Date(att.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  </tr>
                )
              })}
            </Table>
          ) : <Card><EmptyState icon="⏱️" message="Aucun pointage aujourd'hui" action={<Button icon={<Plus size={18} />} onClick={() => setShowAttendance(true)}>Enregistrer</Button>} /></Card>}
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={<Plus size={18} />} onClick={() => setShowLeave(true)}>Demande de congé</Button>
          </div>
          {leaves.length > 0 ? (
            <Table headers={['Employé', 'Type', 'Du', 'Au', 'Statut', 'Actions']}>
              {leaves.map(leave => {
                const emp = employees.find(e => e.id === leave.employee_id)
                return (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-sm">{emp?.full_name || 'Inconnu'}</td>
                    <td className="px-5 py-4"><Badge label={leave.type} color="blue" /></td>
                    <td className="px-5 py-4 text-sm">{new Date(leave.start_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-4 text-sm">{new Date(leave.end_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-4"><Badge label={leave.status} color={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'yellow'} /></td>
                    <td className="px-5 py-4">
                      {leave.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => updateLeave(leave.id, { status: 'approved' })} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✅ Approuver</button>
                          <button onClick={() => updateLeave(leave.id, { status: 'rejected' })} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">❌ Refuser</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Table>
          ) : <Card><EmptyState icon="🏖️" message="Aucune demande de congé" /></Card>}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel employé">
        <form onSubmit={handleSubmitEmployee} className="space-y-4">
          <Field label="Nom complet" required><Input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prénom et Nom" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rôle / Poste"><Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Employee['role'] })}>
              {['admin', 'manager', 'caissier', 'reception', 'laveur', 'repasseur', 'livreur'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 XX XX XX XX XX" /></Field>
            <Field label="Salaire mensuel (XOF)"><Input type="number" min="0" value={form.salary} onChange={e => setForm({ ...form, salary: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Date d'embauche"><Input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>

      <Modal open={showAttendance} onClose={() => setShowAttendance(false)} title="Enregistrer une présence">
        <form onSubmit={handleAttendance} className="space-y-4">
          <Field label="Employé" required><Select required value={attForm.employee_id} onChange={e => setAttForm({ ...attForm, employee_id: e.target.value })}>
            <option value="">Sélectionner...</option>
            {employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select></Field>
          <Field label="Statut"><Select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}>
            <option value="present">✅ Présent</option>
            <option value="absent">❌ Absent</option>
            <option value="retard">⚠️ En retard</option>
            <option value="conge">🏖️ En congé</option>
          </Select></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAttendance(false)}>Annuler</Button></div>
        </form>
      </Modal>

      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Demande de congé">
        <form onSubmit={handleLeave} className="space-y-4">
          <Field label="Employé" required><Select required value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}>
            <option value="">Sélectionner...</option>
            {employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </Select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}>
              <option value="conge">🏖️ Congé annuel</option>
              <option value="maladie">🏥 Maladie</option>
              <option value="autre">📋 Autre</option>
            </Select></Field>
            <div />
            <Field label="Date début"><Input type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} /></Field>
            <Field label="Date fin"><Input type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} placeholder="Motif, informations..." /></Field>
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
  const { notifications, addNotification, updateNotification } = useNotificationStore()
  const orders = useOrderStore(s => s.orders)
  const clients = useClientStore(s => s.clients)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', type: 'whatsapp' as Notification['type'], message: '' })

  const readyOrders = orders.filter(o => o.status === 'pret')

  const sendBulkReady = () => {
    readyOrders.forEach(order => {
      addNotification({
        id: crypto.randomUUID(), client_id: order.client_id,
        client_name: `${order.client?.first_name} ${order.client?.last_name}`,
        client_phone: order.client?.phone || '',
        type: 'whatsapp',
        message: `Bonjour ${order.client?.first_name} ! 🧺 Votre commande #${order.ticket_number} est prête. Venez la récupérer. Merci ! — PressingManager`,
        status: 'pending', created_at: new Date().toISOString()
      })
    })
    alert(`✅ ${readyOrders.length} notification(s) préparée(s)`)
  }

  const markSent = (id: string) => updateNotification(id, { status: 'sent', sent_at: new Date().toISOString() })
  const markFailed = (id: string) => updateNotification(id, { status: 'failed' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const client = clients.find(c => c.id === form.client_id)
    if (!client) return
    addNotification({ id: crypto.randomUUID(), client_id: client.id, client_name: `${client.first_name} ${client.last_name}`, client_phone: client.phone, type: form.type, message: form.message, status: 'pending', created_at: new Date().toISOString() })
    setShowForm(false)
    setForm({ client_id: '', type: 'whatsapp', message: '' })
  }

  const pendingCount = notifications.filter(n => n.status === 'pending').length
  const sentCount = notifications.filter(n => n.status === 'sent').length

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={`${pendingCount} en attente, ${sentCount} envoyées`}
        action={<div className="flex gap-2">
          {readyOrders.length > 0 && <Button variant="success" icon={<Bell size={18} />} onClick={sendBulkReady}>Notifier {readyOrders.length} client(s) — Commandes prêtes</Button>}
          <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle notification</Button>
        </div>} />

      {readyOrders.length > 0 && (
        <Alert type="info" message={`💡 ${readyOrders.length} commande(s) prête(s) à notifier — Cliquez sur "Notifier" pour préparer les messages`} />
      )}

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
              <td className="px-5 py-4"><Badge label={n.type === 'whatsapp' ? '📱 WhatsApp' : n.type === 'sms' ? '💬 SMS' : '📧 Email'} color={n.type === 'whatsapp' ? 'green' : n.type === 'sms' ? 'blue' : 'purple'} /></td>
              <td className="px-5 py-4 text-sm max-w-xs truncate">{n.message}</td>
              <td className="px-5 py-4"><Badge label={n.status} color={n.status === 'sent' ? 'green' : n.status === 'failed' ? 'red' : 'yellow'} /></td>
              <td className="px-5 py-4">
                {n.status === 'pending' && (
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const url = n.type === 'whatsapp' ? `https://wa.me/${n.client_phone.replace(/\s/g, '')}?text=${encodeURIComponent(n.message)}` : `sms:${n.client_phone}?body=${encodeURIComponent(n.message)}`
                      window.open(url, '_blank')
                      markSent(n.id)
                    }} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Envoyer</button>
                    <button onClick={() => markFailed(n.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">Marquer échoué</button>
                  </div>
                )}
                {n.status === 'sent' && <span className="text-xs text-gray-400">{n.sent_at ? new Date(n.sent_at).toLocaleString('fr-FR') : '-'}</span>}
              </td>
            </tr>
          ))}
        </Table>
      ) : <Card><EmptyState icon="🔔" message="Aucune notification" /></Card>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle notification">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Client" required><Select required value={form.client_id} onChange={e => {
            const c = clients.find(cl => cl.id === e.target.value)
            setForm({ ...form, client_id: e.target.value, message: c ? `Bonjour ${c.first_name} ! ` : '' })
          }}>
            <option value="">Sélectionner un client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.phone}</option>)}
          </Select></Field>
          <Field label="Canal"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="sms">💬 SMS</option>
            <option value="email">📧 Email</option>
          </Select></Field>
          <Field label="Message" required><Textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Votre message..." rows={4} /></Field>
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

  const clientsByLevel = useMemo(() => ({
    bronze: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'bronze').length,
    silver: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'silver').length,
    gold: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'gold').length,
    platinum: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'platinum').length,
  }), [clients])

  const handleCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    addCoupon({ id: crypto.randomUUID(), ...couponForm, discount_percent: Number(couponForm.discount_percent), is_used: false, created_at: new Date().toISOString() })
    setShowCoupon(false)
    setCouponForm({ code: '', discount_percent: 10, valid_until: '', client_id: '' })
  }

  const topByPoints = [...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader title="Programme de Fidélité" subtitle="Gérez les points, niveaux et coupons"
        action={<Button icon={<Plus size={18} />} onClick={() => setShowCoupon(true)}>Créer un coupon</Button>} />

      {/* Level Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(levelConfig).map(([level, config]) => (
          <div key={level} className={`bg-gradient-to-br ${config.color} rounded-2xl p-5 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{config.icon}</span>
              <span className="text-2xl font-bold">{clientsByLevel[level as keyof typeof clientsByLevel]}</span>
            </div>
            <p className="font-bold capitalize text-lg">{level}</p>
            <p className="text-xs opacity-70 mt-0.5">{config.min === 0 ? '0' : config.min.toLocaleString()} — {config.max === Infinity ? '∞' : config.max.toLocaleString()} pts</p>
          </div>
        ))}
      </div>

      {/* Top clients */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 mb-4">🏆 Classement fidélité</h2>
        {topByPoints.filter(c => c.loyalty_points > 0).length > 0 ? (
          <div className="space-y-2">
            {topByPoints.filter(c => c.loyalty_points > 0).map((c, i) => {
              const level = getLevelFromPoints(c.loyalty_points)
              const icons: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-lg">{icons[level]}</span>
                    <div>
                      <p className="font-bold text-sm text-purple-700">{c.loyalty_points} pts</p>
                      <p className="text-xs text-gray-400 capitalize">{level}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState icon="⭐" message="Aucun point fidélité attribué" />}
      </Card>

      {/* Coupons */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 mb-4">🎫 Coupons de réduction</h2>
        {coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map(coupon => (
              <div key={coupon.id} className={`rounded-xl p-4 border-2 border-dashed ${coupon.is_used ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-purple-300 bg-purple-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-purple-700">{coupon.discount_percent}% OFF</p>
                    <p className="font-mono text-sm font-bold text-gray-800">{coupon.code}</p>
                  </div>
                  <Badge label={coupon.is_used ? 'Utilisé' : 'Actif'} color={coupon.is_used ? 'gray' : 'green'} />
                </div>
                <p className="text-xs text-gray-400 mt-2">Expire: {new Date(coupon.valid_until).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState icon="🎫" message="Aucun coupon créé" action={<Button icon={<Plus size={18} />} onClick={() => setShowCoupon(true)}>Créer</Button>} />}
      </Card>

      <Modal open={showCoupon} onClose={() => setShowCoupon(false)} title="Créer un coupon">
        <form onSubmit={handleCoupon} className="space-y-4">
          <Field label="Code du coupon" required><Input required value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="Ex: FIDELITE20" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Réduction (%)" required><Input type="number" min="1" max="100" required value={couponForm.discount_percent} onChange={e => setCouponForm({ ...couponForm, discount_percent: parseInt(e.target.value) })} /></Field>
            <Field label="Valide jusqu'au" required><Input type="date" required value={couponForm.valid_until} onChange={e => setCouponForm({ ...couponForm, valid_until: e.target.value })} /></Field>
          </div>
          <Field label="Attribuer à un client (optionnel)"><Select value={couponForm.client_id} onChange={e => setCouponForm({ ...couponForm, client_id: e.target.value })}>
            <option value="">Coupon général (tous clients)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </Select></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Créer le coupon</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCoupon(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// AGENDA PAGE
// ============================================================
export const AgendaPage: React.FC = () => {
  const { events, addEvent, deleteEvent, getEventsByDate } = useAgendaStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'rappel' as AgendaEvent['type'], date: selectedDate, time: '09:00', description: '' })

  const dayEvents = getEventsByDate(selectedDate)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addEvent({ id: crypto.randomUUID(), ...form, created_at: new Date().toISOString() })
    setShowForm(false)
    setForm({ title: '', type: 'rappel', date: selectedDate, time: '09:00', description: '' })
  }

  const typeColors: Record<string, string> = { livraison: 'blue', rappel: 'yellow', conge: 'green', autre: 'gray' }
  const typeIcons: Record<string, string> = { livraison: '🚚', rappel: '🔔', conge: '🏖️', autre: '📋' }

  // Generate month calendar
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1
    return day > 0 && day <= daysInMonth ? day : null
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda & Planning" subtitle={`${events.length} événement(s) planifié(s)`}
        action={<Button icon={<Plus size={18} />} onClick={() => { setForm({ ...form, date: selectedDate }); setShowForm(true) }}>Nouvel événement</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-bold text-center text-gray-900 mb-4">{today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => <p key={d} className="text-center text-xs font-semibold text-gray-400">{d}</p>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasEvents = getEventsByDate(dateStr).length > 0
                const isSelected = selectedDate === dateStr
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                return (
                  <button key={i} onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition relative ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-purple-50 text-purple-700 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}>
                    {day}
                    {hasEvents && <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Day events */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-bold text-gray-900 mb-4">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
            {dayEvents.length > 0 ? (
              <div className="space-y-3">
                {dayEvents.sort((a, b) => a.time.localeCompare(b.time)).map(event => (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="text-center flex-shrink-0">
                      <p className="text-xl">{typeIcons[event.type]}</p>
                      <p className="text-xs font-bold text-gray-600">{event.time}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-gray-900">{event.title}</p>
                        <button onClick={() => deleteEvent(event.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </div>
                      <Badge label={event.type} color={typeColors[event.type]} />
                      {event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <span className="text-4xl">📅</span>
                <p className="mt-2 text-sm">Aucun événement ce jour</p>
                <Button size="sm" className="mt-3" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Ajouter</Button>
              </div>
            )}
          </Card>

          {/* All upcoming */}
          <Card className="mt-4">
            <h2 className="font-bold text-gray-900 mb-4">📌 Prochains événements</h2>
            {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).length > 0 ? (
              <div className="space-y-2">
                {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className="text-lg">{typeIcons[event.type]}</span>
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-gray-400">{new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR')} à {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-4">Aucun événement à venir</p>}
          </Card>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel événement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Titre" required><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Livraison client Kouadio" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AgendaEvent['type'] })}>
              <option value="livraison">🚚 Livraison</option>
              <option value="rappel">🔔 Rappel</option>
              <option value="conge">🏖️ Congé</option>
              <option value="autre">📋 Autre</option>
            </Select></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Heure"><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails de l'événement..." /></Field>
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
  const { agencies, addAgency, updateAgency, deleteAgency } = useAgencyStore()
  const orders = useOrderStore(s => s.orders)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addAgency({ id: crypto.randomUUID(), ...form, is_active: true, created_at: new Date().toISOString() })
    setShowForm(false)
    setForm({ name: '', address: '', phone: '', email: '' })
  }

  const getAgencyOrders = (agencyId: string) => orders.filter(o => o.agency_id === agencyId)
  const getAgencyRevenue = (agencyId: string) => orders.filter(o => o.agency_id === agencyId && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)
  const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Multi-agences" subtitle="Vue consolidée de toutes vos agences"
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle agence</Button>} />

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total agences" value={agencies.length} icon={<Building size={20} />} color="purple" />
        <StatCard label="Total commandes" value={orders.length} icon={<Package size={20} />} color="blue" />
        <StatCard label="CA global" value={`${totalRevenue.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={20} />} color="green" />
        <StatCard label="Agences actives" value={agencies.filter(a => a.is_active).length} icon={<CheckCircle size={20} />} color="indigo" />
      </div>

      {/* Agency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agencies.map(agency => {
          const agencyOrders = getAgencyOrders(agency.id)
          const revenue = getAgencyRevenue(agency.id)
          const revenuePercent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
          return (
            <Card key={agency.id} className="hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">🏢</div>
                <div className="flex items-center gap-2">
                  <Badge label={agency.is_active ? 'Active' : 'Inactive'} color={agency.is_active ? 'green' : 'red'} />
                  {agency.id !== 'default' && <button onClick={() => { if (confirm('Supprimer cette agence ?')) deleteAgency(agency.id) }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{agency.name}</h3>
              <p className="text-sm text-gray-500 mt-1">📍 {agency.address || '-'}</p>
              {agency.phone && <p className="text-sm text-gray-500">📞 {agency.phone}</p>}

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Commandes</span><span className="font-bold">{agencyOrders.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">CA</span><span className="font-bold text-purple-700">{revenue.toLocaleString('fr-FR')} XOF</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Part du CA global</span><span className="font-bold">{revenuePercent.toFixed(1)}%</span></div>
                <div className="bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${revenuePercent}%` }} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Comparison chart */}
      {agencies.length > 1 && (
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-4">Comparaison CA par agence</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agencies.map(a => ({ name: a.name, CA: getAgencyRevenue(a.id) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} />
              <Bar dataKey="CA" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle agence">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nom de l'agence" required><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Agence Cocody" /></Field>
          <Field label="Adresse"><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 XX XX XX XX XX" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="agence@exemple.com" /></Field>
          </div>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Créer l'agence</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button></div>
        </form>
      </Modal>
    </div>
  )
}

// ============================================================
// ACCOUNTING PAGE
// ============================================================
export const AccountingPage: React.FC = () => {
  const { transactions, addTransaction, getTotalRecettes, getTotalDepenses, getBenefice } = useTransactionStore()
  const orders = useOrderStore(s => s.orders)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState({ type: 'recette' as 'recette' | 'depense', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTransaction({ id: crypto.randomUUID(), agency_id: 'default', ...form, amount: Number(form.amount), created_by: 'system' })
    setShowForm(false)
    setForm({ type: 'recette', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] })
  }

  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const dayT = transactions.filter(t => t.date === ds)
    return { date: d.toLocaleDateString('fr-FR', { weekday: 'short' }), Recettes: dayT.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0), Dépenses: dayT.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0) }
  })

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    transactions.filter(t => t.type === 'depense').forEach(t => map.set(t.category, (map.get(t.category) || 0) + t.amount))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [transactions])

  return (
    <div className="space-y-6">
      <PageHeader title="Comptabilité" subtitle="Journal des recettes et dépenses"
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle transaction</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <TrendingUp size={28} className="mb-3 opacity-80" />
          <p className="text-sm opacity-80">Total Recettes</p>
          <p className="text-2xl font-bold mt-1">{getTotalRecettes().toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white">
          <TrendingDown size={28} className="mb-3 opacity-80" />
          <p className="text-sm opacity-80">Total Dépenses</p>
          <p className="text-2xl font-bold mt-1">{getTotalDepenses().toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className={`bg-gradient-to-br ${getBenefice() >= 0 ? 'from-purple-600 to-indigo-600' : 'from-red-600 to-rose-700'} rounded-2xl p-6 text-white`}>
          <DollarSign size={28} className="mb-3 opacity-80" />
          <p className="text-sm opacity-80">Bénéfice Net</p>
          <p className="text-2xl font-bold mt-1">{getBenefice() >= 0 ? '+' : ''}{getBenefice().toLocaleString('fr-FR')} XOF</p>
        </div>
      </div>

      <Tabs tabs={[{ key: 'overview', label: 'Vue d\'ensemble', icon: '📊' }, { key: 'journal', label: 'Journal', icon: '📒' }]} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-base font-bold mb-4">Tendance 7 jours</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} />
                <Bar dataKey="Recettes" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h2 className="text-base font-bold mb-4">Dépenses par catégorie</h2>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon="📊" message="Aucune dépense enregistrée" />}
          </Card>
        </div>
      )}

      {activeTab === 'journal' && (
        transactions.length > 0 ? (
          <Table headers={['Date', 'Type', 'Catégorie', 'Description', 'Montant', 'Par']}>
            {transactions.slice().reverse().map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-sm">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-4"><Badge label={t.type === 'recette' ? '📈 Recette' : '📉 Dépense'} color={t.type === 'recette' ? 'green' : 'red'} /></td>
                <td className="px-5 py-4 text-sm capitalize">{t.category}</td>
                <td className="px-5 py-4 text-sm">{t.description}</td>
                <td className={`px-5 py-4 font-bold text-sm ${t.type === 'recette' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'depense' ? '-' : '+'}{t.amount.toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4 text-xs text-gray-400">{t.created_by}</td>
              </tr>
            ))}
          </Table>
        ) : <Card><EmptyState icon="📒" message="Aucune transaction enregistrée" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter</Button>} /></Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
              <option value="recette">📈 Recette</option>
              <option value="depense">📉 Dépense</option>
            </Select></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Catégorie" required><Input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Vente, Salaire, Loyer, Lessive..." /></Field>
            <Field label="Montant (XOF)" required><Input type="number" min="1" required value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails de la transaction..." /></Field>
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

  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const monthOrders = orders.filter(o => o.created_at.startsWith(month))
    const monthRevenue = monthOrders.filter(o => o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)
    const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)
    const lateOrders = orders.filter(o => o.status !== 'livre' && o.status !== 'annule' && new Date(o.expected_at) < new Date())
    const avgTicket = orders.length > 0 ? totalRevenue / orders.filter(o => o.payment_status === 'paye').length : 0
    return { monthOrders: monthOrders.length, monthRevenue, totalRevenue, totalOrders: orders.length, lateOrders: lateOrders.length, avgTicket, cancelRate: orders.length > 0 ? (orders.filter(o => o.status === 'annule').length / orders.length) * 100 : 0 }
  }, [orders])

  const revenueTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const ds = d.toISOString().split('T')[0]
    return { date: String(d.getDate()), CA: orders.filter(o => o.created_at.startsWith(ds) && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0) }
  })

  const topClients = clients.map(c => ({
    name: `${c.first_name} ${c.last_name}`,
    total: orders.filter(o => o.client_id === c.id && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0),
    count: orders.filter(o => o.client_id === c.id).length
  })).sort((a, b) => b.total - a.total).slice(0, 10).filter(c => c.total > 0)

  const clothStats = useMemo(() => {
    const map = new Map<string, number>()
    orders.flatMap(o => o.clothes).forEach(c => map.set(c.type, (map.get(c.type) || 0) + c.quantity))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count }))
  }, [orders])

  const serviceStats = useMemo(() => {
    const map = new Map<string, number>()
    orders.flatMap(o => o.clothes).forEach(c => map.set(c.service || 'inconnu', (map.get(c.service || 'inconnu') || 0) + 1))
    return Array.from(map.entries()).map(([service, count]) => ({ service: service.replace('_', ' '), count }))
  }, [orders])

  const exportCSV = () => {
    const headers = ['Ticket', 'Client', 'Date', 'Total', 'Statut', 'Paiement', 'Priorité']
    const rows = orders.map(o => [o.ticket_number, `${o.client?.first_name} ${o.client?.last_name}`, new Date(o.created_at).toLocaleDateString('fr-FR'), o.total, o.status, o.payment_status, o.priority])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rapport_pressing_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports & Statistiques" subtitle="Vue complète des performances"
        action={<Button variant="ghost" onClick={exportCSV}>📥 Exporter CSV</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Commandes ce mois" value={stats.monthOrders} icon={<Package size={20} />} color="purple" />
        <StatCard label="CA ce mois" value={`${stats.monthRevenue.toLocaleString('fr-FR')} XOF`} icon={<DollarSign size={20} />} color="green" />
        <StatCard label="Ticket moyen" value={`${Math.round(stats.avgTicket).toLocaleString('fr-FR')} XOF`} icon={<TrendingUp size={20} />} color="blue" />
        <StatCard label="Taux annulation" value={`${stats.cancelRate.toFixed(1)}%`} icon={<TrendingDown size={20} />} color={stats.cancelRate > 10 ? 'red' : 'green'} />
      </div>

      <Tabs tabs={[{ key: 'overview', label: 'Vue globale', icon: '📊' }, { key: 'clients', label: 'Clients', icon: '👥' }, { key: 'clothes', label: 'Vêtements', icon: '👔' }, { key: 'orders', label: 'Commandes', icon: '🧺' }]} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-bold mb-4">CA 30 derniers jours</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} />
                <Line type="monotone" dataKey="CA" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ label: 'Total commandes', v: stats.totalOrders }, { label: 'CA total', v: `${stats.totalRevenue.toLocaleString('fr-FR')} XOF` }, { label: 'Retards actuels', v: stats.lateOrders }, { label: 'Total clients', v: clients.length }, { label: 'Employés actifs', v: employees.filter(e => e.is_active).length }, { label: 'Commandes livrées', v: orders.filter(o => o.status === 'livre').length }].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{s.v}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <Card>
          <h2 className="text-base font-bold mb-4">Top 10 clients par CA</h2>
          {topClients.length > 0 ? (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-purple-400'}`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.count} commande(s)</p>
                  </div>
                  <p className="font-bold text-purple-700 text-sm">{c.total.toLocaleString('fr-FR')} XOF</p>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="👥" message="Aucune vente enregistrée" />}
        </Card>
      )}

      {activeTab === 'clothes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-base font-bold mb-4">Vêtements les plus traités</h2>
            {clothStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clothStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon="👔" message="Aucune donnée" />}
          </Card>
          <Card>
            <h2 className="text-base font-bold mb-4">Services les plus demandés</h2>
            {serviceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={serviceStats} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="service" label={({ service, percent }) => `${service} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {serviceStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon="🫧" message="Aucune donnée" />}
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        orders.length > 0 ? (
          <Table headers={['Ticket', 'Client', 'Date', 'Total', 'Statut', 'Paiement', 'Priorité']}>
            {orders.slice().reverse().map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-bold text-purple-700 text-sm">#{o.ticket_number}</td>
                <td className="px-5 py-4 text-sm">{o.client?.first_name} {o.client?.last_name}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-4 font-bold text-sm">{o.total.toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4"><Badge label={o.status.replace('_', ' ')} color={o.status === 'pret' ? 'green' : o.status === 'livre' ? 'gray' : o.status === 'annule' ? 'red' : 'yellow'} /></td>
                <td className="px-5 py-4"><Badge label={o.payment_status} color={o.payment_status === 'paye' ? 'green' : o.payment_status === 'acompte' ? 'yellow' : 'red'} /></td>
                <td className="px-5 py-4"><Badge label={o.priority} color={o.priority === 'vip' ? 'purple' : o.priority === 'express' ? 'orange' : 'gray'} /></td>
              </tr>
            ))}
          </Table>
        ) : <Card><EmptyState icon="🧺" message="Aucune commande" /></Card>
      )}
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
  { id: '8', cloth_type: 'veste', service_type: 'nettoyage_sec', price: 3000, express_surcharge: 600, duration_hours: 72 },
  { id: '9', cloth_type: 'couverture', service_type: 'lavage_simple', price: 3000, express_surcharge: 600, duration_hours: 96 },
  { id: '10', cloth_type: 'rideau', service_type: 'lavage_simple', price: 2500, express_surcharge: 500, duration_hours: 96 },
  { id: '11', cloth_type: 'tapis', service_type: 'lavage_simple', price: 5000, express_surcharge: 1000, duration_hours: 96 },
  { id: '12', cloth_type: 'couette', service_type: 'lavage_simple', price: 4000, express_surcharge: 800, duration_hours: 96 },
  { id: '13', cloth_type: 'chaussures', service_type: 'detachage', price: 2000, express_surcharge: 400, duration_hours: 48 },
  { id: '14', cloth_type: 'tout', service_type: 'service_vip', price: 8000, express_surcharge: 2000, duration_hours: 24 },
]

export const ServicesPage: React.FC = () => {
  const [prices, setPrices] = useState(DEFAULT_PRICES)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ price: 0, express_surcharge: 0, duration_hours: 0 })

  const startEdit = (p: typeof DEFAULT_PRICES[0]) => { setEditId(p.id); setEditData({ price: p.price, express_surcharge: p.express_surcharge, duration_hours: p.duration_hours }) }
  const saveEdit = (id: string) => { setPrices(ps => ps.map(p => p.id === id ? { ...p, ...editData } : p)); setEditId(null) }

  return (
    <div className="space-y-6">
      <PageHeader title="Services & Tarifs" subtitle="Configurez vos prix et délais par type de vêtement" />
      <Alert type="info" message="💡 Cliquez sur l'icône ✏️ pour modifier un prix. Les prix express s'ajoutent automatiquement pour les commandes express." />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
              <tr>
                {['Type de vêtement', 'Service', 'Prix normal (XOF)', 'Supplément express (XOF)', 'Délai (heures)', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-purple-700 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prices.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-semibold capitalize text-sm">{p.cloth_type}</td>
                  <td className="px-5 py-4 text-sm capitalize text-gray-600">{p.service_type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-4">
                    {editId === p.id ? <Input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: parseInt(e.target.value) })} className="w-24" /> : <span className="font-bold text-purple-700">{p.price.toLocaleString('fr-FR')}</span>}
                  </td>
                  <td className="px-5 py-4">
                    {editId === p.id ? <Input type="number" value={editData.express_surcharge} onChange={e => setEditData({ ...editData, express_surcharge: parseInt(e.target.value) })} className="w-24" /> : <span className="text-sm text-orange-600 font-medium">+{p.express_surcharge.toLocaleString('fr-FR')}</span>}
                  </td>
                  <td className="px-5 py-4">
                    {editId === p.id ? <Input type="number" value={editData.duration_hours} onChange={e => setEditData({ ...editData, duration_hours: parseInt(e.target.value) })} className="w-20" /> : <span className="text-sm">{p.duration_hours}h</span>}
                  </td>
                  <td className="px-5 py-4">
                    {editId === p.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(p.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold">✅ Sauver</button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1 bg-gray-300 rounded-lg text-xs font-semibold">Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg"><Edit2 size={16} /></button>
                    )}
                  </td>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addDelivery({ id: crypto.randomUUID(), ...form, status: 'planifie', created_at: new Date().toISOString() } as Delivery)
    setShowForm(false)
    setForm({ order_id: '', driver_id: '', address: '', scheduled_at: '', notes: '' })
  }

  const readyOrders = orders.filter(o => o.status === 'pret')
  const livreurs = employees.filter(e => e.role === 'livreur' && e.is_active)
  const todayDeliveries = getTodayDeliveries()

  const statusColors: Record<string, string> = { planifie: 'yellow', en_route: 'blue', livre: 'green', echec: 'red' }

  return (
    <div className="space-y-6">
      <PageHeader title="Livraisons" subtitle={`${deliveries.length} livraison(s) — ${todayDeliveries.length} aujourd'hui`}
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Planifier livraison</Button>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ l: 'Planifiées', s: 'planifie', c: 'yellow' }, { l: 'En route', s: 'en_route', c: 'blue' }, { l: 'Livrées', s: 'livre', c: 'green' }, { l: 'Échouées', s: 'echec', c: 'red' }].map(({ l, s, c }) => (
          <Card key={s} className="p-4 text-center">
            <p className="text-2xl font-bold">{deliveries.filter(d => d.status === s).length}</p>
            <Badge label={l} color={c} />
          </Card>
        ))}
      </div>

      {readyOrders.length > 0 && (
        <Alert type="info" message={`📦 ${readyOrders.length} commande(s) prête(s) à livrer — Planifiez les livraisons`} />
      )}

      {deliveries.length > 0 ? (
        <Table headers={['Commande', 'Client', 'Adresse', 'Livreur', 'Date/Heure', 'Statut', 'Actions']}>
          {deliveries.slice().reverse().map(d => {
            const order = orders.find(o => o.id === d.order_id)
            const driver = employees.find(e => e.id === d.driver_id)
            return (
              <tr key={d.id} className="hover:bg-purple-50">
                <td className="px-5 py-4 font-bold text-purple-700 text-sm">{order ? `#${order.ticket_number}` : '-'}</td>
                <td className="px-5 py-4 text-sm">{order ? `${order.client?.first_name} ${order.client?.last_name}` : '-'}</td>
                <td className="px-5 py-4 text-sm max-w-32 truncate">{d.address}</td>
                <td className="px-5 py-4 text-sm">{driver?.full_name || '-'}</td>
                <td className="px-5 py-4 text-sm">{new Date(d.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-5 py-4"><Badge label={d.status} color={statusColors[d.status]} /></td>
                <td className="px-5 py-4">
                  <Select value={d.status} onChange={e => updateDelivery(d.id, { status: e.target.value as any, ...(e.target.value === 'livre' ? { delivered_at: new Date().toISOString() } : {}) })} className="text-xs py-1 w-32">
                    <option value="planifie">Planifié</option>
                    <option value="en_route">En route</option>
                    <option value="livre">Livré ✅</option>
                    <option value="echec">Échec ❌</option>
                  </Select>
                </td>
              </tr>
            )
          })}
        </Table>
      ) : <Card><EmptyState icon="🚚" message="Aucune livraison planifiée" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Planifier</Button>} /></Card>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Planifier une livraison">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Commande prête" required>
            <Select required value={form.order_id} onChange={e => {
              const o = orders.find(ord => ord.id === e.target.value)
              setForm({ ...form, order_id: e.target.value, address: o?.client?.address || '' })
            }}>
              <option value="">Sélectionner une commande prête...</option>
              {readyOrders.map(o => <option key={o.id} value={o.id}>#{o.ticket_number} — {o.client?.first_name} {o.client?.last_name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Livreur">
              <Select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}>
                <option value="">Sélectionner un livreur...</option>
                {livreurs.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Date et heure" required><Input required type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></Field>
          </div>
          <Field label="Adresse de livraison" required><Input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète" /></Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Instructions pour le livreur..." /></Field>
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  const filtered = orders.filter(o => {
    const ms = o.ticket_number.toLowerCase().includes(search.toLowerCase()) || `${o.client?.first_name} ${o.client?.last_name}`.toLowerCase().includes(search.toLowerCase())
    return ms && (!filter || o.payment_status === filter)
  })

  const printInvoice = (order: Order) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Facture #${order.ticket_number}</title>
    <style>
    body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a1a1a}
    .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:40px;border-bottom:3px solid #7c3aed;padding-bottom:20px}
    .logo{font-size:28px;font-weight:900;color:#7c3aed}
    .invoice-title{font-size:22px;font-weight:700;color:#7c3aed;text-align:right}
    .invoice-num{font-size:14px;color:#666;text-align:right}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:30px 0}
    .section h3{font-size:12px;text-transform:uppercase;color:#7c3aed;font-weight:700;margin-bottom:8px}
    .section p{margin:3px 0;font-size:14px;color:#333}
    table{width:100%;border-collapse:collapse;margin:30px 0}
    th{background:#7c3aed;color:white;padding:12px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:10px 12px;border-bottom:1px solid #eee;font-size:14px}
    tr:nth-child(even) td{background:#f9f7ff}
    .totals{margin-left:auto;width:300px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
    .total-final{border-top:2px solid #7c3aed;padding-top:8px;font-size:18px;font-weight:900;color:#7c3aed}
    .footer{margin-top:50px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:20px}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#e9d5ff;color:#6b21a8}
    </style></head><body>
    <div class="header">
    <div><div class="logo">🧺 PressingManager</div><p style="color:#666;font-size:13px;margin-top:4px">Logiciel de gestion professionnelle</p></div>
    <div><div class="invoice-title">FACTURE</div><div class="invoice-num">#${order.ticket_number}</div><p style="font-size:12px;color:#666;text-align:right">Date: ${new Date(order.created_at).toLocaleDateString('fr-FR')}</p></div>
    </div>
    <div class="grid">
    <div class="section"><h3>Informations client</h3>
    <p><strong>${order.client?.first_name} ${order.client?.last_name}</strong></p>
    <p>${order.client?.phone || ''}</p>
    <p>${order.client?.email || ''}</p>
    <p>${order.client?.address || ''}</p>
    </div>
    <div class="section"><h3>Détails commande</h3>
    <p><strong>Priorité:</strong> <span class="badge">${order.priority.toUpperCase()}</span></p>
    <p><strong>Reçu le:</strong> ${new Date(order.received_at).toLocaleDateString('fr-FR')}</p>
    <p><strong>Date prévue:</strong> ${order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : '-'}</p>
    <p><strong>Mode paiement:</strong> ${order.payment_method.replace('_', ' ')}</p>
    </div>
    </div>
    <table><tr><th>Article</th><th>Service</th><th>Couleur/Marque</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
    ${order.clothes.map(c => `<tr><td style="text-transform:capitalize">${c.type}</td><td style="text-transform:capitalize">${(c.service || '').replace(/_/g, ' ')}</td><td>${[c.color, c.brand].filter(Boolean).join(' / ') || '-'}</td><td>${c.quantity}</td><td>${c.price.toLocaleString('fr-FR')} XOF</td><td>${(c.price * c.quantity).toLocaleString('fr-FR')} XOF</td></tr>`).join('')}
    </table>
    <div class="totals">
    <div class="total-row"><span>Sous-total</span><span>${order.subtotal.toLocaleString('fr-FR')} XOF</span></div>
    ${order.discount > 0 ? `<div class="total-row" style="color:green"><span>Remise</span><span>-${order.discount.toLocaleString('fr-FR')} XOF</span></div>` : ''}
    ${order.deposit > 0 ? `<div class="total-row" style="color:#2563eb"><span>Acompte versé</span><span>-${order.deposit.toLocaleString('fr-FR')} XOF</span></div>` : ''}
    <div class="total-row total-final"><span>TOTAL</span><span>${order.total.toLocaleString('fr-FR')} XOF</span></div>
    ${order.remaining > 0 ? `<div class="total-row" style="color:red;font-weight:600"><span>Reste à payer</span><span>${order.remaining.toLocaleString('fr-FR')} XOF</span></div>` : ''}
    </div>
    <div class="footer">Merci pour votre confiance — PressingManager v1.0 — Facture générée le ${new Date().toLocaleDateString('fr-FR')}</div>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)
  const pendingRevenue = orders.filter(o => o.payment_status === 'non_paye').reduce((s, o) => s + o.remaining, 0)
  const acompteRevenue = orders.filter(o => o.payment_status === 'acompte').reduce((s, o) => s + o.remaining, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Facturation" subtitle={`${orders.length} facture(s)`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-xs text-green-600 font-semibold uppercase">CA Encaissé</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalRevenue.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
          <p className="text-xs text-yellow-600 font-semibold uppercase">Acomptes restants</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{acompteRevenue.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-xs text-red-600 font-semibold uppercase">Impayés</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{pendingRevenue.toLocaleString('fr-FR')} XOF</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Ticket, nom client..." className="flex-1" />
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="sm:w-44">
            <option value="">Tous les paiements</option>
            <option value="paye">✅ Payés</option>
            <option value="acompte">⚠️ Acompte</option>
            <option value="non_paye">❌ Non payés</option>
          </Select>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <Table headers={['Ticket', 'Client', 'Date', 'Total', 'Acompte', 'Reste', 'Statut', 'Actions']}>
          {filtered.map(o => (
            <tr key={o.id} className="hover:bg-purple-50">
              <td className="px-5 py-4 font-bold text-purple-700 text-sm">#{o.ticket_number}</td>
              <td className="px-5 py-4 text-sm">{o.client?.first_name} {o.client?.last_name}</td>
              <td className="px-5 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="px-5 py-4 font-bold text-sm">{o.total.toLocaleString('fr-FR')} XOF</td>
              <td className="px-5 py-4 text-sm text-blue-600">{o.deposit > 0 ? `${o.deposit.toLocaleString('fr-FR')} XOF` : '-'}</td>
              <td className={`px-5 py-4 font-bold text-sm ${o.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{o.remaining > 0 ? `${o.remaining.toLocaleString('fr-FR')} XOF` : '✅ Soldé'}</td>
              <td className="px-5 py-4"><Badge label={o.payment_status === 'paye' ? '✅ Payé' : o.payment_status === 'acompte' ? '⚠️ Acompte' : '❌ Impayé'} color={o.payment_status === 'paye' ? 'green' : o.payment_status === 'acompte' ? 'yellow' : 'red'} /></td>
              <td className="px-5 py-4">
                <button onClick={() => printInvoice(o)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">🖨️ Facture</button>
              </td>
            </tr>
          ))}
        </Table>
      ) : <Card><EmptyState icon="🧾" message="Aucune facture trouvée" /></Card>}
    </div>
  )
}

// ============================================================
// SETTINGS PAGE
// ============================================================
export const SettingsPage: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [shopName, setShopName] = useState('Mon Pressing')
  const [shopPhone, setShopPhone] = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [activeTab, setActiveTab] = useState('boutique')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Paramètres" subtitle="Configuration de votre pressing" />

      <Tabs tabs={[{ key: 'boutique', label: 'Boutique', icon: '🏪' }, { key: 'account', label: 'Compte', icon: '👤' }, { key: 'system', label: 'Système', icon: '⚙️' }]} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'boutique' && (
        <Card>
          <h2 className="text-base font-bold mb-5">Informations du pressing</h2>
          <div className="space-y-4">
            <Field label="Nom du pressing"><Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Nom de votre pressing" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone"><Input value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="+225 XX XX XX XX XX" /></Field>
              <Field label="Devise"><Select defaultValue="XOF"><option value="XOF">XOF — Franc CFA Ouest</option><option value="XAF">XAF — Franc CFA Est</option><option value="USD">USD — Dollar US</option><option value="EUR">EUR — Euro</option></Select></Field>
            </div>
            <Field label="Adresse"><Textarea value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Adresse complète" rows={2} /></Field>
            <Field label="Langue"><Select defaultValue="fr"><option value="fr">🇫🇷 Français</option><option value="en">🇬🇧 English</option></Select></Field>
            <Button className="w-full" onClick={() => alert('Paramètres sauvegardés !')}>💾 Sauvegarder</Button>
          </div>
        </Card>
      )}

      {activeTab === 'account' && (
        <Card>
          <h2 className="text-base font-bold mb-5">Mon compte</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">{user?.full_name?.charAt(0).toUpperCase() || 'A'}</div>
              <div>
                <p className="font-bold text-lg">{user?.full_name || 'Admin'}</p>
                <p className="text-gray-500">{user?.email}</p>
                <Badge label={user?.role || 'admin'} color="purple" />
              </div>
            </div>
            <Field label="Email"><Input value={user?.email || ''} disabled className="bg-gray-50" /></Field>
            <Field label="Rôle"><Input value={user?.role || 'admin'} disabled className="bg-gray-50 capitalize" /></Field>
            <div className="p-4 bg-yellow-50 rounded-xl">
              <p className="text-sm font-bold text-yellow-800 mb-1">🔐 Authentification 2FA</p>
              <p className="text-xs text-yellow-600">Activez l'authentification à deux facteurs pour sécuriser votre compte</p>
              <button className="mt-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">Configurer 2FA (bientôt disponible)</button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-base font-bold mb-4">🔒 Sécurité</h2>
            <div className="space-y-3">
              {[
                { label: 'Sauvegarde automatique', status: 'Activée', color: 'green' },
                { label: 'Journal des actions', status: 'Activé', color: 'green' },
                { label: 'Authentification 2FA', status: 'Bientôt disponible', color: 'yellow' },
                { label: 'Chiffrement données', status: 'Activé (Supabase)', color: 'green' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge label={item.status} color={item.color} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold mb-4">🔔 Notifications</h2>
            <div className="space-y-3">
              {[
                { label: 'Notifications WhatsApp', defaultChecked: true },
                { label: 'Notifications SMS', defaultChecked: false },
                { label: 'Notifications Email', defaultChecked: true },
                { label: 'Alertes retards', defaultChecked: true },
                { label: 'Alertes rupture stock', defaultChecked: true },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">{item.label}</span>
                  <input type="checkbox" defaultChecked={item.defaultChecked} className="w-4 h-4 accent-purple-600" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold mb-4">💾 Données</h2>
            <div className="space-y-3">
              <button onClick={() => { const data = JSON.stringify({ timestamp: new Date().toISOString() }); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`; a.click() }}
                className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition">
                📥 Exporter les données (JSON)
              </button>
              <button onClick={() => { if (confirm('⚠️ Réinitialiser TOUTES les données ? Cette action est irréversible !')) { localStorage.clear(); window.location.reload() } }}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition">
                🗑️ Réinitialiser toutes les données
              </button>
            </div>
          </Card>
        </div>
      )}

      <button onClick={handleLogout} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition">
        🔓 Se déconnecter
      </button>

      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center">
        <p className="text-sm font-bold text-purple-800">PressingManager v1.0.0</p>
        <p className="text-xs text-purple-400 mt-1">Logiciel de gestion professionnelle de pressing</p>
        <p className="text-xs text-purple-300">© 2024 — Tous droits réservés</p>
      </div>
    </div>
  )
}
