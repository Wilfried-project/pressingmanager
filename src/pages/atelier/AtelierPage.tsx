import React, { useState, useMemo } from 'react'
import { useOrderStore, useShopConfig } from '../../lib/store'
import type { Order, Cloth } from '../../types'

const STATUS_STEPS = [
  { key: 'recu', label: 'Reçu', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'tri', label: 'Tri', color: '#6366f1', bg: '#eef2ff' },
  { key: 'pretraitement', label: 'Prétraitement', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'detachage', label: 'Détachage', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'lavage', label: 'Lavage', color: '#06b6d4', bg: '#ecfeff' },
  { key: 'essorage', label: 'Essorage', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'sechage', label: 'Séchage', color: '#f97316', bg: '#fff7ed' },
  { key: 'repassage', label: 'Repassage', color: '#ef4444', bg: '#fef2f2' },
  { key: 'controle', label: 'Contrôle', color: '#10b981', bg: '#f0fdf4' },
  { key: 'retouche', label: 'Retouche', color: '#f97316', bg: '#fff7ed' },
  { key: 'emballage', label: 'Emballage', color: '#6366f1', bg: '#eef2ff' },
  { key: 'stock', label: 'Stock', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'pret', label: 'Prêt', color: '#059669', bg: '#f0fdf4' },
]

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  vip: { bg: '#fef3c7', text: '#92400e', label: '⭐ VIP' },
  express: { bg: '#fee2e2', text: '#991b1b', label: '⚡ Express' },
  normal: { bg: '#f3f4f6', text: '#374151', label: 'Normal' },
  economique: { bg: '#f0fdf4', text: '#166534', label: 'Économique' },
}

export const AtelierPage: React.FC = () => {
  const { orders, updateOrder } = useOrderStore()
  const { config } = useShopConfig()
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_cours'>('all')
  const [updated, setUpdated] = useState<string | null>(null)

  // Commandes actives (pas livrées, pas annulées)
  const activeOrders = useMemo(() => orders.filter(o =>
    o.status !== 'livre' && o.status !== 'annule' && o.status !== 'pret'
  ).sort((a, b) => {
    const prio: Record<string, number> = { vip: 0, express: 1, normal: 2, economique: 3 }
    return (prio[a.priority] || 2) - (prio[b.priority] || 2)
  }), [orders])

  const filtered = useMemo(() => activeOrders.filter(o => {
    const matchSearch = !search || o.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      `${o.client?.first_name} ${o.client?.last_name}`.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || o.status === filter
    return matchSearch && matchFilter
  }), [activeOrders, search, filter])

  const updateClothStatus = (clothId: string, newStatus: string) => {
    if (!selectedOrder) return
    const updatedClothes = selectedOrder.clothes.map(c => {
      if (c.id !== clothId) return c
      return {
        ...c,
        status: newStatus as Cloth['status'],
        status_history: [...(c.status_history || []), {
          status: newStatus as Cloth['status'],
          changed_at: new Date().toISOString(),
          changed_by: 'atelier',
          notes: ''
        }]
      }
    })
    const allReady = updatedClothes.every(c => c.status === 'pret' || c.status === 'livre')
    const newOrderStatus = allReady ? 'pret' : 'en_cours'
    updateOrder(selectedOrder.id, { clothes: updatedClothes, status: newOrderStatus as any })
    setSelectedOrder({ ...selectedOrder, clothes: updatedClothes, status: newOrderStatus as any })
    setUpdated(clothId)
    setTimeout(() => setUpdated(null), 2000)
  }

  const getOrderProgress = (order: Order) => {
    const total = order.clothes.length
    const done = order.clothes.filter(c => ['controle', 'retouche', 'emballage', 'stock', 'pret'].includes(c.status)).length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '3px solid #7c3aed' }}>
        {config.logo
          ? <img src={config.logo} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
          : <div style={{ width: 40, height: 40, background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧺</div>
        }
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 900, fontSize: 20, margin: 0 }}>{config.name || 'PressingManager'} — Atelier</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Interface laveur / repasseur</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed', margin: 0 }}>{activeOrders.length} commande(s) en cours</p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — liste commandes */}
        <div style={{ width: 380, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Recherche + filtres */}
          <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ticket ou nom client..."
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              onFocus={e => (e.target.style.borderColor = '#7c3aed')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ key: 'all', label: 'Toutes' }, { key: 'en_attente', label: 'En attente' }, { key: 'en_cours', label: 'En cours' }].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key as any)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '2px solid', borderColor: filter === f.key ? '#7c3aed' : '#e2e8f0', background: filter === f.key ? '#ede9fe' : '#f8fafc', color: filter === f.key ? '#7c3aed' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <p style={{ fontSize: 40 }}>✅</p>
                <p style={{ fontWeight: 700 }}>Aucune commande en cours</p>
              </div>
            ) : filtered.map(order => {
              const progress = getOrderProgress(order)
              const prio = PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.normal
              const isSelected = selectedOrder?.id === order.id
              return (
                <div key={order.id} onClick={() => setSelectedOrder(order)}
                  style={{ padding: 16, borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isSelected ? '#ede9fe' : '#fff', borderLeft: isSelected ? '4px solid #7c3aed' : '4px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: 15, margin: '0 0 2px', color: '#1e293b' }}>#{order.ticket_number}</p>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{order.client?.first_name} {order.client?.last_name}</p>
                    </div>
                    <span style={{ background: prio.bg, color: prio.text, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{prio.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{order.clothes.length} article(s) • {order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : 'Sans date'}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: progress.pct === 100 ? '#059669' : '#7c3aed', margin: 0 }}>{progress.done}/{progress.total}</p>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: progress.pct === 100 ? '#059669' : '#7c3aed', width: `${progress.pct}%`, borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Zone principale — détail commande */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selectedOrder ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#94a3b8' }}>
              <p style={{ fontSize: 64, margin: 0 }}>👈</p>
              <p style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>Sélectionnez une commande</p>
              <p style={{ fontSize: 14, marginTop: 8 }}>Cliquez sur une commande à gauche pour voir les vêtements</p>
            </div>
          ) : (
            <div>
              {/* Header commande */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed', margin: 0 }}>#{selectedOrder.ticket_number}</p>
                    <span style={{ background: PRIORITY_COLORS[selectedOrder.priority]?.bg, color: PRIORITY_COLORS[selectedOrder.priority]?.text, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{PRIORITY_COLORS[selectedOrder.priority]?.label}</span>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{selectedOrder.client?.first_name} {selectedOrder.client?.last_name}</p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    {selectedOrder.clothes.length} article(s) •
                    Date prévue : {selectedOrder.expected_at ? new Date(selectedOrder.expected_at).toLocaleDateString('fr-FR') : 'Non définie'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>Progression</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed', margin: 0 }}>{getOrderProgress(selectedOrder).pct}%</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{getOrderProgress(selectedOrder).done}/{getOrderProgress(selectedOrder).total} traité(s)</p>
                </div>
              </div>

              {/* Instructions générales */}
              {selectedOrder.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>📝 Notes générales</p>
                  <p style={{ fontSize: 14, color: '#78350f', margin: 0 }}>{selectedOrder.notes}</p>
                </div>
              )}

              {/* Vêtements */}
              <div style={{ display: 'grid', gap: 16 }}>
                {selectedOrder.clothes.map((cloth, i) => {
                  const currentStep = STATUS_STEPS.find(s => s.key === cloth.status) || STATUS_STEPS[0]
                  const currentIdx = STATUS_STEPS.findIndex(s => s.key === cloth.status)
                  const isDone = ['controle', 'retouche', 'emballage', 'stock', 'pret'].includes(cloth.status)

                  return (
                    <div key={cloth.id} style={{ background: '#fff', borderRadius: 16, border: `2px solid ${isDone ? '#10b981' : '#e2e8f0'}`, overflow: 'hidden' }}>
                      {/* Header vêtement */}
                      <div style={{ background: isDone ? '#f0fdf4' : '#f8fafc', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>{i + 1}</div>
                          <div>
                            <p style={{ fontWeight: 900, fontSize: 16, margin: '0 0 2px', textTransform: 'capitalize', color: '#1e293b' }}>
                              {cloth.type} {cloth.color ? `— ${cloth.color}` : ''} {cloth.brand ? `(${cloth.brand})` : ''}
                            </p>
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                              {cloth.service?.replace(/_/g, ' ')} • Qté: {cloth.quantity}
                              {cloth.material ? ` • ${cloth.material}` : ''}
                              {cloth.size ? ` • Taille: ${cloth.size}` : ''}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {updated === cloth.id && (
                            <span style={{ background: '#f0fdf4', color: '#059669', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>✅ Mis à jour !</span>
                          )}
                          <span style={{ background: currentStep.bg, color: currentStep.color, padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, border: `1px solid ${currentStep.color}20` }}>
                            {currentStep.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: 20 }}>
                        {/* Instructions spéciales */}
                        {cloth.special_instructions && (
                          <div style={{ background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: '#c2410c', margin: '0 0 4px' }}>⚠️ INSTRUCTIONS SPÉCIALES — À lire avant de traiter</p>
                            <p style={{ fontSize: 14, color: '#9a3412', margin: 0, fontWeight: 600 }}>{cloth.special_instructions}</p>
                          </div>
                        )}

                        {/* Photos */}
                        {(cloth.photos || []).length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase' }}>Photos à la réception</p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {(cloth.photos || []).map((photo, pi) => (
                                <img key={pi} src={photo} alt={`Photo ${pi + 1}`}
                                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', cursor: 'pointer' }}
                                  onClick={() => window.open(photo, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* État réception */}
                        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                            État réception : <strong>{cloth.condition_on_arrival || 'bon'}</strong>
                          </span>
                        </div>

                        {/* Boutons statut */}
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 10px', textTransform: 'uppercase' }}>Mettre à jour le statut</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                            {STATUS_STEPS.map((step, idx) => {
                              const isCurrent = idx === currentIdx
                              const isDoneStep = idx < currentIdx
                              return (
                                <button key={step.key} onClick={() => updateClothStatus(cloth.id, step.key)}
                                  style={{
                                    padding: '12px 8px', borderRadius: 10, border: '2px solid',
                                    borderColor: isCurrent ? step.color : isDoneStep ? '#10b981' : '#e2e8f0',
                                    background: isCurrent ? step.bg : isDoneStep ? '#f0fdf4' : '#f8fafc',
                                    color: isCurrent ? step.color : isDoneStep ? '#059669' : '#94a3b8',
                                    fontSize: 13, fontWeight: isCurrent ? 800 : 600,
                                    cursor: 'pointer', textAlign: 'center',
                                    transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'all 0.15s',
                                    boxShadow: isCurrent ? `0 4px 12px ${step.color}30` : 'none'
                                  }}>
                                  {isDoneStep ? '✓ ' : ''}{step.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
