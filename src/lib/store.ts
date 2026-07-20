import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Agency, Client, Order, Cloth, StockItem, StockMovement, Employee, Attendance, Leave, Delivery, Transaction, Notification, LoyaltyCard, Coupon, AgendaEvent, CashSession, CashTransaction } from '../types'

// AUTH
interface AuthStore {
  user: User | null; session: any | null; agency: Agency | null
  setUser: (u: User | null) => void; setSession: (s: any) => void
  setAgency: (a: Agency | null) => void; logout: () => void
}
export const useAuthStore = create<AuthStore>((set) => ({
  user: null, session: null, agency: null,
  setUser: (user) => set({ user }), setSession: (session) => set({ session }),
  setAgency: (agency) => set({ agency }), logout: () => set({ user: null, session: null, agency: null })
}))

// AGENCIES
interface AgencyStore {
  agencies: Agency[]
  addAgency: (a: Agency) => void; updateAgency: (id: string, d: Partial<Agency>) => void
  deleteAgency: (id: string) => void
}
export const useAgencyStore = create<AgencyStore>()(persist((set) => ({
  agencies: [{ id: 'default', name: 'Agence Principale', address: 'Abidjan', phone: '', email: '', is_active: true, created_at: new Date().toISOString() }],
  addAgency: (a) => set(s => ({ agencies: [...s.agencies, a] })),
  updateAgency: (id, d) => set(s => ({ agencies: s.agencies.map(a => a.id === id ? { ...a, ...d } : a) })),
  deleteAgency: (id) => set(s => ({ agencies: s.agencies.filter(a => a.id !== id) }))
}), { name: 'pm-agencies' }))

// CLIENTS
interface ClientStore {
  clients: Client[]
  addClient: (c: Client) => void; updateClient: (id: string, d: Partial<Client>) => void
  deleteClient: (id: string) => void; searchClients: (q: string) => Client[]
  getClientById: (id: string) => Client | undefined
  addLoyaltyPoints: (id: string, points: number) => void
}
export const useClientStore = create<ClientStore>()(persist((set, get) => ({
  clients: [],
  addClient: (c) => set(s => ({ clients: [...s.clients, c] })),
  updateClient: (id, d) => set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...d } : c) })),
  deleteClient: (id) => set(s => ({ clients: s.clients.filter(c => c.id !== id) })),
  searchClients: (q) => get().clients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q) || c.email.toLowerCase().includes(q.toLowerCase())
  ),
  getClientById: (id) => get().clients.find(c => c.id === id),
  addLoyaltyPoints: (id, points) => set(s => ({
    clients: s.clients.map(c => c.id === id ? { ...c, loyalty_points: c.loyalty_points + points } : c)
  }))
}), { name: 'pm-clients' }))

// ORDERS
interface OrderStore {
  orders: Order[]
  addOrder: (o: Order) => void; updateOrder: (id: string, d: Partial<Order>) => void
  deleteOrder: (id: string) => void; getOrderById: (id: string) => Order | undefined
  getTodayOrders: () => Order[]; getOrdersByStatus: (s: Order['status']) => Order[]
  getLateOrders: () => Order[]; getTodayRevenue: () => number; getMonthRevenue: () => number
}
export const useOrderStore = create<OrderStore>()(persist((set, get) => ({
  orders: [],
  addOrder: (o) => set(s => ({ orders: [...s.orders, o] })),
  updateOrder: (id, d) => set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...d } : o) })),
  deleteOrder: (id) => set(s => ({ orders: s.orders.filter(o => o.id !== id) })),
  getOrderById: (id) => get().orders.find(o => o.id === id),
  getTodayOrders: () => { const t = new Date().toISOString().split('T')[0]; return get().orders.filter(o => o.created_at.startsWith(t)) },
  getOrdersByStatus: (status) => get().orders.filter(o => o.status === status),
  getLateOrders: () => { const now = new Date(); return get().orders.filter(o => o.status !== 'livre' && o.status !== 'annule' && new Date(o.expected_at) < now) },
  getTodayRevenue: () => { const t = new Date().toISOString().split('T')[0]; return get().orders.filter(o => o.created_at.startsWith(t) && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0) },
  getMonthRevenue: () => { const m = new Date().toISOString().slice(0, 7); return get().orders.filter(o => o.created_at.startsWith(m) && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0) }
}), { name: 'pm-orders' }))

// CASH
interface CashStore {
  sessions: CashSession[]; cashTransactions: CashTransaction[]
  addSession: (s: CashSession) => void; updateSession: (id: string, d: Partial<CashSession>) => void
  addCashTransaction: (t: CashTransaction) => void
  getCurrentSession: () => CashSession | undefined
}
export const useCashStore = create<CashStore>()(persist((set, get) => ({
  sessions: [], cashTransactions: [],
  addSession: (s) => set(st => ({ sessions: [...st.sessions, s] })),
  updateSession: (id, d) => set(s => ({ sessions: s.sessions.map(x => x.id === id ? { ...x, ...d } : x) })),
  addCashTransaction: (t) => set(s => ({ cashTransactions: [...s.cashTransactions, t] })),
  getCurrentSession: () => get().sessions.find(s => s.status === 'open')
}), { name: 'pm-cash' }))

// STOCK
interface StockStore {
  items: StockItem[]; movements: StockMovement[]
  addItem: (i: StockItem) => void; updateItem: (id: string, d: Partial<StockItem>) => void
  deleteItem: (id: string) => void; addMovement: (m: StockMovement) => void
  getLowStockItems: () => StockItem[]
}
export const useStockStore = create<StockStore>()(persist((set, get) => ({
  items: [], movements: [],
  addItem: (i) => set(s => ({ items: [...s.items, i] })),
  updateItem: (id, d) => set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...d } : i) })),
  deleteItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
  addMovement: (m) => {
    const item = get().items.find(i => i.id === m.stock_item_id)
    if (item) {
      const newQty = m.type === 'entree' ? item.quantity + m.quantity : item.quantity - m.quantity
      set(s => ({ movements: [...s.movements, m], items: s.items.map(i => i.id === m.stock_item_id ? { ...i, quantity: newQty } : i) }))
    }
  },
  getLowStockItems: () => get().items.filter(i => i.quantity <= i.min_threshold)
}), { name: 'pm-stock' }))

// HR
interface HRStore {
  employees: Employee[]; attendances: Attendance[]; leaves: Leave[]
  addEmployee: (e: Employee) => void; updateEmployee: (id: string, d: Partial<Employee>) => void
  deleteEmployee: (id: string) => void; addAttendance: (a: Attendance) => void
  addLeave: (l: Leave) => void; updateLeave: (id: string, d: Partial<Leave>) => void
  getTodayAttendance: () => Attendance[]
}
export const useHRStore = create<HRStore>()(persist((set, get) => ({
  employees: [], attendances: [], leaves: [],
  addEmployee: (e) => set(s => ({ employees: [...s.employees, e] })),
  updateEmployee: (id, d) => set(s => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...d } : e) })),
  deleteEmployee: (id) => set(s => ({ employees: s.employees.filter(e => e.id !== id) })),
  addAttendance: (a) => set(s => ({ attendances: [...s.attendances, a] })),
  addLeave: (l) => set(s => ({ leaves: [...s.leaves, l] })),
  updateLeave: (id, d) => set(s => ({ leaves: s.leaves.map(l => l.id === id ? { ...l, ...d } : l) })),
  getTodayAttendance: () => { const t = new Date().toISOString().split('T')[0]; return get().attendances.filter(a => a.date === t) }
}), { name: 'pm-hr' }))

// DELIVERY
interface DeliveryStore {
  deliveries: Delivery[]
  addDelivery: (d: Delivery) => void; updateDelivery: (id: string, d: Partial<Delivery>) => void
  getTodayDeliveries: () => Delivery[]
}
export const useDeliveryStore = create<DeliveryStore>()(persist((set, get) => ({
  deliveries: [],
  addDelivery: (d) => set(s => ({ deliveries: [...s.deliveries, d] })),
  updateDelivery: (id, d) => set(s => ({ deliveries: s.deliveries.map(x => x.id === id ? { ...x, ...d } : x) })),
  getTodayDeliveries: () => { const t = new Date().toISOString().split('T')[0]; return get().deliveries.filter(d => d.scheduled_at.startsWith(t)) }
}), { name: 'pm-deliveries' }))

// TRANSACTIONS
interface TransactionStore {
  transactions: Transaction[]
  addTransaction: (t: Transaction) => void
  getTotalRecettes: () => number; getTotalDepenses: () => number; getBenefice: () => number
  getMonthTransactions: () => Transaction[]
}
export const useTransactionStore = create<TransactionStore>()(persist((set, get) => ({
  transactions: [],
  addTransaction: (t) => set(s => ({ transactions: [...s.transactions, t] })),
  getMonthTransactions: () => { const m = new Date().toISOString().slice(0, 7); return get().transactions.filter(t => t.date.startsWith(m)) },
  getTotalRecettes: () => get().transactions.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0),
  getTotalDepenses: () => get().transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0),
  getBenefice: () => get().transactions.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0) - get().transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0)
}), { name: 'pm-transactions' }))

// NOTIFICATIONS
interface NotificationStore {
  notifications: Notification[]
  addNotification: (n: Notification) => void; updateNotification: (id: string, d: Partial<Notification>) => void
  getPendingNotifications: () => Notification[]
}
export const useNotificationStore = create<NotificationStore>()(persist((set, get) => ({
  notifications: [],
  addNotification: (n) => set(s => ({ notifications: [...s.notifications, n] })),
  updateNotification: (id, d) => set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, ...d } : n) })),
  getPendingNotifications: () => get().notifications.filter(n => n.status === 'pending')
}), { name: 'pm-notifications' }))

// LOYALTY
interface LoyaltyStore {
  cards: LoyaltyCard[]; coupons: Coupon[]
  addCard: (c: LoyaltyCard) => void; updateCard: (id: string, d: Partial<LoyaltyCard>) => void
  addCoupon: (c: Coupon) => void; useCoupon: (code: string) => boolean
  getCardByClient: (clientId: string) => LoyaltyCard | undefined
  getLevelFromPoints: (points: number) => LoyaltyCard['level']
}
export const useLoyaltyStore = create<LoyaltyStore>()(persist((set, get) => ({
  cards: [], coupons: [],
  addCard: (c) => set(s => ({ cards: [...s.cards, c] })),
  updateCard: (id, d) => set(s => ({ cards: s.cards.map(c => c.id === id ? { ...c, ...d } : c) })),
  addCoupon: (c) => set(s => ({ coupons: [...s.coupons, c] })),
  useCoupon: (code) => {
    const coupon = get().coupons.find(c => c.code === code && !c.is_used && new Date(c.valid_until) > new Date())
    if (coupon) { set(s => ({ coupons: s.coupons.map(c => c.code === code ? { ...c, is_used: true } : c) })); return true }
    return false
  },
  getCardByClient: (clientId) => get().cards.find(c => c.client_id === clientId),
  getLevelFromPoints: (points) => points >= 5000 ? 'platinum' : points >= 2000 ? 'gold' : points >= 500 ? 'silver' : 'bronze'
}), { name: 'pm-loyalty' }))

// AGENDA
interface AgendaStore {
  events: AgendaEvent[]
  addEvent: (e: AgendaEvent) => void; updateEvent: (id: string, d: Partial<AgendaEvent>) => void
  deleteEvent: (id: string) => void; getEventsByDate: (date: string) => AgendaEvent[]
}
export const useAgendaStore = create<AgendaStore>()(persist((set, get) => ({
  events: [],
  addEvent: (e) => set(s => ({ events: [...s.events, e] })),
  updateEvent: (id, d) => set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...d } : e) })),
  deleteEvent: (id) => set(s => ({ events: s.events.filter(e => e.id !== id) })),
  getEventsByDate: (date) => get().events.filter(e => e.date === date)
}), { name: 'pm-agenda' }))
