import React, { useState, useMemo, useEffect } from 'react'
import { useStockStore, useHRStore, useNotificationStore, useLoyaltyStore, useAgendaStore, useAgencyStore, useTransactionStore, useOrderStore, useClientStore, useDeliveryStore, useAuthStore, useShopConfig } from '../lib/store'
import { stockService, transactionService, notificationService, agendaService, employeeService, attendanceService, leaveService, servicePriceService } from '../lib/db'
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

  const stockValue = items.reduce((s, i) => s + (i.quantity * (i.purchase_price || 0)), 0)
  const categoriesCount = new Set(items.map(i => i.category)).size

  return (
    <div className="flex flex-col gap-space-xl">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
        <div className="flex flex-col gap-space-2xs">
          <span className="w-fit px-space-sm py-space-2xs rounded-full bg-primary/10 text-primary font-label-sm uppercase tracking-wider">Atelier &amp; Logistique</span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Gestion des Stocks &amp; Consommables</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Suivi en temps réel de vos produits et déclenchement d'alertes de réapprovisionnement.</p>
        </div>
        <div className="flex items-center flex-wrap gap-space-md">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-space-xs px-space-xl py-space-sm rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-[0_4px_16px_rgba(124,58,237,0.25)] hover:bg-primary transition-all active:scale-95">
            <Plus size={18} />
            <span>Ajouter un produit</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        <div className="bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Total Références</span>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{items.length}</span>
            <span className="font-label-sm text-label-sm text-outline">articles</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Alertes Rupture</span>
            {lowStock.length > 0 && <span className="px-space-sm py-space-2xs bg-error-container text-on-error-container font-label-sm text-label-sm rounded-full">Urgent</span>}
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className={`font-headline-xl text-headline-xl font-bold ${lowStock.length > 0 ? 'text-error' : 'text-on-surface'}`}>{lowStock.length}</span>
            <span className="font-label-sm text-label-sm text-outline">produit(s) critique(s)</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Valeur Stock</span>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{stockValue.toLocaleString('fr-FR')}</span>
            <span className="font-numeric-currency text-numeric-currency text-on-surface-variant">XOF</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-lg rounded-DEFAULT shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Catégories suivies</span>
            <div className="w-10 h-10 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>category</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{categoriesCount}</span>
            <span className="font-label-sm text-label-sm text-outline">famille(s)</span>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-surface-container-lowest p-space-md rounded-DEFAULT shadow-sm flex items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline pointer-events-none" style={{ fontSize: 20 }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
            className="w-full pl-11 pr-space-lg py-space-sm bg-surface-container text-on-surface font-body-md text-body-md rounded-full focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline" />
        </div>
      </div>

      {/* Tableau */}
      {filtered.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg font-bold">Produit</th>
                  <th className="py-space-md px-space-md font-bold">Catégorie</th>
                  <th className="py-space-md px-space-md font-bold min-w-[160px]">Disponibilité</th>
                  <th className="py-space-md px-space-md font-bold text-center">Seuil min</th>
                  <th className="py-space-md px-space-md font-bold text-right">Prix achat</th>
                  <th className="py-space-md px-space-md font-bold">Fournisseur</th>
                  <th className="py-space-md px-space-md font-bold text-center">Statut</th>
                  <th className="py-space-md px-space-lg font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md divide-y divide-surface-container">
                {filtered.map(item => {
                  const isCritical = item.quantity <= item.min_threshold
                  const gaugePct = Math.min(100, Math.round((item.quantity / Math.max(1, item.min_threshold * 3)) * 100))
                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-space-md px-space-lg">
                        <div className="flex items-center gap-space-md">
                          <div className="w-10 h-10 rounded-DEFAULT bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Package size={20} />
                          </div>
                          <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className="px-space-sm py-space-2xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm capitalize">{item.category.replace('_', ' ')}</span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col gap-space-2xs">
                          <span className={`font-label-md text-label-md font-bold ${isCritical ? 'text-error' : 'text-tertiary'}`}>{item.quantity} {item.unit}</span>
                          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                            <div className={`h-full rounded-full ${isCritical ? 'bg-error' : 'bg-tertiary'}`} style={{ width: `${gaugePct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md text-center font-label-md text-label-md text-on-surface font-medium">{item.min_threshold} {item.unit}</td>
                      <td className="py-space-md px-space-md text-right font-numeric-currency text-numeric-currency text-on-surface">{item.purchase_price.toLocaleString('fr-FR')} XOF</td>
                      <td className="py-space-md px-space-md">
                        <span className="font-body-sm text-body-sm text-on-surface">{item.supplier || '-'}</span>
                      </td>
                      <td className="py-space-md px-space-md text-center">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-error-container text-error font-label-sm text-label-sm font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-error" /> Rupture
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-tertiary-fixed text-tertiary font-label-sm text-label-sm font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" /> En stock
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-lg text-right">
                        <div className="flex items-center justify-end gap-space-2xs">
                          <button onClick={() => setShowMovement(item)} className="px-space-md py-space-2xs bg-surface-container text-primary rounded-full font-label-sm text-label-sm font-semibold hover:bg-primary-fixed transition-all">Mouvement</button>
                          <button onClick={async () => { if (confirm('Supprimer ?')) { try { await stockService.delete(item.id); setItems(items.filter(i => i.id !== item.id)) } catch { deleteItem(item.id) } } }} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-error-container hover:text-error transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
          <p className="font-body-md text-body-md text-outline mb-space-md">Aucun produit en stock</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all">
            <Plus size={18} /> Ajouter
          </button>
        </div>
      )}

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
          <Field label="Type"><Select value={mvt.type} onChange={e => setMvt({ ...mvt, type: e.target.value as any })}><option value="entree"> Entrée</option><option value="sortie"> Sortie</option></Select></Field>
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
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])

  const refreshAttendances = () => attendanceService.getAll().then(data => setAttendances(data as Attendance[])).catch(err => console.error('Erreur chargement pointage:', err))
  const refreshLeaves = () => leaveService.getAll().then(data => setLeaves(data as Leave[])).catch(err => console.error('Erreur chargement congés:', err))

  const addAttendance = async (att: Attendance) => { await attendanceService.create(att); refreshAttendances() }
  const addLeave = async (leave: Leave) => { await leaveService.create(leave); refreshLeaves() }
  const updateLeave = async (id: string, updates: Partial<Leave>) => { await leaveService.update(id, updates); refreshLeaves() }
  const getTodayAttendance = () => { const t = new Date().toISOString().split('T')[0]; return attendances.filter(a => a.date === t) }

  useEffect(() => { refreshAttendances(); refreshLeaves() }, [])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [activeTab, setActiveTab] = useState('employees')
  const [form, setForm] = useState({ full_name: '', role: 'laveur' as Employee['role'], phone: '', salary: 0, hire_date: '' })
  const [attForm, setAttForm] = useState({ employee_id: '', status: 'present' as Attendance['status'] })
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', type: 'conge' as Leave['type'], start_date: '', end_date: '', notes: '' })

  const refreshEmployees = () => {
    setLoadingEmployees(true)
    employeeService.getAll()
      .then(data => setEmployees(data as Employee[]))
      .catch(err => console.error('Erreur chargement employés:', err))
      .finally(() => setLoadingEmployees(false))
  }

  useEffect(() => { refreshEmployees() }, [])

  const toggleActive = async (emp: Employee) => {
    await employeeService.update(emp.id, { is_active: !emp.is_active })
    refreshEmployees()
  }

  const deleteEmployeeHandler = async (id: string) => {
    await employeeService.delete(id)
    refreshEmployees()
  }

  const handleApproveLeave = async (leave: Leave) => {
    updateLeave(leave.id, { status: 'approved' })
    const emp = employees.find(e => e.id === leave.employee_id)
    try {
      await agendaService.create({
        id: crypto.randomUUID(),
        title: `Congé — ${emp?.full_name || 'Employé'}`,
        type: 'conge',
        date: leave.start_date,
        time: '09:00',
        description: leave.end_date && leave.end_date !== leave.start_date
          ? `Du ${new Date(leave.start_date).toLocaleDateString('fr-FR')} au ${new Date(leave.end_date).toLocaleDateString('fr-FR')}${leave.notes ? ' — ' + leave.notes : ''}`
          : (leave.notes || ''),
        created_at: new Date().toISOString()
      })
    } catch (err) { console.error('Erreur création événement agenda:', err) }
  }

  const todayAtt = getTodayAttendance()
  const activeEmployees = employees.filter(e => e.is_active)
  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const totalSalaries = employees.filter(e => e.is_active).reduce((s, e) => s + e.salary, 0)
  const roleColors: Record<string, string> = { admin: 'purple', manager: 'blue', caissier: 'green', reception: 'cyan', laveur: 'orange', repasseur: 'yellow', livreur: 'indigo' }

  return (
    <div className="flex flex-col gap-space-xl">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Employés &amp; RH</span>
            <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Équipe &amp; Présences
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Gestion du personnel, suivi des pointages, congés et salaires.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-space-xs px-space-xl py-2.5 bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95 self-start md:self-auto">
          <Plus size={18} />
          <span>Nouvel employé</span>
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Employés actifs</span>
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-space-md">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{activeEmployees.length}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">Équipe enregistrée</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Présents aujourd'hui</span>
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{todayAtt.filter(a => a.status === 'present').length} <span className="text-outline text-title-sm font-normal">/ {activeEmployees.length}</span></span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Congés en attente</span>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-space-md">
            <span className="font-headline-xl text-headline-xl font-bold text-on-surface">{pendingLeaves.length}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">demande(s) à traiter</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Masse salariale</span>
            <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-numeric-currency text-headline-lg font-bold text-primary">{totalSalaries.toLocaleString('fr-FR')}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">XOF/mois</span>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-surface-container-low p-1.5 rounded-full flex items-center gap-1 self-start shadow-sm max-w-full overflow-x-auto">
        {[
          { key: 'employees', label: `Équipe (${employees.length})` },
          { key: 'attendance', label: 'Pointage' },
          { key: 'leaves', label: `Congés${pendingLeaves.length > 0 ? ` (${pendingLeaves.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-space-xl py-2 font-label-md text-label-md rounded-full transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
          {loadingEmployees && <p className="text-outline col-span-3">Chargement...</p>}
          {!loadingEmployees && employees.map(emp => (
            <div key={emp.id} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-center gap-space-md">
                    <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-headline-md font-bold text-headline-md shadow-sm">
                      {emp.full_name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{emp.full_name}</h3>
                      <span className="font-body-sm text-body-sm text-outline">#{emp.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(emp)} className={`px-2.5 py-1 font-label-sm text-label-sm rounded-full flex items-center gap-1 font-semibold ${emp.is_active ? 'bg-tertiary-fixed text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-tertiary' : 'bg-outline'}`} />
                    {emp.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
                <div className="mt-space-md flex flex-col gap-2">
                  <span className="inline-flex self-start px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold capitalize">{emp.role}</span>
                </div>
                <div className="mt-space-lg p-space-md bg-surface-container-low rounded-xl flex flex-col gap-2">
                  {emp.phone && (
                    <div className="flex items-center justify-between font-body-sm text-body-sm">
                      <span className="text-outline flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span> {emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-label-sm text-label-sm text-outline">Salaire fixe :</span>
                    <span className="font-numeric-currency text-body-md font-bold text-on-surface">{Number(emp.salary).toLocaleString('fr-FR')} XOF<span className="font-normal text-outline text-body-sm">/mois</span></span>
                  </div>
                  {emp.hire_date && (
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-outline">Depuis</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{new Date(emp.hire_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-space-lg pt-space-sm flex items-center justify-end">
                <button onClick={() => { if (confirm('Supprimer ?')) deleteEmployeeHandler(emp.id) }} className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-error-container flex items-center justify-center text-outline hover:text-error transition-all"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {!loadingEmployees && employees.length === 0 && (
            <div className="col-span-3 bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
              <p className="font-body-md text-body-md text-outline mb-space-md">Aucun employé</p>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all">
                <Plus size={18} /> Ajouter
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="flex flex-col gap-space-md">
          <div className="flex justify-end">
            <button onClick={() => setShowAttendance(true)} className="flex items-center gap-space-xs px-space-lg py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all">
              <Plus size={18} /> Enregistrer présence
            </button>
          </div>
          {todayAtt.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-space-md px-space-lg">Employé</th>
                    <th className="py-space-md px-space-md">Statut</th>
                    <th className="py-space-md px-space-md">Arrivée</th>
                    <th className="py-space-md px-space-md">Départ</th>
                    <th className="py-space-md px-space-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAtt.map(att => { const emp = employees.find(e => e.id === att.employee_id); return (
                    <tr key={att.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                      <td className="py-space-md px-space-lg font-label-md text-label-md text-on-surface font-semibold">{emp?.full_name || 'Inconnu'}</td>
                      <td className="py-space-md px-space-md">
                        <span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${att.status === 'present' ? 'bg-tertiary-fixed text-tertiary' : att.status === 'absent' ? 'bg-error-container text-error' : 'bg-[#fef3c7] text-[#b45309]'}`}>{att.status}</span>
                      </td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{new Date(att.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{att.check_out ? new Date(att.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-space-md px-space-lg text-right">{!att.check_out && <button onClick={async () => { await attendanceService.update(att.id, { check_out: new Date().toISOString() }); refreshAttendances() }} className="px-space-md py-space-2xs bg-surface-container text-primary rounded-full font-label-sm text-label-sm font-semibold hover:bg-primary-fixed transition-all">Enregistrer le départ</button>}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          ) : <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center font-body-md text-body-md text-outline">Aucun pointage aujourd'hui</div>}
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="flex flex-col gap-space-md">
          <div className="flex justify-end">
            <button onClick={() => setShowLeave(true)} className="flex items-center gap-space-xs px-space-lg py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all">
              <Plus size={18} /> Demande de congé
            </button>
          </div>
          {leaves.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-space-md px-space-lg">Employé</th>
                    <th className="py-space-md px-space-md">Type</th>
                    <th className="py-space-md px-space-md">Du</th>
                    <th className="py-space-md px-space-md">Au</th>
                    <th className="py-space-md px-space-md">Statut</th>
                    <th className="py-space-md px-space-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(leave => { const emp = employees.find(e => e.id === leave.employee_id); return (
                    <tr key={leave.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                      <td className="py-space-md px-space-lg font-label-md text-label-md text-on-surface font-semibold">{emp?.full_name || 'Inconnu'}</td>
                      <td className="py-space-md px-space-md"><span className="inline-flex px-space-sm py-space-2xs rounded-full bg-secondary-fixed text-secondary font-label-sm text-label-sm font-bold capitalize">{leave.type}</span></td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{new Date(leave.start_date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{new Date(leave.end_date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-space-md px-space-md"><span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${leave.status === 'approved' ? 'bg-tertiary-fixed text-tertiary' : leave.status === 'rejected' ? 'bg-error-container text-error' : 'bg-[#fef3c7] text-[#b45309]'}`}>{leave.status}</span></td>
                      <td className="py-space-md px-space-lg text-right">{leave.status === 'pending' && (
                        <div className="flex justify-end gap-space-2xs">
                          <button onClick={() => handleApproveLeave(leave)} className="w-8 h-8 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center hover:opacity-80 transition-all"><CheckCircle size={15} /></button>
                          <button onClick={() => updateLeave(leave.id, { status: 'rejected' })} className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center hover:opacity-80 transition-all"><Trash2 size={15} /></button>
                        </div>
                      )}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          ) : <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center font-body-md text-body-md text-outline">Aucune demande</div>}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel employé">
        <form onSubmit={async e => { e.preventDefault(); await employeeService.create({ ...form, salary: Number(form.salary), is_active: true }); refreshEmployees(); setShowForm(false); setForm({ full_name: '', role: 'laveur', phone: '', salary: 0, hire_date: '' }) }} className="space-y-4">
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
          <Field label="Statut"><Select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}><option value="present"> Présent</option><option value="absent"> Absent</option><option value="retard"> Retard</option><option value="conge"> Congé</option></Select></Field>
          <div className="flex gap-3"><Button type="submit" className="flex-1">Enregistrer</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAttendance(false)}>Annuler</Button></div>
        </form>
      </Modal>
      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Demande de congé">
        <form onSubmit={e => { e.preventDefault(); addLeave({ id: crypto.randomUUID(), ...leaveForm, status: 'pending' }); setShowLeave(false); setLeaveForm({ employee_id: '', type: 'conge', start_date: '', end_date: '', notes: '' }) }} className="space-y-4">
          <Field label="Employé" required><Select required value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}><option value="">Sélectionner...</option>{employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}><option value="conge"> Congé</option><option value="maladie">🏥 Maladie</option><option value="autre"> Autre</option></Select></Field>
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
    readyOrders.forEach(order => addNotification({ id: crypto.randomUUID(), client_id: order.client_id, client_name: `${order.client?.first_name} ${order.client?.last_name}`, client_phone: order.client?.phone || '', type: 'whatsapp', message: `Bonjour ${order.client?.first_name} !  Votre commande #${order.ticket_number} est prête. — PressingManager`, status: 'pending', created_at: new Date().toISOString() }))
    alert(` ${readyOrders.length} notification(s) préparée(s)`)
  }

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Notifications</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">{pendingCount} en attente, {sentCount} envoyée(s)</p>
        </div>
        <div className="flex items-center gap-space-sm">
          {readyOrders.length > 0 && (
            <button onClick={sendBulkReady} className="flex items-center gap-space-xs px-space-lg py-space-xs bg-tertiary-fixed text-tertiary font-label-md text-label-md rounded-full shadow-sm hover:opacity-90 transition-all">
              <Bell size={18} /> Notifier {readyOrders.length} client(s)
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-space-xs px-space-xl py-space-xs bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
            <Plus size={18} /> Nouvelle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg text-center">
          <p className="font-headline-xl text-headline-xl font-bold text-[#b45309]">{pendingCount}</p>
          <p className="font-label-sm text-label-sm text-outline mt-space-2xs">En attente</p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg text-center">
          <p className="font-headline-xl text-headline-xl font-bold text-tertiary">{sentCount}</p>
          <p className="font-label-sm text-label-sm text-outline mt-space-2xs">Envoyées</p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg text-center">
          <p className="font-headline-xl text-headline-xl font-bold text-error">{notifications.filter(n => n.status === 'failed').length}</p>
          <p className="font-label-sm text-label-sm text-outline mt-space-2xs">Échouées</p>
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg">Client</th>
                  <th className="py-space-md px-space-md">Téléphone</th>
                  <th className="py-space-md px-space-md">Canal</th>
                  <th className="py-space-md px-space-md">Message</th>
                  <th className="py-space-md px-space-md">Statut</th>
                  <th className="py-space-md px-space-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.slice().reverse().map(n => (
                  <tr key={n.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg font-label-md text-label-md text-on-surface font-semibold">{n.client_name}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{n.client_phone}</td>
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${n.type === 'whatsapp' ? 'bg-tertiary-fixed text-tertiary' : 'bg-secondary-fixed text-secondary'}`}>
                        {n.type === 'whatsapp' ? 'WhatsApp' : n.type === 'sms' ? 'SMS' : 'Email'}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-on-surface max-w-xs truncate">{n.message}</td>
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${n.status === 'sent' ? 'bg-tertiary-fixed text-tertiary' : n.status === 'failed' ? 'bg-error-container text-error' : 'bg-[#fef3c7] text-[#b45309]'}`}>{n.status}</span>
                    </td>
                    <td className="py-space-md px-space-lg text-right">{n.status === 'pending' && <button onClick={() => { window.open(n.type === 'whatsapp' ? `https://wa.me/${n.client_phone.replace(/\s/g,'')}?text=${encodeURIComponent(n.message)}` : `sms:${n.client_phone}`, '_blank'); updateNotification(n.id, { status: 'sent', sent_at: new Date().toISOString() }) }} className="px-space-md py-space-2xs bg-surface-container text-primary rounded-full font-label-sm text-label-sm font-semibold hover:bg-primary-fixed transition-all">Envoyer</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center font-body-md text-body-md text-outline">Aucune notification</div>}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle notification">
        <form onSubmit={e => { e.preventDefault(); const c = clients.find(cl => cl.id === form.client_id); if (!c) return; addNotification({ id: crypto.randomUUID(), client_id: c.id, client_name: `${c.first_name} ${c.last_name}`, client_phone: c.phone, type: form.type, message: form.message, status: 'pending', created_at: new Date().toISOString() }); setShowForm(false); setForm({ client_id: '', type: 'whatsapp', message: '' }) }} className="space-y-4">
          <Field label="Client" required><Select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}><option value="">Sélectionner...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</Select></Field>
          <Field label="Canal"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}><option value="whatsapp"> WhatsApp</option><option value="sms"> SMS</option><option value="email">📧 Email</option></Select></Field>
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
  const levelConfig = { bronze: { min: 0, max: 499, color: 'from-amber-700 to-amber-500', icon: '' }, silver: { min: 500, max: 1999, color: 'from-gray-500 to-gray-400', icon: '' }, gold: { min: 2000, max: 4999, color: 'from-yellow-500 to-yellow-400', icon: '' }, platinum: { min: 5000, max: Infinity, color: 'from-purple-600 to-indigo-500', icon: '' } }
  const clientsByLevel = useMemo(() => ({ bronze: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'bronze').length, silver: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'silver').length, gold: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'gold').length, platinum: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'platinum').length }), [clients])
  const topByPoints = [...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).slice(0, 10)

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Programme de Fidélité</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Points, niveaux et coupons</p>
        </div>
        <button onClick={() => setShowCoupon(true)} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
          <Plus size={18} /> Créer un coupon
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {Object.entries(levelConfig).map(([level, config]) => (
          <div key={level} className={`bg-gradient-to-br ${config.color} rounded-2xl p-space-lg text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-headline-xl text-headline-xl font-bold">{clientsByLevel[level as keyof typeof clientsByLevel]}</span>
            </div>
            <p className="font-label-lg text-label-lg font-bold capitalize">{level}</p>
            <p className="font-label-sm text-label-sm opacity-75 mt-space-2xs">{config.min === 0 ? '0' : config.min.toLocaleString()} — {config.max === Infinity ? '∞' : config.max.toLocaleString()} pts</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg lg:p-space-xl">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Classement fidélité</h2>
        {topByPoints.filter(c => c.loyalty_points > 0).length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {topByPoints.filter(c => c.loyalty_points > 0).map((c, i) => {
              const level = getLevelFromPoints(c.loyalty_points)
              return (
                <div key={c.id} className="flex items-center justify-between p-space-md bg-surface-container-low rounded-DEFAULT">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-8 h-8 bg-primary-fixed text-primary rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold">{i + 1}</span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface font-semibold">{c.first_name} {c.last_name}</p>
                      <p className="font-body-sm text-body-sm text-outline">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-numeric-currency text-numeric-currency font-bold text-primary">{c.loyalty_points} pts</p>
                    <p className="font-label-sm text-label-sm text-outline capitalize">{level}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-center py-space-xl font-body-md text-body-md text-outline">Aucun point attribué</p>}
      </div>

      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg lg:p-space-xl">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-lg">Coupons</h2>
        {coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {coupons.map(coupon => (
              <div key={coupon.id} className={`rounded-DEFAULT p-space-lg border-2 border-dashed ${coupon.is_used ? 'border-outline-variant bg-surface-container-low opacity-60' : 'border-primary bg-primary-fixed/30'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-headline-md text-headline-md font-bold text-primary">{coupon.discount_percent}% OFF</p>
                    <p className="font-mono font-body-sm text-body-sm font-bold text-on-surface">{coupon.code}</p>
                  </div>
                  <span className={`px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${coupon.is_used ? 'bg-surface-container text-outline' : 'bg-tertiary-fixed text-tertiary'}`}>{coupon.is_used ? 'Utilisé' : 'Actif'}</span>
                </div>
                <p className="font-body-sm text-body-sm text-outline mt-space-sm">Expire : {new Date(coupon.valid_until).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-space-xl">
            <p className="font-body-md text-body-md text-outline mb-space-md">Aucun coupon</p>
            <button onClick={() => setShowCoupon(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all">
              <Plus size={18} /> Créer
            </button>
          </div>
        )}
      </div>
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
  const typeIcons: Record<string,string> = { livraison: '', rappel: '', conge: '', autre: '' }
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
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Agenda &amp; Planning</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">{events.length} événement(s) — {orders.filter(o => o.expected_at && o.status !== 'annule').length} livraison(s) planifiée(s)</p>
        </div>
        <button onClick={() => { setForm({ ...form, date: selectedDate }); setShowForm(true) }} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
          <Plus size={18} /> Nouvel événement
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl">
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-space-md capitalize">{today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
          <div className="grid grid-cols-7 gap-1 mb-space-sm">{['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map(d => <p key={d} className="text-center font-label-sm text-label-sm font-semibold text-outline">{d}</p>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const hasOrders = daysWithOrders.has(dateStr)
              const hasEvents = daysWithEvents.has(dateStr)
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex flex-col items-center justify-center rounded-xl font-label-sm text-label-sm font-medium transition-all ${isSelected ? 'bg-primary text-on-primary' : isToday ? 'bg-primary-fixed text-primary font-bold' : 'hover:bg-surface-container'}`}>
                  {day}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasOrders && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-secondary'}`} />}
                    {hasEvents && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#f59e0b]'}`} />}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-space-md pt-space-md border-t border-surface-container flex flex-col gap-space-2xs">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline"><div className="w-2 h-2 rounded-full bg-secondary" /> Livraisons</div>
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Événements</div>
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md capitalize">{new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {dayOrders.length > 0 && (
              <div className="mb-space-md">
                <p className="font-label-sm text-label-sm font-bold text-secondary uppercase mb-space-sm">Livraisons prévues ({dayOrders.length})</p>
                <div className="flex flex-col gap-space-sm">
                  {dayOrders.map(order => (
                    <div key={order.id} className="flex items-center gap-space-sm p-space-md bg-secondary-fixed rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md text-label-md font-semibold text-secondary truncate">#{order.ticket_number} — {order.client?.first_name} {order.client?.last_name}</p>
                        <p className="font-body-sm text-body-sm text-secondary/80">{order.clothes.length} article(s) • {order.total.toLocaleString('fr-FR')} XOF {order.remaining > 0 ? `• Reste: ${order.remaining.toLocaleString('fr-FR')} XOF` : '• Soldé'}</p>
                      </div>
                      <span className={`px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-semibold flex-shrink-0 ${order.status === 'pret' ? 'bg-tertiary-fixed text-tertiary' : 'bg-[#fef3c7] text-[#b45309]'}`}>{order.status.replace('_',' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayEvents.length > 0 && (
              <div>
                <p className="font-label-sm text-label-sm font-bold text-outline uppercase mb-space-sm">Événements ({dayEvents.length})</p>
                <div className="flex flex-col gap-space-sm">
                  {dayEvents.sort((a,b) => a.time.localeCompare(b.time)).map(event => (
                    <div key={event.id} className="flex items-start gap-space-md p-space-md bg-surface-container-low rounded-xl">
                      <div className="text-center flex-shrink-0"><p className="font-label-sm text-label-sm font-bold text-on-surface">{event.time}</p></div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-label-md text-label-md font-semibold text-on-surface">{event.title}</p>
                          <button onClick={() => deleteEvent(event.id)} className="text-outline hover:text-error"><Trash2 size={14} /></button>
                        </div>
                        <span className="inline-flex px-space-sm py-space-2xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold mt-space-2xs capitalize">{event.type}</span>
                        {event.description && <p className="font-body-sm text-body-sm text-outline mt-space-2xs">{event.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dayOrders.length === 0 && dayEvents.length === 0 && (
              <div className="text-center py-space-xl">
                <p className="font-body-md text-body-md text-outline mb-space-md">Aucune livraison ni événement ce jour</p>
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-lg py-space-2xs bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-sm hover:bg-primary transition-all"><Plus size={14} /> Ajouter</button>
              </div>
            )}
          </div>
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md">Charge de travail — 7 prochains jours</h2>
            <div className="grid grid-cols-7 gap-space-sm">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i)
                const ds = d.toISOString().split('T')[0]
                const count = orders.filter(o => o.expected_at?.startsWith(ds) && o.status !== 'annule' && o.status !== 'livre').length
                const isSelected = ds === selectedDate
                const isSunday = d.getDay() === 0
                const level = isSunday ? 'ferme' : count === 0 ? 'libre' : count <= 3 ? 'calme' : count <= 7 ? 'charge' : 'plein'
                const colors: Record<string,string> = { ferme: 'bg-surface-container-high text-outline', libre: 'bg-surface-container text-on-surface-variant', calme: 'bg-tertiary-fixed text-tertiary', charge: 'bg-[#fef3c7] text-[#b45309]', plein: 'bg-error-container text-error' }
                return (
                  <button key={i} onClick={() => setSelectedDate(ds)} className={`p-space-sm rounded-xl text-center transition-all ${colors[level]} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                    <p className="font-label-sm text-label-sm font-semibold capitalize">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="font-body-sm text-body-sm">{d.getDate()}</p>
                    <p className="font-headline-md text-headline-md font-bold">{count}</p>
                    <p className="font-label-sm text-label-sm capitalize">{level}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel événement">
        <form onSubmit={e => { e.preventDefault(); addEvent({ id: crypto.randomUUID(), ...form, created_at: new Date().toISOString() }); setShowForm(false); setForm({ title: '', type: 'rappel', date: selectedDate, time: '09:00', description: '' }) }} className="space-y-4">
          <Field label="Titre" required><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AgendaEvent['type'] })}><option value="livraison"> Livraison</option><option value="rappel"> Rappel</option><option value="conge"> Congé</option><option value="autre"> Autre</option></Select></Field>
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
            <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl"></div><div className="flex gap-2"><Badge label={agency.is_active ? 'Active' : 'Inactive'} color={agency.is_active ? 'green' : 'red'} />{agency.id !== 'default' && <button onClick={() => { if (confirm('Supprimer ?')) deleteAgency(agency.id) }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>}</div></div>
            <h3 className="font-bold text-lg">{agency.name}</h3>
            <p className="text-sm text-gray-500"> {agency.address || '-'}</p>
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
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Comptabilité</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Journal des recettes et dépenses</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
          <Plus size={18} /> Nouvelle transaction
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Total Recettes</span><div className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center"><TrendingUp size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold text-tertiary mt-space-md">{getTotalRecettes().toLocaleString('fr-FR')} <span className="font-label-md text-label-md">XOF</span></p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Total Dépenses</span><div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center"><TrendingDown size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold text-error mt-space-md">{getTotalDepenses().toLocaleString('fr-FR')} <span className="font-label-md text-label-md">XOF</span></p>
        </div>
        <div className="bg-primary text-on-primary rounded-DEFAULT shadow-md p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm uppercase font-bold tracking-wider opacity-80">Bénéfice Net</span><div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"><DollarSign size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold mt-space-md">{benefice >= 0 ? '+' : ''}{benefice.toLocaleString('fr-FR')} <span className="font-label-md text-label-md">XOF</span></p>
        </div>
      </div>
      <div className="bg-surface-container-low p-1.5 rounded-full flex items-center gap-1 self-start shadow-sm">
        {[{ key: 'overview', label: "Vue d'ensemble" }, { key: 'journal', label: 'Journal' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-space-xl py-2 font-label-md text-label-md rounded-full transition-all ${activeTab === tab.key ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md">Tendance 7 jours</h2>
            <ResponsiveContainer width="100%" height={220}><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#eaedff" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /><Bar dataKey="Recettes" fill="#009368" radius={[4,4,0,0]} /><Bar dataKey="Dépenses" fill="#ba1a1a" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md">Dépenses par catégorie</h2>
            {byCategory.length > 0 ? <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{byCategory.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /></PieChart></ResponsiveContainer> : <p className="text-center py-space-xl font-body-md text-body-md text-outline">Aucune dépense</p>}
          </div>
        </div>
      )}
      {activeTab === 'journal' && (transactions.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider"><th className="py-space-md px-space-lg">Date</th><th className="py-space-md px-space-md">Type</th><th className="py-space-md px-space-md">Catégorie</th><th className="py-space-md px-space-md">Description</th><th className="py-space-md px-space-md">Montant</th><th className="py-space-md px-space-lg">Par</th></tr></thead>
              <tbody>
                {transactions.slice().reverse().map(t => (
                  <tr key={t.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg font-body-md text-body-md text-on-surface">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-space-md px-space-md"><span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${t.type === 'recette' ? 'bg-tertiary-fixed text-tertiary' : 'bg-error-container text-error'}`}>{t.type === 'recette' ? 'Recette' : 'Dépense'}</span></td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-on-surface capitalize">{t.category}</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline">{t.description}</td>
                    <td className={`py-space-md px-space-md font-numeric-currency text-numeric-currency font-bold ${t.type === 'recette' ? 'text-tertiary' : 'text-error'}`}>{t.type === 'depense' ? '-' : '+'}{t.amount.toLocaleString('fr-FR')} XOF</td>
                    <td className="py-space-md px-space-lg font-body-sm text-body-sm text-outline">{t.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
          <p className="font-body-md text-body-md text-outline mb-space-md">Aucune transaction</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all"><Plus size={18} /> Ajouter</button>
        </div>
      ))}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle transaction">
        <form onSubmit={e => { e.preventDefault(); transactionService.create({ id: crypto.randomUUID(), ...form, amount: Number(form.amount), created_by: 'system' }).then(tx => setTransactions([tx as Transaction, ...transactions])).catch(() => addTransaction({ id: crypto.randomUUID(), ...form, amount: Number(form.amount), created_by: 'system' })); setShowForm(false); setForm({ type: 'recette', category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}><option value="recette"> Recette</option><option value="depense">📉 Dépense</option></Select></Field>
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
  const [activeTab, setActiveTab] = useState('overview')
  const stats = useMemo(() => { const month = new Date().toISOString().slice(0,7); const monthOrders = orders.filter(o => o.created_at.startsWith(month)); const monthRevenue = monthOrders.filter(o => o.payment_status === 'paye').reduce((s,o) => s+o.total,0); const totalRevenue = orders.filter(o => o.payment_status === 'paye').reduce((s,o) => s+o.total,0); const avgTicket = orders.filter(o => o.payment_status === 'paye').length > 0 ? totalRevenue / orders.filter(o => o.payment_status === 'paye').length : 0; return { monthOrders: monthOrders.length, monthRevenue, totalRevenue, totalOrders: orders.length, lateOrders: orders.filter(o => o.status !== 'livre' && o.status !== 'annule' && new Date(o.expected_at) < new Date()).length, avgTicket, cancelRate: orders.length > 0 ? (orders.filter(o => o.status === 'annule').length / orders.length) * 100 : 0 } }, [orders])
  const revenueTrend = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29-i)); const ds = d.toISOString().split('T')[0]; return { date: String(d.getDate()), CA: orders.filter(o => o.created_at.startsWith(ds) && o.payment_status === 'paye').reduce((s,o) => s+o.total,0) } })
  const topClients = clients.map(c => ({ name: `${c.first_name} ${c.last_name}`, total: orders.filter(o => o.client_id === c.id && o.payment_status === 'paye').reduce((s,o) => s+o.total,0), count: orders.filter(o => o.client_id === c.id).length })).sort((a,b) => b.total - a.total).slice(0,10).filter(c => c.total > 0)
  const exportCSV = () => { const headers = ['Ticket','Client','Date','Total','Statut','Paiement']; const rows = orders.map(o => [o.ticket_number,`${o.client?.first_name} ${o.client?.last_name}`,new Date(o.created_at).toLocaleDateString('fr-FR'),o.total,o.status,o.payment_status]); const csv = [headers,...rows].map(r => r.join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `rapport_${new Date().toISOString().split('T')[0]}.csv`; a.click() }

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Rapports &amp; Statistiques</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Vue complète des performances</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-space-xs px-space-lg py-space-sm bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-full shadow-sm hover:bg-surface-container transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>file_download</span>
          Exporter CSV
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Commandes ce mois</span><div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center"><Package size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold text-on-surface mt-space-md">{stats.monthOrders}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">CA ce mois</span><div className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center"><DollarSign size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold text-tertiary mt-space-md">{stats.monthRevenue.toLocaleString('fr-FR')} <span className="font-label-md text-label-md">XOF</span></p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Ticket moyen</span><div className="w-10 h-10 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center"><TrendingUp size={20} /></div></div>
          <p className="font-headline-xl text-headline-xl font-bold text-on-surface mt-space-md">{Math.round(stats.avgTicket).toLocaleString('fr-FR')} <span className="font-label-md text-label-md">XOF</span></p>
        </div>
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline uppercase font-bold tracking-wider">Taux annulation</span><div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.cancelRate > 10 ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-tertiary'}`}><TrendingDown size={20} /></div></div>
          <p className={`font-headline-xl text-headline-xl font-bold mt-space-md ${stats.cancelRate > 10 ? 'text-error' : 'text-tertiary'}`}>{stats.cancelRate.toFixed(1)}%</p>
        </div>
      </div>
      <div className="bg-surface-container-low p-1.5 rounded-full flex items-center gap-1 self-start shadow-sm">
        {[{ key: 'overview', label: 'Vue globale' }, { key: 'clients', label: 'Clients' }, { key: 'orders', label: 'Commandes' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-space-xl py-2 font-label-md text-label-md rounded-full transition-all ${activeTab === tab.key ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md">CA 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={250}><LineChart data={revenueTrend}><CartesianGrid strokeDasharray="3 3" stroke="#eaedff" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => `${Number(v).toLocaleString('fr-FR')} XOF`} /><Line type="monotone" dataKey="CA" stroke="#630ed4" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </div>
      )}
      {activeTab === 'clients' && (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-md">Top 10 clients</h2>
          {topClients.length > 0 ? (
            <div className="flex flex-col gap-space-sm">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center gap-space-md p-space-md bg-surface-container-low rounded-DEFAULT">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold text-white ${i === 0 ? 'bg-[#eab308]' : i === 1 ? 'bg-outline' : i === 2 ? 'bg-[#b45309]' : 'bg-primary-container'}`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-on-surface font-semibold">{c.name}</p>
                    <p className="font-body-sm text-body-sm text-outline">{c.count} commande(s)</p>
                  </div>
                  <p className="font-numeric-currency text-numeric-currency font-bold text-primary">{c.total.toLocaleString('fr-FR')} XOF</p>
                </div>
              ))}
            </div>
          ) : <p className="text-center py-space-xl font-body-md text-body-md text-outline">Aucune vente</p>}
        </div>
      )}
      {activeTab === 'orders' && (orders.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider"><th className="py-space-md px-space-lg">Ticket</th><th className="py-space-md px-space-md">Client</th><th className="py-space-md px-space-md">Date</th><th className="py-space-md px-space-md">Total</th><th className="py-space-md px-space-md">Statut</th><th className="py-space-md px-space-lg">Paiement</th></tr></thead>
              <tbody>
                {orders.slice().reverse().map(o => (
                  <tr key={o.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg font-label-md text-label-md font-bold text-primary">#{o.ticket_number}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{o.client?.first_name} {o.client?.last_name}</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-space-md px-space-md font-numeric-currency text-numeric-currency font-bold text-on-surface">{o.total.toLocaleString('fr-FR')} XOF</td>
                    <td className="py-space-md px-space-md"><span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${o.status === 'pret' ? 'bg-tertiary-fixed text-tertiary' : o.status === 'livre' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-[#fef3c7] text-[#b45309]'}`}>{o.status.replace('_',' ').replace(/^./, c => c.toUpperCase())}</span></td>
                    <td className="py-space-md px-space-lg"><span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${o.payment_status === 'paye' ? 'bg-tertiary-fixed text-tertiary' : o.payment_status === 'acompte' ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-error-container text-error'}`}>{o.payment_status.replace('_',' ').replace(/^./, c => c.toUpperCase())}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center font-body-md text-body-md text-outline">Aucune commande</div>)}
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
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ price: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [newEntry, setNewEntry] = useState({ cloth_type: '', service_type: '', price: 0 })

  const loadPrices = async () => {
    setLoading(true)
    try {
      const data = await servicePriceService.getAll()
      if (data.length > 0) {
        setPrices(data)
      } else {
        // Aucun prix personnalisé encore — on initialise avec les valeurs par défaut
        setPrices(DEFAULT_PRICES.map(p => ({ ...p, id: `${p.cloth_type}-${p.service_type}` })))
      }
    } catch (err) {
      console.error('Erreur chargement prix:', err)
      setPrices(DEFAULT_PRICES.map(p => ({ ...p, id: `${p.cloth_type}-${p.service_type}` })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrices() }, [])

  const handleSave = async (p: any) => {
    try {
      await servicePriceService.upsert(p.cloth_type, p.service_type, editData.price)
      setPrices(ps => ps.map(pp => pp.id === p.id ? { ...pp, price: editData.price } : pp))
    } catch (err) {
      alert('Erreur lors de la sauvegarde du prix')
    }
    setEditId(null)
  }

  const handleAdd = async () => {
    const clothType = newEntry.cloth_type.trim().toLowerCase()
    const serviceType = newEntry.service_type.trim().toLowerCase()
    if (!clothType || !serviceType || !newEntry.price) { alert('Remplissez tous les champs'); return }
    try {
      const saved = await servicePriceService.upsert(clothType, serviceType, newEntry.price)
      setPrices(ps => [...ps.filter(p => !(p.cloth_type === clothType && p.service_type === serviceType)), saved])
      setNewEntry({ cloth_type: '', service_type: '', price: 0 })
      setShowAdd(false)
    } catch (err) {
      alert('Erreur lors de l\'ajout')
    }
  }

  const handleDelete = async (p: any) => {
    if (!confirm(`Supprimer "${p.cloth_type} / ${p.service_type.replace(/_/g,' ')}" ?`)) return
    try {
      // Les tarifs par défaut n'ont pas de vrai id Supabase — suppression locale uniquement pour eux
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(p.id)) {
        setPrices(ps => ps.filter(pp => pp.id !== p.id))
        return
      }
      await servicePriceService.delete(p.id)
      setPrices(ps => ps.filter(pp => pp.id !== p.id))
    } catch (err) {
      alert('Erreur lors de la suppression')
    }
  }

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Services &amp; Tarifs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">Configurez vos prix — appliqués directement dans les commandes</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
          <Plus size={18} /> Ajouter un tarif
        </button>
      </div>
      <div className="p-space-lg bg-primary/10 rounded-DEFAULT font-body-sm text-body-sm text-primary">
        Cliquez sur l'icône pour modifier un prix. Ajoutez vos propres types de vêtements et services — ils apparaîtront automatiquement dans les commandes.
      </div>
      {showAdd && (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg grid grid-cols-1 sm:grid-cols-4 gap-space-md items-end">
          <Field label="Type de vêtement">
            <Input value={newEntry.cloth_type} onChange={e => setNewEntry({ ...newEntry, cloth_type: e.target.value })} placeholder="Ex: ensemble militaire" />
          </Field>
          <Field label="Service">
            <Input value={newEntry.service_type} onChange={e => setNewEntry({ ...newEntry, service_type: e.target.value })} placeholder="Ex: nettoyage sec" />
          </Field>
          <Field label="Prix (XOF)">
            <Input type="number" min="0" value={newEntry.price} onChange={e => setNewEntry({ ...newEntry, price: Math.max(0, parseInt(e.target.value) || 0) })} />
          </Field>
          <div className="flex gap-space-sm">
            <Button onClick={handleAdd} className="flex-1">Ajouter</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Button>
          </div>
        </div>
      )}
      {loading ? <p className="font-body-md text-body-md text-outline">Chargement...</p> : (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg">Type</th>
                  <th className="py-space-md px-space-md">Service</th>
                  <th className="py-space-md px-space-md">Prix (XOF)</th>
                  <th className="py-space-md px-space-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prices.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg font-label-md text-label-md text-on-surface font-semibold capitalize">{p.cloth_type}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant capitalize">{p.service_type.replace(/_/g,' ')}</td>
                    <td className="py-space-md px-space-md">
                      {editId === p.id
                        ? <Input type="number" min="0" value={editData.price} onChange={e => setEditData({ price: Math.max(0, parseInt(e.target.value) || 0) })} className="w-28" />
                        : <span className="font-numeric-currency text-numeric-currency font-bold text-primary">{p.price.toLocaleString('fr-FR')}</span>}
                    </td>
                    <td className="py-space-md px-space-lg text-right">
                      {editId === p.id ? (
                        <div className="flex justify-end gap-space-2xs">
                          <button onClick={() => handleSave(p)} className="px-space-md py-space-2xs bg-tertiary-fixed text-tertiary rounded-full font-label-sm text-label-sm font-semibold">Sauver</button>
                          <button onClick={() => setEditId(null)} className="px-space-md py-space-2xs bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm font-semibold">Annuler</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-space-2xs">
                          <button onClick={() => { setEditId(p.id); setEditData({ price: p.price }) }} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-primary transition-all"><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-error-container hover:text-error transition-all"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// DELIVERY PAGE
// ============================================================
export const DeliveryPage: React.FC = () => {
  const { deliveries, addDelivery, updateDelivery, getTodayDeliveries } = useDeliveryStore()
  const orders = useOrderStore(s => s.orders)
  const [employees, setEmployees] = useState<Employee[]>([])
  useEffect(() => {
    employeeService.getAll().then(data => setEmployees(data as Employee[])).catch(err => console.error('Erreur chargement employés:', err))
  }, [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ order_id: '', driver_id: '', address: '', scheduled_at: '', notes: '' })
  const readyOrders = orders.filter(o => o.status === 'pret')
  const livreurs = employees.filter(e => e.role === 'livreur' && e.is_active)
  const todayDeliveries = getTodayDeliveries()
  const statusColors: Record<string,string> = { planifie: 'yellow', en_route: 'blue', livre: 'green', echec: 'red' }

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">Livraisons</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-2xs">{deliveries.length} livraison(s) — {todayDeliveries.length} aujourd'hui</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-full shadow-md hover:bg-primary transition-all active:scale-95">
          <Plus size={18} /> Planifier livraison
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
        {[
          { l: 'Planifiées', s: 'planifie', bg: 'bg-[#fef3c7]', text: 'text-[#b45309]' },
          { l: 'En route', s: 'en_route', bg: 'bg-secondary-fixed', text: 'text-secondary' },
          { l: 'Livrées', s: 'livre', bg: 'bg-tertiary-fixed', text: 'text-tertiary' },
          { l: 'Échouées', s: 'echec', bg: 'bg-error-container', text: 'text-error' },
        ].map(({ l, s, bg, text }) => (
          <div key={s} className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-lg text-center">
            <p className="font-headline-xl text-headline-xl font-bold text-on-surface">{deliveries.filter(d => d.status === s).length}</p>
            <span className={`inline-flex mt-space-sm px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${bg} ${text}`}>{l}</span>
          </div>
        ))}
      </div>
      {readyOrders.length > 0 && (
        <div className="p-space-lg bg-primary/10 rounded-DEFAULT font-body-sm text-body-sm text-primary">
          {readyOrders.length} commande(s) prête(s) à livrer
        </div>
      )}
      {deliveries.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-space-md px-space-lg">Commande</th>
                  <th className="py-space-md px-space-md">Client</th>
                  <th className="py-space-md px-space-md">Adresse</th>
                  <th className="py-space-md px-space-md">Livreur</th>
                  <th className="py-space-md px-space-md">Date/Heure</th>
                  <th className="py-space-md px-space-md">Statut</th>
                  <th className="py-space-md px-space-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice().reverse().map(d => { const order = orders.find(o => o.id === d.order_id); const driver = employees.find(e => e.id === d.driver_id); return (
                  <tr key={d.id} className="hover:bg-surface-container-low/40 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg font-label-md text-label-md font-bold text-primary">{order ? `#${order.ticket_number}` : '-'}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{order ? `${order.client?.first_name} ${order.client?.last_name}` : '-'}</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline max-w-32 truncate">{d.address}</td>
                    <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface">{driver?.full_name || '-'}</td>
                    <td className="py-space-md px-space-md font-body-sm text-body-sm text-outline">{new Date(d.scheduled_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
                    <td className="py-space-md px-space-md">
                      <span className={`inline-flex px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ${d.status === 'livre' ? 'bg-tertiary-fixed text-tertiary' : d.status === 'echec' ? 'bg-error-container text-error' : d.status === 'en_route' ? 'bg-secondary-fixed text-secondary' : 'bg-[#fef3c7] text-[#b45309]'}`}>
                        {d.status.replace('_',' ').replace(/^./, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="py-space-md px-space-lg">
                      <select value={d.status} onChange={e => updateDelivery(d.id, { status: e.target.value as any, ...(e.target.value === 'livre' ? { delivered_at: new Date().toISOString() } : {}) })}
                        className="text-xs py-1.5 px-space-sm bg-surface-container-low rounded-full font-label-sm text-label-sm text-on-surface focus:outline-none">
                        <option value="planifie">Planifié</option>
                        <option value="en_route">En route</option>
                        <option value="livre">Livré</option>
                        <option value="echec">Échec</option>
                      </select>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-sm p-space-3xl text-center">
          <p className="font-body-md text-body-md text-outline mb-space-md">Aucune livraison</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-space-xs px-space-xl py-space-sm bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary transition-all"><Plus size={18} /> Planifier</button>
        </div>
      )}
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
        ${config.logo ? `<img src="${config.logo}" alt="logo" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : '<h1 style="color:#7c3aed;margin:0"></h1>'}
        <h1 style="color:#7c3aed;margin:0">${config.name || 'PressingManager'}</h1>
        ${config.slogan ? `<p style="color:#666;font-size:13px;margin-top:4px">${config.slogan}</p>` : ''}
        ${config.phone ? `<p style="color:#666;font-size:12px"> ${config.phone}</p>` : ''}
        ${config.address ? `<p style="color:#666;font-size:12px"> ${config.address}</p>` : ''}
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
      <Card className="p-4"><div className="flex gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Ticket, nom client..." className="flex-1" /><Select value={filter} onChange={e => setFilter(e.target.value)} className="w-44"><option value="">Tous</option><option value="paye"> Payés</option><option value="acompte"> Acompte</option><option value="non_paye"> Non payés</option></Select></div></Card>
      {filtered.length > 0 ? (
        <Table headers={['Ticket','Client','Date','Total','Reste','Statut','Actions']}>
          {filtered.map(o => <tr key={o.id} className="hover:bg-purple-50"><td className="px-5 py-4 font-bold text-purple-700 text-sm">#{o.ticket_number}</td><td className="px-5 py-4 text-sm">{o.client?.first_name} {o.client?.last_name}</td><td className="px-5 py-4 text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4 font-bold text-sm">{o.total.toLocaleString('fr-FR')} XOF</td><td className={`px-5 py-4 font-bold text-sm ${o.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{o.remaining > 0 ? `${o.remaining.toLocaleString('fr-FR')} XOF` : ' Soldé'}</td><td className="px-5 py-4"><Badge label={o.payment_status === 'paye' ? ' Payé' : o.payment_status === 'acompte' ? ' Acompte' : ' Impayé'} color={o.payment_status === 'paye' ? 'green' : o.payment_status === 'acompte' ? 'yellow' : 'red'} /></td><td className="px-5 py-4"><button onClick={() => printInvoice(o)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">🖨️ Facture</button></td></tr>)}
        </Table>
      ) : <Card><EmptyState icon="" message="Aucune facture trouvée" /></Card>}
    </div>
  )
}
