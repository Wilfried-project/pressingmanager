import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useShopConfig } from '../../lib/store'
import { Printer, Eye, X } from 'lucide-react'

async function getTenantId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
  return emp?.tenant_id || null
}

export const BillingPage: React.FC = () => {
  const { config } = useShopConfig()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tous')
  const [viewOrder, setViewOrder] = useState<any | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const tenantId = await getTenantId()
      if (!tenantId) return
      const { data } = await supabase
        .from('orders')
        .select('*, client:clients(*), clothes(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      setOrders(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getInvoiceNumber = (order: any, index: number) => {
    const year = new Date(order.created_at).getFullYear()
    const num = String(index + 1).padStart(3, '0')
    return `FAC/${year}/${num}`
  }

  const getPaymentStatus = (order: any) => {
    if (order.remaining <= 0) return { label: 'Payé', color: 'text-green-700 bg-green-100' }
    if (order.deposit > 0) return { label: 'Partiel', color: 'text-orange-700 bg-orange-100' }
    return { label: 'Impayé', color: 'text-red-700 bg-red-100' }
  }

  const filtered = orders.filter(o => {
    if (filter === 'paye') return o.remaining <= 0
    if (filter === 'impaye') return o.remaining > 0 && o.deposit === 0
    if (filter === 'partiel') return o.remaining > 0 && o.deposit > 0
    return true
  })

  const totalCA = orders.filter(o => o.remaining <= 0).reduce((s, o) => s + (o.total || 0), 0)
  const totalAcomptes = orders.filter(o => o.deposit > 0 && o.remaining > 0).reduce((s, o) => s + (o.deposit || 0), 0)
  const totalImpayes = orders.filter(o => o.remaining > 0).reduce((s, o) => s + (o.remaining || 0), 0)

  const printInvoice = (order: any, invoiceNum: string) => {
    const win = window.open('', '_blank')
    if (!win) return
    const payments = []
    if (order.deposit > 0) payments.push({ date: new Date(order.created_at).toLocaleDateString('fr-FR'), amount: order.deposit })
    if (order.remaining <= 0 && order.deposit < order.total) payments.push({ date: new Date().toLocaleDateString('fr-FR'), amount: order.total - order.deposit })

    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Facture ${invoiceNum}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 30px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #6c47ff; padding-bottom: 20px; }
      .logo { height: 80px; width: auto; object-fit: contain; }
      .shop-name { font-size: 20px; font-weight: 800; color: #6c47ff; }
      .shop-info { font-size: 11px; color: #666; margin-top: 4px; }
      .client-block { text-align: right; }
      .client-name { font-size: 16px; font-weight: 700; }
      .invoice-title { font-size: 22px; font-weight: 900; color: #6c47ff; margin-bottom: 8px; }
      .invoice-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8f7ff; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
      .meta-item .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-item .value { font-weight: 700; font-size: 12px; }
      .context { background: #f0ecff; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; color: #444; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #6c47ff; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      tr:hover td { background: #faf9ff; }
      .total-block { float: right; width: 280px; border: 2px solid #6c47ff; border-radius: 8px; overflow: hidden; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; }
      .total-row.grand { background: #dc2626; color: white; font-weight: 800; font-size: 14px; }
      .total-row.paid { background: #f0fdf4; color: #16a34a; font-weight: 600; }
      .total-row.due { background: #1a1a1a; color: white; font-weight: 800; }
      .clearfix::after { content: ''; display: table; clear: both; }
      .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; font-size: 10px; color: #888; text-align: center; }
      @media print { body { padding: 15px; } }
    </style></head><body>

    <div class="header">
      <div>
        ${config.logo ? `<img src="${config.logo}" alt="logo" class="logo">` : ''}
        <div class="shop-name">${config.name || 'PressingManager'}</div>
        <div class="shop-info">${config.address || ''} ${config.phone ? '• ' + config.phone : ''} ${config.email ? '• ' + config.email : ''}</div>
      </div>
      <div class="client-block">
        <div style="font-size:11px;color:#888;margin-bottom:4px">Facturé à</div>
        <div class="client-name">${order.client?.first_name || ''} ${order.client?.last_name || ''}</div>
        <div style="font-size:11px;color:#666;">${order.client?.phone || ''}</div>
      </div>
    </div>

    <div class="invoice-title">Facture ${invoiceNum}</div>

    <div class="invoice-meta">
      <div class="meta-item"><div class="label">Date facturation</div><div class="value">${new Date(order.created_at).toLocaleDateString('fr-FR')}</div></div>
      <div class="meta-item"><div class="label">Échéance</div><div class="value">${order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : '-'}</div></div>
      <div class="meta-item"><div class="label">N° Commande</div><div class="value">#${order.ticket_number}</div></div>
      <div class="meta-item"><div class="label">Référence</div><div class="value">${invoiceNum}</div></div>
    </div>

    <div class="context">
      <strong>Communication de paiement :</strong> ${invoiceNum} &nbsp;&nbsp;
      <strong>Commande :</strong> CMD/${order.ticket_number} &nbsp;&nbsp;
      <strong>Date dépôt :</strong> ${new Date(order.received_at || order.created_at).toLocaleDateString('fr-FR')} &nbsp;&nbsp;
      <strong>Date retrait :</strong> ${order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : 'À définir'}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center">Quantité</th>
          <th style="text-align:right">Prix unitaire</th>
          <th style="text-align:right">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${(order.clothes || []).map((c: any) => `
          <tr>
            <td>${c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Article'} ${c.service ? '(' + c.service.replace(/_/g, ' ') + ')' : ''}</td>
            <td style="text-align:center">${c.quantity || 1},00 Unité(s)</td>
            <td style="text-align:right">${(c.price || 0).toLocaleString('fr-FR')},00</td>
            <td style="text-align:right">${((c.price || 0) * (c.quantity || 1)).toLocaleString('fr-FR')} XOF</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="clearfix">
      <div class="total-block">
        <div class="total-row grand">
          <span>Total</span>
          <span>${(order.total || 0).toLocaleString('fr-FR')} XOF</span>
        </div>
        ${payments.map(p => `
          <div class="total-row paid">
            <span>Payé le ${p.date}</span>
            <span>${p.amount.toLocaleString('fr-FR')} XOF</span>
          </div>
        `).join('')}
        <div class="total-row due">
          <span>Montant dû</span>
          <span>${(order.remaining || 0).toLocaleString('fr-FR')} XOF</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>${config.name || 'PressingManager'} ${config.address ? '• ' + config.address : ''} ${config.phone ? '• ' + config.phone : ''} ${config.email ? '• ' + config.email : ''}</p>
      <p style="margin-top:4px">${config.footer || 'Merci pour votre confiance !'}</p>
    </div>

    <script>window.onload = () => { window.print(); }</script>
    </body></html>`)
    win.document.close()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
          <p className="text-sm text-gray-500">{orders.length} facture(s)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">CA Encaissé</p>
          <p className="text-2xl font-bold text-green-600">{totalCA.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Acomptes restants</p>
          <p className="text-2xl font-bold text-orange-600">{totalAcomptes.toLocaleString('fr-FR')} XOF</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Impayés</p>
          <p className="text-2xl font-bold text-red-600">{totalImpayes.toLocaleString('fr-FR')} XOF</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {['tous', 'paye', 'partiel', 'impaye'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-600 transition ${filter === f ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-400'}`}>
            {f === 'tous' ? 'Tous' : f === 'paye' ? 'Payés' : f === 'partiel' ? 'Partiels' : 'Impayés'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">N° Facture</th>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">Ticket</th>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-700 text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-700 text-gray-500 uppercase">Reste</th>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-700 text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, index) => {
              const invoiceNum = getInvoiceNumber(order, index)
              const status = getPaymentStatus(order)
              return (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-700 text-purple-600 text-sm">{invoiceNum}</td>
                  <td className="px-4 py-3 text-sm">#{order.ticket_number}</td>
                  <td className="px-4 py-3 text-sm font-600">{order.client?.first_name} {order.client?.last_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm font-700 text-right">{(order.total || 0).toLocaleString('fr-FR')} XOF</td>
                  <td className="px-4 py-3 text-sm text-right">{(order.remaining || 0).toLocaleString('fr-FR')} XOF</td>
                  <td className="px-4 py-3"><span className={`text-xs font-700 px-2 py-1 rounded-full ${status.color}`}>{status.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setViewOrder({ ...order, invoiceNum })} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Voir"><Eye size={15} /></button>
                      <button onClick={() => printInvoice(order, invoiceNum)} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg" title="Imprimer"><Printer size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">Aucune facture</div>}
      </div>

      {/* Modal apercu */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-purple-600">{viewOrder.invoiceNum}</h2>
                <p className="text-sm text-gray-500">#{viewOrder.ticket_number}</p>
              </div>
              <button onClick={() => setViewOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Client</p>
                <p className="font-700">{viewOrder.client?.first_name} {viewOrder.client?.last_name}</p>
                <p className="text-sm text-gray-500">{viewOrder.client?.phone}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Dates</p>
                <p className="text-sm">Dépôt : {new Date(viewOrder.received_at || viewOrder.created_at).toLocaleDateString('fr-FR')}</p>
                <p className="text-sm">Retrait : {viewOrder.expected_at ? new Date(viewOrder.expected_at).toLocaleDateString('fr-FR') : '-'}</p>
              </div>
            </div>

            <table className="w-full border-collapse mb-4">
              <thead><tr className="bg-purple-600 text-white"><th className="px-3 py-2 text-left text-xs">Description</th><th className="px-3 py-2 text-center text-xs">Qté</th><th className="px-3 py-2 text-right text-xs">Prix</th><th className="px-3 py-2 text-right text-xs">Montant</th></tr></thead>
              <tbody>
                {(viewOrder.clothes || []).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-sm">{c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Article'} {c.service ? `(${c.service.replace(/_/g, ' ')})` : ''}</td>
                    <td className="px-3 py-2 text-sm text-center">{c.quantity || 1}</td>
                    <td className="px-3 py-2 text-sm text-right">{(c.price || 0).toLocaleString('fr-FR')} XOF</td>
                    <td className="px-3 py-2 text-sm text-right font-700">{((c.price || 0) * (c.quantity || 1)).toLocaleString('fr-FR')} XOF</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 border-2 border-purple-600 rounded-xl overflow-hidden">
                <div className="flex justify-between px-4 py-2 bg-red-600 text-white font-800"><span>Total</span><span>{(viewOrder.total || 0).toLocaleString('fr-FR')} XOF</span></div>
                {viewOrder.deposit > 0 && <div className="flex justify-between px-4 py-2 bg-green-50 text-green-700 font-600"><span>Acompte versé</span><span>{viewOrder.deposit.toLocaleString('fr-FR')} XOF</span></div>}
                <div className="flex justify-between px-4 py-2 bg-gray-900 text-white font-800"><span>Montant dû</span><span>{(viewOrder.remaining || 0).toLocaleString('fr-FR')} XOF</span></div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => printInvoice(viewOrder, viewOrder.invoiceNum)} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-700 py-3 rounded-xl transition">
                <Printer size={16} /> Imprimer la facture
              </button>
              <button onClick={() => setViewOrder(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-600 py-3 rounded-xl transition">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
