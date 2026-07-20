export type UserRole = 'admin' | 'manager' | 'caissier' | 'reception' | 'laveur' | 'repasseur' | 'livreur'
export type Permission = 'modify_price' | 'delete_order' | 'view_profits' | 'cancel_invoice' | 'export_data' | 'manage_users' | 'manage_stock' | 'manage_employees' | 'view_accounting'
export type ClientGroup = 'standard' | 'vip' | 'entreprise' | 'hotel' | 'blacklist'
export type ClothType = 'chemise' | 'pantalon' | 'robe' | 'costume' | 'veste' | 'manteau' | 'jupe' | 'pull' | 'tshirt' | 'cravate' | 'couverture' | 'rideau' | 'nappe' | 'tapis' | 'couette' | 'chaussures' | 'sac' | 'autre'
export type ClothStatus = 'recu' | 'tri' | 'pretraitement' | 'detachage' | 'lavage' | 'essorage' | 'sechage' | 'repassage' | 'controle' | 'retouche' | 'emballage' | 'stock' | 'pret' | 'livre'
export type ServiceType = 'lavage_simple' | 'lavage_express' | 'repassage' | 'nettoyage_sec' | 'detachage' | 'service_vip' | 'impermeabilisant'
export type OrderStatus = 'en_attente' | 'en_cours' | 'pret' | 'livre' | 'annule'
export type PaymentMethod = 'especes' | 'carte' | 'wave' | 'orange_money' | 'mtn' | 'moov' | 'virement' | 'mixte'
export type PaymentStatus = 'non_paye' | 'acompte' | 'paye'
export type Priority = 'economique' | 'normal' | 'express' | 'vip'

export interface User {
  id: string; email: string; full_name: string; phone: string
  role: UserRole; agency_id: string; avatar_url?: string
  is_active: boolean; permissions: Permission[]; created_at: string
}

export interface Agency {
  id: string; name: string; address: string; phone: string
  email: string; logo_url?: string; is_active: boolean; created_at: string
}

export interface Client {
  id: string; agency_id: string; first_name: string; last_name: string
  phone: string; whatsapp: string; email: string; address: string
  group: ClientGroup; balance: number; credit: number; loyalty_points: number
  discount_rate: number; notes: string; is_blacklisted: boolean
  referred_by?: string; created_at: string
}

export interface StatusHistory {
  status: ClothStatus; changed_at: string; changed_by: string; notes: string
}

export interface Cloth {
  id: string; order_id: string; qr_code: string; type: ClothType
  color: string; brand: string; size: string; material: string
  quantity: number; condition_on_arrival: string; defects: string[]
  photos: string[]; special_instructions: string; service: ServiceType
  price: number; status: ClothStatus; status_history: StatusHistory[]
  created_at: string
}

export interface Order {
  id: string; ticket_number: string; agency_id: string; client_id: string
  client: Client; clothes: Cloth[]; status: OrderStatus; priority: Priority
  received_at: string; expected_at: string; delivered_at?: string
  subtotal: number; discount: number; total: number; deposit: number
  remaining: number; payment_method: PaymentMethod; payment_status: PaymentStatus
  payment_details: PaymentDetail[]; notes: string; signature_url?: string
  created_by: string; created_at: string
}

export interface PaymentDetail {
  method: PaymentMethod; amount: number; reference?: string; paid_at: string
}

export interface CashSession {
  id: string; agency_id: string; opened_by: string; opened_at: string
  closed_at?: string; opening_amount: number; closing_amount?: number
  expected_amount?: number; difference?: number; status: 'open' | 'closed'
  notes: string
}

export interface CashTransaction {
  id: string; session_id: string; type: 'entree' | 'sortie'
  amount: number; reason: string; created_by: string; created_at: string
}

export interface ServicePrice {
  id: string; cloth_type: ClothType; service_type: ServiceType
  price: number; express_surcharge: number; duration_hours: number; agency_id: string
}

export interface StockItem {
  id: string; agency_id: string; name: string
  category: 'lessive' | 'eau_javel' | 'detachant' | 'parfum' | 'sacs' | 'etiquettes' | 'cintres' | 'emballages' | 'autre'
  quantity: number; unit: string; min_threshold: number
  purchase_price: number; supplier: string; created_at: string
}

export interface StockMovement {
  id: string; stock_item_id: string; type: 'entree' | 'sortie'
  quantity: number; reason: string; created_by: string; created_at: string
}

export interface Employee {
  id: string; user_id: string; agency_id: string; full_name: string
  role: UserRole; phone: string; salary: number; hire_date: string; is_active: boolean
}

export interface Attendance {
  id: string; employee_id: string; date: string
  check_in: string; check_out?: string; status: 'present' | 'absent' | 'conge' | 'retard'
}

export interface Leave {
  id: string; employee_id: string; type: 'conge' | 'maladie' | 'autre'
  start_date: string; end_date: string; status: 'pending' | 'approved' | 'rejected'; notes: string
}

export interface Delivery {
  id: string; order_id: string; driver_id: string; address: string
  scheduled_at: string; delivered_at?: string
  status: 'planifie' | 'en_route' | 'livre' | 'echec'
  signature_url?: string; photo_url?: string; notes: string
}

export interface Transaction {
  id: string; agency_id: string; type: 'recette' | 'depense'
  category: string; amount: number; description: string; date: string; created_by: string
}

export interface Notification {
  id: string; client_id: string; client_name: string; client_phone: string
  type: 'sms' | 'whatsapp' | 'email'; message: string
  status: 'pending' | 'sent' | 'failed'; sent_at?: string; created_at: string
}

export interface LoyaltyCard {
  id: string; client_id: string; points: number
  level: 'bronze' | 'silver' | 'gold' | 'platinum'; created_at: string
}

export interface Coupon {
  id: string; code: string; discount_percent: number
  valid_until: string; is_used: boolean; client_id?: string; created_at: string
}

export interface AgendaEvent {
  id: string; title: string; type: 'livraison' | 'rappel' | 'conge' | 'autre'
  date: string; time: string; description: string; order_id?: string
  employee_id?: string; created_at: string
}
