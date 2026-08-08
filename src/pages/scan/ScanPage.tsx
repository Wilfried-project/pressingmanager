import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOrderStore, useShopConfig } from '../../lib/store'
import type { Order } from '../../types'

const STATUS_STEPS = [
  { key: 'recu', label: 'Reçu', icon: '📥' },
  { key: 'tri', label: 'Tri', icon: '🗂️' },
  { key: 'pretraitement', label: 'Prétraitement', icon: '🔬' },
  { key: 'detachage', label: 'Détachage', icon: '🧪' },
  { key: 'lavage', label: 'Lavage', icon: '🫧' },
  { key: 'essorage', label: 'Essorage', icon: '💧' },
  { key: 'sechage', label: 'Séchage', icon: '💨' },
  { key: 'repassage', label: 'Repassage', icon: '♨️' },
  { key: 'controle', label: 'Contrôle', icon: '✅' },
  { key: 'retouche', label: 'Retouche', icon: '🪡' },
  { key: 'emballage', label: 'Emballage', icon: '📦' },
  { key: 'stock', label: 'Stock', icon: '🏪' },
  { key: 'pret', label: 'Prêt', icon: '🎁' },
  { key: 'livre', label: 'Livré', icon: '🚚' },
]

export const ScanPage: React.FC = () => {
  const { ticket } = useParams<{ ticket: string }>()
  const { orders, updateOrder } = useOrderStore()
  const { config } = useShopConfig()
  const [order, setOrder] = useState<Order | null>(null)
  const [updated, setUpdated] = useState<string | null>(null)

  useEffect(() => {
    const found = orders.find(o => o.ticket_number === ticket)
    setOrder(found || null)
  }, [orders, ticket])

  const updateClothStatus = (clothId: string, newStatus: string) => {
    if (!order) return
    const updatedClothes = order.clothes.map(c => {
      if (c.id !== clothId) return c
      return {
        ...c,
        status: newStatus as any,
        status_history: [...(c.status_history || []), {
          status: newStatus as any,
          changed_at: new Date().toISOString(),
          changed_by: 'scan',
          notes: ''
        }]
      }
    })
    updateOrder(order.id, { clothes: updatedClothes })
    setUpdated(clothId)
    setTimeout(() => setUpdated(null), 2000)
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>Commande introuvable</h2>
          <p style={{ color: '#6b7280', marginTop: 8 }}>Le ticket #{ticket} n'existe pas ou a été supprimé.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: '#7c3aed', color: '#fff', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 600, margin: '0 auto' }}>
          {config.logo
            ? <img src={config.logo} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            : <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧺</div>
          }
          <div>
            <p style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>{config.name || 'PressingManager'}</p>
            <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>Interface employé</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Ticket info */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Numéro de ticket</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed', margin: 0 }}>#{order.ticket_number}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: order.status === 'pret' ? '#dcfce7' : order.status === 'livre' ? '#f3f4f6' : '#dbeafe', color: order.status === 'pret' ? '#16a34a' : order.status === 'livre' ? '#6b7280' : '#2563eb', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>Client</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{order.client?.first_name} {order.client?.last_name}</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>Priorité</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>{order.priority}</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>Date dépôt</p>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{new Date(order.received_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>Date prévue</p>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : '-'}</p>
            </div>
          </div>
        </div>

        {/* Vêtements */}
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 12px' }}>
          Vêtements ({order.clothes.length})
        </h2>

        {order.clothes.map((cloth, i) => {
          const currentIdx = STATUS_STEPS.findIndex(s => s.key === cloth.status)
          return (
            <div key={cloth.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              {/* Header vêtement */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, margin: '0 0 2px', textTransform: 'capitalize' }}>
                    {i + 1}. {cloth.type} {cloth.color ? `— ${cloth.color}` : ''} {cloth.brand ? `(${cloth.brand})` : ''}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                    {cloth.service?.replace(/_/g, ' ')} • Qté: {cloth.quantity}
                  </p>
                </div>
                <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {STATUS_STEPS[currentIdx]?.icon} {cloth.status?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Instructions spéciales */}
              {cloth.special_instructions && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#c2410c', fontWeight: 600, margin: '0 0 2px' }}>⚠️ Instructions spéciales</p>
                  <p style={{ fontSize: 13, color: '#9a3412', margin: 0 }}>{cloth.special_instructions}</p>
                </div>
              )}

              {/* État à réception */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {cloth.material && <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>🧵 {cloth.material}</span>}
                {cloth.size && <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>📏 {cloth.size}</span>}
                {cloth.condition_on_arrival && <span style={{ background: cloth.condition_on_arrival === 'bon' ? '#f0fdf4' : '#fef2f2', color: cloth.condition_on_arrival === 'bon' ? '#16a34a' : '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>État: {cloth.condition_on_arrival}</span>}
              </div>

              {/* Photos */}
              {(cloth.photos || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {(cloth.photos || []).map((photo, pi) => (
                    <img key={pi} src={photo} alt={`Photo ${pi+1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  ))}
                </div>
              )}

              {/* Mise à jour statut */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase' }}>Mettre à jour le statut</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {STATUS_STEPS.map((step, idx) => (
                    <button
                      key={step.key}
                      onClick={() => updateClothStatus(cloth.id, step.key)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: '2px solid',
                        borderColor: idx === currentIdx ? '#7c3aed' : idx < currentIdx ? '#10b981' : '#e5e7eb',
                        background: idx === currentIdx ? '#ede9fe' : idx < currentIdx ? '#f0fdf4' : '#f9fafb',
                        color: idx === currentIdx ? '#7c3aed' : idx < currentIdx ? '#16a34a' : '#9ca3af',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.3
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{step.icon}</div>
                      {step.label}
                    </button>
                  ))}
                </div>
                {updated === cloth.id && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, marginTop: 8, textAlign: 'center' }}>
                    <p style={{ color: '#16a34a', fontWeight: 700, fontSize: 13, margin: 0 }}>✅ Statut mis à jour !</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {order.notes && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>📝 Notes générales</p>
            <p style={{ fontSize: 13, color: '#78350f', margin: 0 }}>{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
