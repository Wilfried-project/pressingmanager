import React, { useState, useMemo, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { useOrderStore, useClientStore, useNotificationStore, useLoyaltyStore, useClientStore as useCS, useCashStore, useAuthStore, useTransactionStore, useShopConfig, useAgendaStore } from '../../lib/store'
import { clientsService, ordersService } from '../../lib/db'
import { PageHeader, Button, SearchInput, Modal, Field, Input, Select, Textarea, Badge, EmptyState, Table, Card, getOrderStatusColor, getPriorityColor, getClothStatusColor } from '../../components/ui'
import { Plus, Eye, Trash2, ChevronRight, Printer, Bell, Camera, X, CreditCard } from 'lucide-react'
import type { Order, Cloth, ClothType, ServiceType, Priority, PaymentMethod, PaymentStatus, PaymentDetail, Client } from '../../types'

const CLOTH_TYPES: { value: ClothType; label: string; icon: string }[] = [
  { value: 'chemise', label: 'Chemise', icon: '' }, { value: 'pantalon', label: 'Pantalon', icon: '' },
  { value: 'robe', label: 'Robe', icon: '' }, { value: 'costume', label: 'Costume', icon: '🤵' },
  { value: 'veste', label: 'Veste', icon: '' }, { value: 'manteau', label: 'Manteau', icon: '' },
  { value: 'jupe', label: 'Jupe', icon: '' }, { value: 'pull', label: 'Pull', icon: '🧶' },
  { value: 'tshirt', label: 'T-Shirt', icon: '' }, { value: 'cravate', label: 'Cravate', icon: '' },
  { value: 'couverture', label: 'Couverture', icon: '🛏️' }, { value: 'rideau', label: 'Rideau', icon: '🪟' },
  { value: 'nappe', label: 'Nappe', icon: '🍽️' }, { value: 'tapis', label: 'Tapis', icon: '🪸' },
  { value: 'couette', label: 'Couette', icon: '🛌' }, { value: 'chaussures', label: 'Chaussures', icon: '👟' },
  { value: 'sac', label: 'Sac', icon: '' }, { value: 'autre', label: 'Autre', icon: '' },
]

const SERVICES: { value: ServiceType; label: string; basePrice: number }[] = [
  { value: 'lavage_simple', label: 'Lavage simple', basePrice: 1500 },
  { value: 'lavage_express', label: 'Lavage express', basePrice: 2500 },
  { value: 'repassage', label: 'Repassage', basePrice: 750 },
  { value: 'nettoyage_sec', label: 'Nettoyage à sec', basePrice: 3500 },
  { value: 'detachage', label: 'Détachage', basePrice: 1500 },
  { value: 'impermeabilisant', label: 'Imperméabilisant', basePrice: 2500 },
  { value: 'service_vip', label: 'Service VIP complet', basePrice: 8000 },
]

const STATUS_STEPS = [
  { key: 'recu', label: 'Reçu', icon: '' }, { key: 'tri', label: 'Tri', icon: '' },
  { key: 'pretraitement', label: 'Prétraitement', icon: '' }, { key: 'detachage', label: 'Détachage', icon: '' },
  { key: 'lavage', label: 'Lavage', icon: '' }, { key: 'essorage', label: 'Essorage', icon: '' },
  { key: 'sechage', label: 'Séchage', icon: '' }, { key: 'repassage', label: 'Repassage', icon: '' },
  { key: 'controle', label: 'Contrôle', icon: '' }, { key: 'retouche', label: 'Retouche', icon: '🪡' },
  { key: 'emballage', label: 'Emballage', icon: '' }, { key: 'stock', label: 'Stock', icon: '' },
  { key: 'pret', label: 'Prêt', icon: '' }, { key: 'livre', label: 'Livré', icon: '' },
]

export const OrdersPage: React.FC = () => {
  const { orders, addOrder, updateOrder, deleteOrder } = useOrderStore()
  const { clients: localClients, addClient } = useClientStore()
  const [dbClients, setDbClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Charger les clients depuis Supabase
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true)
      try {
        const data = await clientsService.getAll()
        setDbClients(data as Client[])
      } catch {
        // Fallback sur les clients locaux
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [])

  // Combiner clients Supabase + locaux
  const clients = useMemo(() => {
    const allClients = [...dbClients]
    localClients.forEach(lc => {
      if (!allClients.find(c => c.id === lc.id)) allClients.push(lc)
    })
    return allClients
  }, [dbClients, localClients])
  const { addNotification } = useNotificationStore()
  const { addLoyaltyPoints } = useCS()
  const { addCashTransaction, getCurrentSession } = useCashStore()
  const { user } = useAuthStore()
  const { addTransaction } = useTransactionStore()
  const { config } = useShopConfig()
  const { addEvent, events } = useAgendaStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState<Order | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes')

  // Recherche client
  const [clientSearch, setClientSearch] = useState('')
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClient, setNewClient] = useState({ first_name: '', last_name: '', phone: '', email: '' })

  const [form, setForm] = useState({
    client_id: '', priority: 'normal' as Priority,
    expected_at: '', payment_method: 'especes' as PaymentMethod,
    payment_status: 'non_paye' as PaymentStatus, deposit: 0, notes: ''
  })
  const [clothes, setClothes] = useState<Partial<Cloth>[]>([{
    type: 'chemise', color: '', brand: '', size: '', material: '',
    quantity: '' as any, service: 'lavage_simple', price: '' as any,
    special_instructions: '', condition_on_arrival: 'bon', defects: [], photos: []
  }])
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([])
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const filtered = useMemo(() => orders.filter(o => {
    const ms = o.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      `${o.client?.first_name} ${o.client?.last_name}`.toLowerCase().includes(search.toLowerCase())
    return ms && (!filterStatus || o.status === filterStatus)
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [orders, search, filterStatus])

  const filteredClients = useMemo(() =>
    clients.filter(c => !c.is_blacklisted && (
      `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(clientSearch.toLowerCase())
    )).slice(0, 8), [clients, clientSearch])

  const selectedClient = clients.find(c => c.id === form.client_id)
  const subtotal = clothes.reduce((s, c) => s + ((c.price || 0) * (c.quantity || 1)), 0)

  // Suggestion date intelligente — Lun-Sam 8h-18h, max 10 commandes/jour
  const getSuggestedDate = () => {
    const MAX_PER_DAY = 10
    for (let i = 1; i <= 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      if (d.getDay() === 0) continue // skip dimanche
      const ds = d.toISOString().split('T')[0]
      const ordersThisDay = orders.filter(o => o.expected_at?.startsWith(ds)).length
      const eventsThisDay = events.filter(e => e.date === ds).length
      if (ordersThisDay + eventsThisDay < MAX_PER_DAY) {
        return `${ds}T09:00`
      }
    }
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return `${d.toISOString().split('T')[0]}T09:00`
  }

  const suggestedDate = getSuggestedDate()
  const discount = selectedClient?.discount_rate ? subtotal * selectedClient.discount_rate / 100 : 0
  const totalAfterDiscount = subtotal - discount
  const expressMultiplier = form.priority === 'express' ? 1.2 : form.priority === 'vip' ? 1.5 : 1
  const total = totalAfterDiscount * expressMultiplier
  const remaining = total - form.deposit

  // Acompte grisé si payé ou non payé
  const isDepositDisabled = form.payment_status === 'paye' || form.payment_status === 'non_paye'

  const addCloth = () => setClothes([...clothes, {
    type: 'chemise', color: '', brand: '', size: '', material: '',
    quantity: '' as any, service: 'lavage_simple', price: '' as any,
    special_instructions: '', condition_on_arrival: 'bon', defects: [], photos: []
  }])
  const updateCloth = (i: number, d: Partial<Cloth>) => { const n = [...clothes]; n[i] = { ...n[i], ...d }; setClothes(n) }
  const removeCloth = (i: number) => setClothes(clothes.filter((_, idx) => idx !== i))

  // Photo vêtement
  const handlePhotoUpload = (i: number, files: FileList | null) => {
    if (!files) return
    const readers = Array.from(files).map(file => new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    }))
    Promise.all(readers).then(photos => {
      updateCloth(i, { photos: [...(clothes[i].photos || []), ...photos] })
    })
  }

  const removePhoto = (clothIdx: number, photoIdx: number) => {
    const photos = [...(clothes[clothIdx].photos || [])]
    photos.splice(photoIdx, 1)
    updateCloth(clothIdx, { photos })
  }

  // Créer nouveau client à la volée
  const handleCreateClient = () => {
    if (!newClient.first_name || !newClient.phone) {
      alert('Prénom et téléphone requis')
      return
    }
    const client: Client = {
      id: crypto.randomUUID(),
      first_name: newClient.first_name,
      last_name: newClient.last_name,
      phone: newClient.phone,
      email: newClient.email,
      loyalty_points: 0,
      discount_rate: 0,
      group: 'standard',
      is_blacklisted: false,
      agency_id: 'default',
      created_at: new Date().toISOString(), whatsapp: newClient.phone, address: "", balance: 0, credit: 0, notes: "",
      
      
      
    }
    addClient(client)
    setForm({ ...form, client_id: client.id })
    setClientSearch(`${client.first_name} ${client.last_name}`)
    setShowNewClientForm(false)
    setNewClient({ first_name: '', last_name: '', phone: '', email: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const client = clients.find(c => c.id === form.client_id)
    if (!client) { alert('Veuillez sélectionner un client'); return }
    const ticket = `PM-${Date.now().toString().slice(-6)}`
    const now = new Date().toISOString()
    const clothesFull: Cloth[] = clothes.map(c => ({
      ...c, id: crypto.randomUUID(), order_id: ticket,
      qr_code: `QR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'recu' as const,
      status_history: [{ status: 'recu' as const, changed_at: now, changed_by: 'system', notes: 'Réception client' }],
      photos: c.photos || [], created_at: now
    } as Cloth))

    const depositFinal = form.payment_status === 'paye' ? total : form.payment_status === 'non_paye' ? 0 : form.deposit
    const remainingFinal = total - depositFinal

    const order: Order = {
      id: crypto.randomUUID(), ticket_number: ticket, agency_id: 'default',
      client_id: client.id, client, clothes: clothesFull,
      status: 'en_attente', priority: form.priority,
      received_at: now, expected_at: form.expected_at,
      subtotal, discount, total, deposit: depositFinal, remaining: remainingFinal,
      payment_method: form.payment_method, payment_status: form.payment_status,
      payment_details: paymentDetails, notes: form.notes,
      created_by: 'system', created_at: now
    }
    addOrder(order)

    // Sauvegarder dans Supabase
    try {
      await ordersService.create({
        id: order.id,
        ticket_number: ticket,
        client_id: client.id,
        status: 'en_attente',
        priority: form.priority,
        received_at: now,
        expected_at: form.expected_at,
        subtotal,
        discount,
        total,
        deposit: depositFinal,
        remaining: remainingFinal,
        payment_method: form.payment_method,
        payment_status: form.payment_status,
        notes: form.notes,
        created_by: user?.full_name || 'Admin'
      }, clothesFull.map(c => ({
        id: c.id,
        type: c.type,
        color: c.color,
        brand: c.brand,
        size: c.size,
        material: c.material,
        quantity: c.quantity,
        service: c.service,
        price: c.price,
        status: 'recu',
        special_instructions: c.special_instructions,
        condition_on_arrival: c.condition_on_arrival,
        photos: c.photos,
        qr_code: c.qr_code
      })))
    } catch (err) {
      console.error('Erreur sauvegarde Supabase:', err)
    }

    // Enregistrement automatique en caisse
    const session = getCurrentSession()
    if (session && depositFinal > 0) {
      addCashTransaction({
        id: crypto.randomUUID(),
        session_id: session.id,
        type: 'entree',
        amount: depositFinal,
        reason: `Acompte commande #${ticket} — ${client.first_name} ${client.last_name}`,
        created_by: user?.full_name || 'Admin',
        created_at: new Date().toISOString()
      })
    }

    // Enregistrement automatique en comptabilité
    if (depositFinal > 0) {
      addTransaction({
        id: crypto.randomUUID(),
        agency_id: 'default',
        type: 'recette',
        category: 'Vente pressing',
        amount: depositFinal,
        description: `Acompte commande #${ticket} — ${client.first_name} ${client.last_name}`,
        date: new Date().toISOString().split('T')[0],
        created_by: user?.full_name || 'Admin'
      })
    }

    // Ajout automatique dans l'agenda
    if (order.expected_at) {
      addEvent({
        id: crypto.randomUUID(),
        title: `Livraison #${ticket} — ${client.first_name} ${client.last_name} (${clothesFull.length} article(s))`,
        type: 'livraison',
        date: order.expected_at.split('T')[0],
        time: order.expected_at.includes('T') ? order.expected_at.split('T')[1].slice(0, 5) : '09:00',
        description: `${clothesFull.length} article(s) • ${total.toLocaleString('fr-FR')} XOF • ${client.phone}`,
        created_at: new Date().toISOString()
      })
    }

    const pts = Math.floor(total / 1000)
    if (pts > 0) addLoyaltyPoints(client.id, pts)
    resetForm()
    printTicket(order).catch(console.error)

    // Envoi automatique WhatsApp — message de réception
    const msgReception = (config.msgReception || '')
      .replace('{prenom}', client.first_name)
      .replace('{nb}', String(clothesFull.length))
      .replace('{ticket}', ticket)
      .replace('{date}', order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : 'À définir')
      .replace('{total}', total.toLocaleString('fr-FR'))
      .replace('{adresse}', config.address || '')
      .replace('{nom}', config.name || 'PressingManager')

    const phoneClean = (client.phone || '').replace(/\s/g, '').replace(/^00/, '+')
    if (phoneClean && msgReception) {
      const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msgReception)}`
      setTimeout(() => window.open(waUrl, '_blank'), 1500)
    }

    alert(` Commande créée ! Ticket: ${ticket}\n+${pts} points fidélité`)
  }

  const resetForm = () => {
    setForm({ client_id: '', priority: 'normal', expected_at: '', payment_method: 'especes', payment_status: 'non_paye', deposit: 0, notes: '' })
    setClothes([{ type: 'chemise', color: '', brand: '', size: '', material: '', quantity: '' as any, service: 'lavage_simple', price: '' as any, special_instructions: '', condition_on_arrival: 'bon', defects: [], photos: [] }])
    setPaymentDetails([])
    setClientSearch('')
    setShowNewClientForm(false)
    setShowForm(false)
  }

  // Paiement à la livraison
  const handlePaymentOnPickup = () => {
    if (!showPaymentModal) return
    const order = showPaymentModal
    const newDeposit = order.deposit + paymentAmount
    const newRemaining = order.total - newDeposit
    const newStatus: PaymentStatus = newRemaining <= 0 ? 'paye' : 'acompte'
    updateOrder(order.id, {
      deposit: newDeposit,
      remaining: Math.max(0, newRemaining),
      payment_status: newStatus,
      payment_method: paymentMethod,
      ...(newRemaining <= 0 ? { status: 'livre', delivered_at: new Date().toISOString() } : {})
    })

    // Enregistrement automatique en caisse
    const session = getCurrentSession()
    if (session && paymentAmount > 0) {
      addCashTransaction({
        id: crypto.randomUUID(),
        session_id: session.id,
        type: 'entree',
        amount: paymentAmount,
        reason: `Paiement livraison #${order.ticket_number} — ${order.client?.first_name} ${order.client?.last_name}`,
        created_by: user?.full_name || 'Admin',
        created_at: new Date().toISOString()
      })
    }

    // Enregistrement automatique en comptabilité
    if (paymentAmount > 0) {
      addTransaction({
        id: crypto.randomUUID(),
        agency_id: 'default',
        type: 'recette',
        category: 'Vente pressing',
        amount: paymentAmount,
        description: `Paiement livraison #${order.ticket_number} — ${order.client?.first_name} ${order.client?.last_name}`,
        date: new Date().toISOString().split('T')[0],
        created_by: user?.full_name || 'Admin'
      })
    }

    alert(` Paiement enregistré !\nMontant reçu: ${paymentAmount.toLocaleString('fr-FR')} XOF\n${newRemaining > 0 ? `Reste: ${newRemaining.toLocaleString('fr-FR')} XOF` : 'Commande entièrement payée '}`)
    setShowPaymentModal(null)
    setPaymentAmount(0)
  }

  const printTicket = async (order: Order) => {
    const scanUrl = `${window.location.origin}/scan/${order.ticket_number}`
    const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Ticket ${order.ticket_number}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; background: #fff; color: #000; }
      .ticket { width: 80mm; margin: 0 auto; padding: 8px; }
      .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-align: center; padding: 16px 8px; border-radius: 8px 8px 0 0; }
      .logo { width: 140px; height: auto; object-fit: contain; margin-bottom: 8px; }
      .title { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
      .subtitle { font-size: 10px; opacity: 0.8; margin-top: 2px; }
      .ticket-num { background: #fff; color: #7c3aed; font-size: 20px; font-weight: bold; text-align: center; padding: 10px; margin: 0; border-left: 3px solid #7c3aed; border-right: 3px solid #7c3aed; letter-spacing: 2px; }
      .section { border: 1px solid #e5e7eb; border-top: none; padding: 10px; }
      .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #7c3aed; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
      .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
      .row .label { color: #6b7280; }
      .row .value { font-weight: 600; text-align: right; max-width: 60%; }
      .articles { margin: 0; }
      .article { border-bottom: 1px dashed #e5e7eb; padding: 5px 0; font-size: 11px; }
      .article-name { font-weight: bold; color: #111; }
      .article-detail { color: #6b7280; font-size: 10px; }
      .article-price { font-weight: bold; color: #7c3aed; float: right; }
      .totals { border: 2px solid #7c3aed; border-radius: 0 0 0 0; padding: 10px; }
      .total-line { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
      .total-main { font-size: 16px; font-weight: bold; color: #7c3aed; border-top: 2px solid #7c3aed; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; }
      .remaining { background: #fef2f2; color: #dc2626; font-weight: bold; text-align: center; padding: 6px; font-size: 12px; margin-top: 4px; border-radius: 4px; }
      .paid { background: #f0fdf4; color: #16a34a; font-weight: bold; text-align: center; padding: 6px; font-size: 12px; margin-top: 4px; border-radius: 4px; }
      .footer { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 10px; text-align: center; background: #f9fafb; }
      .footer-note { font-size: 10px; color: #6b7280; margin: 2px 0; }
      .footer-important { font-size: 11px; font-weight: bold; color: #7c3aed; margin: 4px 0; }
      .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; background: ${order.priority === 'vip' ? '#fef3c7' : order.priority === 'express' ? '#fee2e2' : '#f3f4f6'}; color: ${order.priority === 'vip' ? '#92400e' : order.priority === 'express' ? '#991b1b' : '#374151'}; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="ticket">
      <div class="header">
        ${config.logo ? `<img src="${config.logo}" alt="logo" style="width: 140px;height: auto;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : '<div class="logo"></div>'}
        <div class="title">${config.name || 'PRESSINGMANAGER'}</div>
        <div class="subtitle">${config.slogan || 'Reçu de dépôt — Ticket client'}</div>
      </div>
      <div class="ticket-num">#${order.ticket_number}</div>
      <div style="text-align:center;padding:10px;border:1px solid #e5e7eb;border-top:none">
        <img src="${qrDataUrl}" alt="QR Code" style="width:100px;height:100px" />
        <p style="font-size:9px;color:#6b7280;margin-top:4px">Scannez pour voir le détail</p>
      </div>
      <div class="section">
        <div class="section-title"> Informations client</div>
        <div class="row"><span class="label">Client</span><span class="value">${order.client?.first_name} ${order.client?.last_name}</span></div>
        <div class="row"><span class="label">Téléphone</span><span class="value">${order.client?.phone}</span></div>
        <div class="row"><span class="label">Date dépôt</span><span class="value">${new Date(order.received_at).toLocaleDateString('fr-FR')} à ${new Date(order.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="row"><span class="label">Date prévue</span><span class="value">${order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : 'À définir'}</span></div>
        <div class="row"><span class="label">Priorité</span><span class="value"><span class="priority-badge">${order.priority.toUpperCase()}</span></span></div>
      </div>
      <div class="section articles">
        <div class="section-title"> Articles (${order.clothes.length})</div>
        ${order.clothes.map((c, idx) => `
          <div class="article">
            <span class="article-price">${((c.price || 0) * (c.quantity || 1)).toLocaleString('fr-FR')} XOF</span>
            <div class="article-name">${c.quantity}x ${CLOTH_TYPES.find(t => t.value === c.type)?.icon || ''} ${c.type?.charAt(0).toUpperCase() + (c.type?.slice(1) || '')}</div>
            <div class="article-detail">${c.service?.replace(/_/g, ' ')} ${c.color ? '• ' + c.color : ''} ${c.brand ? '• ' + c.brand : ''}</div>
            <div class="article-detail">QR: ${c.qr_code}</div>
          </div>
        `).join('')}
      </div>
      <div class="totals">
        <div class="section-title"> Récapitulatif paiement</div>
        <div class="total-line"><span>Sous-total</span><span>${order.subtotal.toLocaleString('fr-FR')} XOF</span></div>
        ${order.discount > 0 ? `<div class="total-line" style="color:#16a34a"><span>Remise client</span><span>-${order.discount.toLocaleString('fr-FR')} XOF</span></div>` : ''}
        ${order.priority !== 'normal' ? `<div class="total-line" style="color:#f97316"><span>Supplément ${order.priority}</span><span>inclus</span></div>` : ''}
        <div class="total-main"><span>TOTAL</span><span>${order.total.toLocaleString('fr-FR')} XOF</span></div>
        ${order.deposit > 0 ? `<div class="total-line" style="color:#2563eb;margin-top:4px"><span>Acompte versé</span><span>${order.deposit.toLocaleString('fr-FR')} XOF</span></div>` : ''}
        ${order.remaining > 0
          ? `<div class="remaining"> Reste à payer: ${order.remaining.toLocaleString('fr-FR')} XOF</div>`
          : `<div class="paid"> Commande entièrement payée</div>`
        }
        <div class="total-line" style="margin-top:4px;font-size:10px;color:#6b7280"><span>Mode de paiement</span><span>${order.payment_method?.replace('_', ' ')}</span></div>
      </div>
      <div class="footer">
        <div class="footer-important"> Conservez ce ticket pour récupérer vos articles</div>
        <div class="footer-note">${config.footer || 'Merci pour votre confiance !'}</div>
        ${config.phone ? `<div class="footer-note"> ${config.phone}</div>` : ''}
        ${config.address ? `<div class="footer-note"> ${config.address}</div>` : ''}
        <div class="footer-note" style="margin-top:6px">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
      </div>
    </div>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`)
    win.document.close()
  }

  const sendReadyNotification = (order: Order) => {
    // Message prêt personnalisé
    const msgPret = (config.msgPret || '')
      .replace('{prenom}', order.client?.first_name || '')
      .replace('{nb}', String(order.clothes.length))
      .replace('{ticket}', order.ticket_number)
      .replace('{reste}', order.remaining.toLocaleString('fr-FR'))
      .replace('{adresse}', config.address || '')
      .replace('{nom}', config.name || 'PressingManager')

    const notif = {
      id: crypto.randomUUID(), client_id: order.client_id,
      client_name: `${order.client?.first_name} ${order.client?.last_name}`,
      client_phone: order.client?.phone || '',
      type: 'whatsapp' as const,
      message: msgPret || `Bonjour ${order.client?.first_name} !  Vos vêtements sont prêts. Ticket: #${order.ticket_number}. — ${config.name || 'PressingManager'}`,
      status: 'pending' as const, created_at: new Date().toISOString()
    }
    addNotification(notif)

    // Ouvrir WhatsApp automatiquement
    const phoneClean = (order.client?.phone || '').replace(/\s/g, '').replace(/^00/, '+')
    if (phoneClean) {
      const defaultMsg = 'Bonjour ' + (order.client?.first_name || '') + ' ! Vos vetements sont prets. Ticket: #' + order.ticket_number + '. Venez recuperer. - ' + (config.name || 'PressingManager')
      const finalMsg = msgPret || defaultMsg
      const waUrl = 'https://wa.me/' + phoneClean + '?text=' + encodeURIComponent(finalMsg)
      window.open(waUrl, '_blank')
    } else {
      alert(` Notification préparée pour ${order.client?.first_name} ${order.client?.last_name}`)
    }
  }

  const updateClothStatus = (orderId: string, clothId: string, newStatus: Cloth['status']) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const updatedClothes = order.clothes.map(c => {
      if (c.id !== clothId) return c
      return { ...c, status: newStatus, status_history: [...(c.status_history || []), { status: newStatus, changed_at: new Date().toISOString(), changed_by: 'system', notes: '' }] }
    })
    const allReady = updatedClothes.every(c => c.status === 'pret' || c.status === 'livre')
    updateOrder(orderId, { clothes: updatedClothes, ...(allReady && order.status !== 'livre' ? { status: 'pret' } : {}) })
    if (viewOrder?.id === orderId) setViewOrder({ ...viewOrder, clothes: updatedClothes })
  }

  const statusGroups = useMemo(() => ({
    en_attente: orders.filter(o => o.status === 'en_attente').length,
    en_cours: orders.filter(o => o.status === 'en_cours').length,
    pret: orders.filter(o => o.status === 'pret').length,
    livre: orders.filter(o => o.status === 'livre').length,
    annule: orders.filter(o => o.status === 'annule').length,
  }), [orders])

  return (
    <div className="space-y-6">
      <PageHeader title="Commandes" subtitle={`${orders.length} commande(s) au total`}
        action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Nouvelle commande</Button>} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { s: 'en_attente', l: 'En attente', c: 'bg-blue-50 border-blue-200 text-blue-700' },
          { s: 'en_cours', l: 'En cours', c: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { s: 'pret', l: 'Prêts', c: 'bg-green-50 border-green-200 text-green-700' },
          { s: 'livre', l: 'Livrés', c: 'bg-gray-50 border-gray-200 text-gray-600' },
          { s: 'annule', l: 'Annulés', c: 'bg-red-50 border-red-200 text-red-700' },
        ].map(({ s, l, c }) => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className={`p-3 rounded-xl border-2 text-center transition ${c} ${filterStatus === s ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}>
            <p className="text-2xl font-bold">{statusGroups[s as keyof typeof statusGroups]}</p>
            <p className="text-xs font-semibold mt-0.5">{l}</p>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Numéro ticket, nom client..." className="flex-1" />
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="sm:w-44">
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="pret">Prêt</option>
            <option value="livre">Livré</option>
            <option value="annule">Annulé</option>
          </Select>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <Table headers={['Ticket', 'Client', 'Articles', 'Total', 'Paiement', 'Statut', 'Priorité', 'Date limite', 'Actions']}>
          {filtered.map(order => (
            <tr key={order.id} className="hover:bg-purple-50 transition">
              <td className="px-5 py-4 font-bold text-purple-700 text-sm">#{order.ticket_number}</td>
              <td className="px-5 py-4">
                <p className="font-semibold text-sm">{order.client?.first_name} {order.client?.last_name}</p>
                <p className="text-xs text-gray-400">{order.client?.phone}</p>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="font-bold text-purple-700">{order.clothes.length}</span>
                <p className="text-xs text-gray-400">articles</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-bold text-sm">{order.total.toLocaleString('fr-FR')} XOF</p>
                {order.remaining > 0 && <p className="text-xs text-red-500">Reste: {order.remaining.toLocaleString('fr-FR')}</p>}
              </td>
              <td className="px-5 py-4">
                <Badge label={order.payment_status === 'paye' ? ' Payé' : order.payment_status === 'acompte' ? ' Acompte' : ' Non payé'}
                  color={order.payment_status === 'paye' ? 'green' : order.payment_status === 'acompte' ? 'yellow' : 'red'} />
              </td>
              <td className="px-5 py-4"><Badge label={order.status.replace('_', ' ')} color={getOrderStatusColor(order.status)} /></td>
              <td className="px-5 py-4"><Badge label={order.priority} color={getPriorityColor(order.priority)} /></td>
              <td className="px-5 py-4 text-sm text-gray-500">{order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : '-'}</td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  <button onClick={() => setViewOrder(order)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg" title="Voir détails"><Eye size={15} /></button>
                  <button onClick={() => printTicket(order).catch(console.error)} className="p-1.5 hover:bg-green-100 text-green-600 rounded-lg" title="Imprimer ticket"><Printer size={15} /></button>
                  {order.status === 'pret' && (
                    <button onClick={() => sendReadyNotification(order)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Notifier client"><Bell size={15} /></button>
                  )}
                  {/* Paiement à la livraison */}
                  {order.remaining > 0 && (
                    <button onClick={() => { setShowPaymentModal(order); setPaymentAmount(order.remaining) }}
                      className="p-1.5 hover:bg-yellow-100 text-yellow-600 rounded-lg" title="Encaisser paiement">
                      <CreditCard size={15} />
                    </button>
                  )}
                  <button onClick={() => { if (confirm('Supprimer cette commande ?')) deleteOrder(order.id) }} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg" title="Supprimer"><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card><EmptyState icon="" message="Aucune commande trouvée" action={<Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Créer une commande</Button>} /></Card>
      )}

      {/* MODAL PAIEMENT À LA LIVRAISON */}
      {showPaymentModal && (
        <Modal open={!!showPaymentModal} onClose={() => setShowPaymentModal(null)} title=" Encaissement à la livraison" size="sm">
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Client</p>
              <p className="font-bold text-lg">{showPaymentModal.client?.first_name} {showPaymentModal.client?.last_name}</p>
              <p className="text-sm text-gray-600 mt-2">Ticket</p>
              <p className="font-bold text-purple-700">#{showPaymentModal.ticket_number}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Total commande</span>
                <span className="font-bold">{showPaymentModal.total.toLocaleString('fr-FR')} XOF</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Déjà payé</span>
                <span className="font-semibold text-green-600">{showPaymentModal.deposit.toLocaleString('fr-FR')} XOF</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold text-red-700">Reste à payer</span>
                <span className="font-bold text-red-700 text-xl">{showPaymentModal.remaining.toLocaleString('fr-FR')} XOF</span>
              </div>
            </div>
            <Field label="Montant encaissé (XOF)">
              <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)} onFocus={e => e.target.value === '0' && (e.target.value = '')} min="0" max={showPaymentModal.remaining} />
            </Field>
            <Field label="Mode de paiement">
              <Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="wave"> Wave</option>
                <option value="orange_money"> Orange Money</option>
                <option value="mtn"> MTN Money</option>
                <option value="especes"> Espèces</option>
                <option value="mixte"> Paiement mixte</option>
              </Select>
            </Field>
            {paymentAmount > 0 && (
              <div className={`p-3 rounded-xl text-sm font-semibold ${showPaymentModal.remaining - paymentAmount <= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {showPaymentModal.remaining - paymentAmount <= 0
                  ? ' Commande entièrement soldée'
                  : ` Reste après paiement: ${(showPaymentModal.remaining - paymentAmount).toLocaleString('fr-FR')} XOF`
                }
              </div>
            )}
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handlePaymentOnPickup} disabled={paymentAmount <= 0} icon={<CreditCard size={16} />}>Confirmer paiement</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setShowPaymentModal(null)}>Annuler</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* FORMULAIRE NOUVELLE COMMANDE */}
      <Modal open={showForm} onClose={resetForm} title="Nouvelle commande" size="full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-purple-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-900 mb-4"> Informations générales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Recherche client avec création à la volée */}
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Client" required>
                  <div className="relative">
                    <Input
                      placeholder="Rechercher par nom ou téléphone..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setForm({ ...form, client_id: '' }) }}
                    />
                    {clientSearch && !form.client_id && (
                      <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {filteredClients.length > 0 ? (
                          filteredClients.map(c => (
                            <button key={c.id} type="button"
                              onClick={() => { setForm({ ...form, client_id: c.id }); setClientSearch(`${c.first_name} ${c.last_name} — ${c.phone}`) }}
                              className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-0">
                              <p className="font-semibold text-sm">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-gray-400">{c.phone} — {c.loyalty_points} pts</p>
                            </button>
                          ))
                        ) : null}
                        <button type="button"
                          onClick={() => { setShowNewClientForm(true); setNewClient({ ...newClient, first_name: clientSearch }) }}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 text-green-700 font-semibold text-sm border-t border-gray-100">
                          ➕ Créer "{clientSearch}" comme nouveau client
                        </button>
                      </div>
                    )}
                  </div>
                </Field>
                {/* Mini-formulaire nouveau client */}
                {showNewClientForm && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-bold text-green-800 mb-3">➕ Nouveau client</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Prénom *">
                        <Input value={newClient.first_name} onChange={e => setNewClient({ ...newClient, first_name: e.target.value })} placeholder="Prénom" />
                      </Field>
                      <Field label="Nom">
                        <Input value={newClient.last_name} onChange={e => setNewClient({ ...newClient, last_name: e.target.value })} placeholder="Nom" />
                      </Field>
                      <Field label="Téléphone *">
                        <Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+225 07..." />
                      </Field>
                      <Field label="Email">
                        <Input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@..." />
                      </Field>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button type="button" onClick={handleCreateClient} size="sm"> Créer le client</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewClientForm(false)}>Annuler</Button>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Priorité">
                <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                  <option value="economique">💚 Économique</option>
                  <option value="normal">⚪ Normal</option>
                  <option value="express"> Express (+20%)</option>
                  <option value="vip"> VIP (+50%)</option>
                </Select>
              </Field>
              <Field label="Date limite" required>
                <Input required type="datetime-local" value={form.expected_at} onChange={e => setForm({ ...form, expected_at: e.target.value })} />
                <button type="button" onClick={() => setForm({ ...form, expected_at: suggestedDate })}
                  className="mt-1.5 text-xs text-purple-600 hover:underline font-semibold flex items-center gap-1">
                   Date suggérée : {new Date(suggestedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à 9h00
                </button>
              </Field>
              <Field label="Mode de paiement">
                <Select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}>
                  <option value="wave"> Wave</option>
                  <option value="orange_money"> Orange Money</option>
                  <option value="mtn"> MTN Money</option>
                  <option value="especes"> Espèces</option>
                  <option value="mixte"> Paiement mixte</option>
                </Select>
              </Field>

              {/* Détail paiement mixte */}
              {form.payment_method === 'mixte' && (
                <div className="col-span-2 bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-purple-800 mb-3"> Détail du paiement mixte</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'wave', label: 'Wave ' },
                      { id: 'orange', label: 'Orange Money ' },
                      { id: 'mtn', label: 'MTN Money ' },
                      { id: 'especes', label: 'Espèces ' },
                    ].map(m => (
                      <Field key={m.id} label={m.label}>
                        <Input
                          type="number"
                          placeholder="0 XOF"
                          value={(paymentDetails.find(p => p.method === m.id)?.amount || '') as any}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            setPaymentDetails(prev => {
                              const existing = prev.filter(p => p.method !== m.id)
                              return val > 0 ? [...existing, { method: m.id as any, amount: val, paid_at: new Date().toISOString() }] : existing
                            })
                          }}
                        />
                      </Field>
                    ))}
                  </div>
                  {paymentDetails.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-purple-200">
                      <p className="text-xs text-gray-500 mb-1">Total renseigné</p>
                      <p className="font-bold text-purple-700">{paymentDetails.reduce((s, p) => s + p.amount, 0).toLocaleString('fr-FR')} XOF</p>
                    </div>
                  )}
                </div>
              )}
              <Field label="Statut paiement">
                <Select value={form.payment_status} onChange={e => {
                  const ps = e.target.value as PaymentStatus
                  setForm({ ...form, payment_status: ps, deposit: ps === 'paye' ? total : ps === 'non_paye' ? 0 : form.deposit })
                }}>
                  <option value="non_paye"> Non payé</option>
                  <option value="acompte"> Acompte versé</option>
                  <option value="paye"> Payé en totalité</option>
                </Select>
              </Field>
              <Field label="Acompte reçu (XOF)">
                <Input
                  type="number" min="0"
                  value={form.payment_status === 'paye' ? total : form.payment_status === 'non_paye' ? 0 : form.deposit}
                  onChange={e => setForm({ ...form, deposit: parseFloat(e.target.value) || 0 })}
                  disabled={isDepositDisabled}
                  className={isDepositDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                />
                {isDepositDisabled && (
                  <p className="text-xs text-gray-400 mt-1">
                    {form.payment_status === 'paye' ? ' Payé en totalité — acompte automatique' : ' Non payé — aucun acompte'}
                  </p>
                )}
              </Field>
            </div>
            {selectedClient && (
              <div className="mt-3 p-3 bg-purple-100 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">{selectedClient.first_name.charAt(0)}</div>
                <div>
                  <p className="font-bold text-purple-800">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-xs text-purple-600">{selectedClient.loyalty_points} points — Remise: {selectedClient.discount_rate}% — Groupe: {selectedClient.group}</p>
                </div>
              </div>
            )}
          </div>

          {/* Vêtements avec photos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900"> Vêtements ({clothes.length})</h3>
              <Button type="button" variant="ghost" size="sm" icon={<Plus size={15} />} onClick={addCloth}>Ajouter</Button>
            </div>
            <div className="space-y-4">
              {clothes.map((cloth, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                    <Field label="Type">
                      <Select value={cloth.type} onChange={e => updateCloth(i, { type: e.target.value as ClothType })}>
                        {CLOTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Service">
                      <Select value={cloth.service} onChange={e => {
                        const svc = SERVICES.find(s => s.value === e.target.value)
                        updateCloth(i, { service: e.target.value as ServiceType, price: svc?.basePrice || cloth.price })
                      }}>
                        {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Quantité">
                      <Input type="number" min="1" value={cloth.quantity} onChange={e => updateCloth(i, { quantity: e.target.value === '' ? '' as any : parseInt(e.target.value) || 0 })} onFocus={e => e.target.value === '0' && (e.target.value = '')} />
                    </Field>
                    <Field label="Prix unitaire (XOF)">
                      <Input type="number" value={cloth.price} onChange={e => updateCloth(i, { price: e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0 })} onFocus={e => e.target.value === '0' && (e.target.value = '')} />
                    </Field>
                    <Field label="Couleur">
                      <Input value={cloth.color || ''} onChange={e => updateCloth(i, { color: e.target.value })} placeholder="Ex: Bleu" />
                    </Field>
                    <Field label="Marque">
                      <Input value={cloth.brand || ''} onChange={e => updateCloth(i, { brand: e.target.value })} placeholder="Ex: Zara" />
                    </Field>
                    <Field label="Taille">
                      <Input value={cloth.size || ''} onChange={e => updateCloth(i, { size: e.target.value })} placeholder="S, M, L, XL..." />
                    </Field>
                    <Field label="Matière">
                      <Input value={cloth.material || ''} onChange={e => updateCloth(i, { material: e.target.value })} placeholder="Coton, Soie..." />
                    </Field>
                    <Field label="État à réception">
                      <Select value={cloth.condition_on_arrival} onChange={e => updateCloth(i, { condition_on_arrival: e.target.value })}>
                        <option value="bon"> Bon état</option>
                        <option value="taches">🟡 Taches</option>
                        <option value="dechire">🔴 Déchiré</option>
                        <option value="use">⚪ Usé</option>
                        <option value="abime"> Abîmé</option>
                      </Select>
                    </Field>
                    <Field label="Instructions spéciales">
                      <Input value={cloth.special_instructions || ''} onChange={e => updateCloth(i, { special_instructions: e.target.value })} placeholder="Délicat, pas de chlore..." />
                    </Field>
                    <div className="flex items-end justify-between col-span-2">
                      <div>
                        <p className="text-xs text-gray-500">Sous-total article</p>
                        <p className="font-bold text-lg text-purple-700">{((cloth.price || 0) * (cloth.quantity || 1)).toLocaleString('fr-FR')} XOF</p>
                      </div>
                      {clothes.length > 1 && <Button type="button" variant="danger" size="sm" onClick={() => removeCloth(i)}>Retirer</Button>}
                    </div>
                  </div>

                  {/* Section Photos */}
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-600"> Photos du vêtement ({(cloth.photos || []).length})</p>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          ref={el => fileInputRefs.current[i] = el}
                          onChange={e => handlePhotoUpload(i, e.target.files)}
                          className="hidden"
                        />
                        <button type="button"
                          onClick={() => fileInputRefs.current[i]?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200 transition">
                          <Camera size={13} /> Ajouter photo
                        </button>
                      </div>
                    </div>
                    {(cloth.photos || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(cloth.photos || []).map((photo, pi) => (
                          <div key={pi} className="relative">
                            <img src={photo} alt={`Photo ${pi + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                            <button type="button" onClick={() => removePhoto(i, pi)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Aucune photo — cliquez pour photographier l'état du vêtement</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes générales">
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Informations supplémentaires pour l'équipe..." />
          </Field>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3"> Récapitulatif</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Sous-total ({clothes.length} article(s))</span><span className="font-medium">{subtotal.toLocaleString('fr-FR')} XOF</span></div>
              {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Remise client ({selectedClient?.discount_rate}%)</span><span>- {discount.toLocaleString('fr-FR')} XOF</span></div>}
              {form.priority !== 'normal' && <div className="flex justify-between text-sm text-orange-600"><span>Supplément {form.priority} {form.priority === 'express' ? '(+20%)' : '(+50%)'}</span><span>inclus</span></div>}
              <div className="border-t border-purple-200 pt-2 flex justify-between font-bold text-xl"><span>TOTAL</span><span className="text-purple-700">{total.toLocaleString('fr-FR')} XOF</span></div>
              {form.deposit > 0 && <div className="flex justify-between text-sm text-blue-600"><span>Acompte versé</span><span>- {form.deposit.toLocaleString('fr-FR')} XOF</span></div>}
              {remaining > 0 && form.payment_status !== 'paye' && <div className="flex justify-between font-bold text-red-600"><span>Restant à payer</span><span>{remaining.toLocaleString('fr-FR')} XOF</span></div>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" size="lg" icon={<Printer size={18} />}>Enregistrer & Imprimer ticket</Button>
            <Button type="button" variant="secondary" className="flex-1" size="lg" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* DÉTAIL COMMANDE */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Commande #${viewOrder.ticket_number}`} size="xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Client', value: `${viewOrder.client?.first_name} ${viewOrder.client?.last_name}` },
                { label: 'Téléphone', value: viewOrder.client?.phone || '-' },
                { label: 'Priorité', value: viewOrder.priority },
                { label: 'Reçu le', value: new Date(viewOrder.received_at).toLocaleDateString('fr-FR') },
                { label: 'Date limite', value: viewOrder.expected_at ? new Date(viewOrder.expected_at).toLocaleDateString('fr-FR') : '-' },
                { label: 'Paiement', value: viewOrder.payment_method },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="font-semibold text-sm mt-0.5 capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Changer le statut :</p>
              <div className="flex flex-wrap gap-2">
                {['en_attente', 'en_cours', 'pret', 'livre', 'annule'].map(s => (
                  <button key={s} onClick={() => {
                    updateOrder(viewOrder.id, { status: s as Order['status'], ...(s === 'livre' ? { delivered_at: new Date().toISOString() } : {}) })
                    setViewOrder({ ...viewOrder, status: s as Order['status'] })
                    if (s === 'pret') sendReadyNotification(viewOrder)
                  }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${viewOrder.status === s ? 'border-purple-600 bg-purple-100 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Suivi des {viewOrder.clothes.length} vêtement(s) :</p>
              <div className="space-y-4">
                {viewOrder.clothes.map((cloth) => {
                  const currentIdx = STATUS_STEPS.findIndex(s => s.key === cloth.status)
                  return (
                    <div key={cloth.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="font-bold text-sm capitalize">{cloth.type} {cloth.color ? `— ${cloth.color}` : ''} {cloth.brand ? `(${cloth.brand})` : ''}</p>
                          <p className="text-xs text-gray-400">QR: {cloth.qr_code} | {cloth.service?.replace('_', ' ')} | {cloth.quantity}x</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-700 text-sm">{((cloth.price || 0) * cloth.quantity).toLocaleString('fr-FR')} XOF</p>
                          <Badge label={cloth.status} color={getClothStatusColor(cloth.status)} />
                        </div>
                      </div>
                      {/* Photos dans le détail */}
                      {(cloth.photos || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(cloth.photos || []).map((photo, pi) => (
                            <img key={pi} src={photo} alt={`Photo ${pi + 1}`} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                          ))}
                        </div>
                      )}
                      <div className="overflow-x-auto pb-2">
                        <div className="flex items-center gap-0.5 min-w-max">
                          {STATUS_STEPS.map((step, idx) => (
                            <React.Fragment key={step.key}>
                              <button onClick={() => updateClothStatus(viewOrder.id, cloth.id, step.key as Cloth['status'])}
                                className={`flex flex-col items-center text-center w-10 transition rounded-lg p-1 ${idx <= currentIdx ? 'opacity-100' : 'opacity-35 hover:opacity-60'}`}>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm mb-0.5 ${idx === currentIdx ? 'bg-purple-600 text-white shadow-md' : idx < currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                  {step.icon}
                                </span>
                                <span className="text-xs leading-tight text-center font-medium" style={{ fontSize: '9px' }}>{step.label}</span>
                              </button>
                              {idx < STATUS_STEPS.length - 1 && <ChevronRight size={10} className={`flex-shrink-0 ${idx < currentIdx ? 'text-green-400' : 'text-gray-200'}`} />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      {cloth.special_instructions && (
                        <p className="text-xs text-orange-600 bg-orange-50 rounded p-2 mt-2"> {cloth.special_instructions}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span>Sous-total</span><span>{viewOrder.subtotal.toLocaleString('fr-FR')} XOF</span></div>
              {viewOrder.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Remise</span><span>-{viewOrder.discount.toLocaleString('fr-FR')} XOF</span></div>}
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>TOTAL</span><span className="text-purple-700">{viewOrder.total.toLocaleString('fr-FR')} XOF</span></div>
              {viewOrder.remaining > 0 && <div className="flex justify-between font-bold text-red-600"><span>Restant à payer</span><span>{viewOrder.remaining.toLocaleString('fr-FR')} XOF</span></div>}
            </div>

            <div className="flex gap-3">
              <Button icon={<Printer size={16} />} variant="ghost" className="flex-1" onClick={() => printTicket(viewOrder).catch(console.error)}>Réimprimer ticket</Button>
              {viewOrder.remaining > 0 && (
                <Button icon={<CreditCard size={16} />} variant="warning" className="flex-1"
                  onClick={() => { setShowPaymentModal(viewOrder); setPaymentAmount(viewOrder.remaining); setViewOrder(null) }}>
                  Encaisser paiement
                </Button>
              )}
              {viewOrder.status === 'pret' && <Button icon={<Bell size={16} />} variant="success" className="flex-1" onClick={() => sendReadyNotification(viewOrder)}>Notifier client</Button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

