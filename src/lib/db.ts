import { supabase } from './supabase'

// Récupère le tenant_id de l'utilisateur connecté
async function getTenantId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  // Chercher le tenant_id dans la table employees
  const { data: employee } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', session.user.id)
    .single()

  if (employee?.tenant_id) return employee.tenant_id

  // Fallback — tenant par défaut
  return 'bc4ba4d5-b9b6-48d8-8344-84c2fc2c299f'
}

// Génère un numéro de commande séquentiel PM/ANNÉE/MOIS/NUMÉRO
// Le compteur ne redémarre jamais à zéro — il continue de s'incrémenter
export async function generateTicketNumber(): Promise<string> {
  const tenant_id = await getTenantId()
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)

  if (error) {
    // En cas d'erreur, on retombe sur l'ancien format pour ne jamais bloquer une commande
    return `PM-${Date.now().toString().slice(-6)}`
  }

  const nextNumber = (count || 0) + 1
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const num = String(nextNumber).padStart(5, '0')
  return `PM/${year}/${month}/${num}`
}

// ============================================================
// CLIENTS
// ============================================================
export const clientsService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(client: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const tenant_id = await getTenantId()
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)
    if (error) throw error
  }
}

// ============================================================
// ORDERS
// ============================================================
export const ordersService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('orders')
      .select(`*, client:clients(*), clothes(*)`)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(order: any, clothes: any[]) {
    const tenant_id = await getTenantId()
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({ ...order, tenant_id })
      .select()
      .single()
    if (orderError) throw orderError

    if (clothes.length > 0) {
      const { error: clothesError } = await supabase
        .from('clothes')
        .insert(clothes.map(c => ({ ...c, order_id: orderData.id, tenant_id })))
      if (clothesError) throw clothesError
    }
    return orderData
  },

  async update(id: string, updates: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const tenant_id = await getTenantId()
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)
    if (error) throw error
  }
}

// ============================================================
// CASH
// ============================================================
export const cashService = {
  async getSessions() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('opened_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addSession(session: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({ ...session, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateSession(id: string, updates: any) {
    const { data, error } = await supabase
      .from('cash_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTransactions(sessionId?: string) {
    const tenant_id = await getTenantId()
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .eq('tenant_id', tenant_id)
    if (sessionId) query = query.eq('session_id', sessionId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addTransaction(tx: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert({ ...tx, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// STOCK
// ============================================================
export const stockService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('name')
    if (error) throw error
    return data || []
  },

  async create(item: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('stock_items')
      .insert({ ...Object.fromEntries(Object.entries(item).filter(([k]) => k !== 'agency_id')), tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('stock_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('stock_items').delete().eq('id', id)
    if (error) throw error
  }
}

// ============================================================
// TRANSACTIONS COMPTABILITE
// ============================================================
export const transactionService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(tx: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(notif: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...notif, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// AGENDA
// ============================================================
export const agendaService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('agenda_events')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('date')
    if (error) throw error
    return data || []
  },

  async create(event: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('agenda_events')
      .insert({ ...event, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('agenda_events').delete().eq('id', id)
    if (error) throw error
  }
}

// ============================================================
// EMPLOYEES (RH)
// ============================================================
export const employeeService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('full_name')
    if (error) throw error
    return data || []
  },

  // Employés créés dans RH qui n'ont pas encore de compte de connexion (user_id vide)
  async getWithoutAccount() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenant_id)
      .is('user_id', null)
      .order('full_name')
    if (error) throw error
    return data || []
  },

  async create(emp: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('employees')
      .insert({ ...emp, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) throw error
  }
}

// ============================================================
// POINTAGE (ATTENDANCES)
// ============================================================
export const attendanceService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByDate(date: string) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('date', date)
    if (error) throw error
    return data || []
  },

  async create(att: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('attendances')
      .insert({ ...att, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// CONGÉS (LEAVES)
// ============================================================
export const leaveService = {
  async getAll() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('start_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(leave: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('leaves')
      .insert({ ...leave, tenant_id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('leaves')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// TENANT CONFIG
// ============================================================
export const tenantService = {
  async get() {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenant_id)
      .single()
    if (error) throw error
    return data
  },

  async update(updates: any) {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenant_id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
