import React, { useState } from 'react'
import { useOrderStore, useShopConfig } from '../../lib/store'
import type { Order } from '../../types'

const ETAPES = [
  { key: 'recu',      label: 'Reçu',      emoji: '📥', color: '#6b7280', next: 'tri' },
  { key: 'tri',       label: 'Tri',        emoji: '🗂️', color: '#6366f1', next: 'lavage' },
  { key: 'lavage',    label: 'Lavage',     emoji: '🫧', color: '#06b6d4', next: 'sechage' },
  { key: 'sechage',   label: 'Séchage',    emoji: '💨', color: '#f97316', next: 'repassage' },
  { key: 'repassage', label: 'Repassage',  emoji: '♨️', color: '#ef4444', next: 'emballage' },
  { key: 'emballage', label: 'Emballage',  emoji: '📦', color: '#8b5cf6', next: 'pret' },
  { key: 'pret',      label: 'PRÊT !',     emoji: '✅', color: '#059669', next: null },
]

const getEtape = (key: string) => ETAPES.find(e => e.key === key) || ETAPES[0]

const getEtapeCommande = (order: Order) => {
  const statuts = order.clothes.map(c => c.status)
  for (const etape of ETAPES) {
    if (statuts.some(s => s === etape.key)) return etape
  }
  return ETAPES[0]
}

export const AtelierPage: React.FC = () => {
  const { orders, updateOrder } = useOrderStore()
  const { config } = useShopConfig()
  const [ticket, setTicket] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const chercher = () => {
    const found = orders.find(o =>
      o.ticket_number.toLowerCase() === ticket.trim().toLowerCase() &&
      o.status !== 'livre' && o.status !== 'annule'
    )
    if (found) { setOrder(found); setError(''); setSuccess(false) }
    else { setError('Ticket introuvable'); setOrder(null) }
  }

  const avancer = () => {
    if (!order) return
    const etapeActuelle = getEtapeCommande(order)
    if (!etapeActuelle.next) return
    const updatedClothes = order.clothes.map(c => ({
      ...c,
      status: etapeActuelle.next as any,
      status_history: [...(c.status_history || []), { status: etapeActuelle.next as any, changed_at: new Date().toISOString(), changed_by: 'atelier', notes: '' }]
    }))
    const newStatus = etapeActuelle.next === 'pret' ? 'pret' : 'en_cours'
    updateOrder(order.id, { clothes: updatedClothes, status: newStatus as any })
    const updated = { ...order, clothes: updatedClothes, status: newStatus as any }
    setOrder(updated)
    if (etapeActuelle.next === 'pret') {
      setSuccess(true)
      setTimeout(() => { setOrder(null); setTicket(''); setSuccess(false) }, 3000)
    }
  }

  const etape = order ? getEtapeCommande(order) : null
  const prochaine = etape?.next ? getEtape(etape.next) : null

  return (
    <div style={{ minHeight: '100vh', background: order ? etape?.color + '12' : '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, transition: 'background 0.5s' }}>

      {/* Logo */}
      <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        {config.logo ? <img src={config.logo} alt="logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, background: '#7c3aed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧺</div>}
        <div><p style={{ fontWeight: 900, fontSize: 16, margin: 0, color: '#1e293b' }}>{config.name || 'PressingManager'}</p><p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Atelier</p></div>
      </div>

      {/* ECRAN 1 — Saisie ticket */}
      {!order && !success && (
        <div style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
          <p style={{ fontSize: 80, margin: '0 0 16px' }}>🎫</p>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', margin: '0 0 8px' }}>Numéro du ticket</p>
          <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 32px' }}>Tapez ou scannez le code du client</p>
          <input type="text" value={ticket} onChange={e => setTicket(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && chercher()} placeholder="PM-123456" autoFocus
            style={{ width: '100%', padding: '20px 24px', fontSize: 30, fontWeight: 900, textAlign: 'center', border: '3px solid #e2e8f0', borderRadius: 16, outline: 'none', letterSpacing: 4, boxSizing: 'border-box', marginBottom: 16, color: '#1e293b' }} />
          {error && <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 16 }}><p style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', margin: 0 }}>❌ {error}</p></div>}
          <button onClick={chercher} disabled={!ticket.trim()}
            style={{ width: '100%', padding: '20px', fontSize: 22, fontWeight: 900, background: ticket.trim() ? '#7c3aed' : '#e2e8f0', color: ticket.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 16, cursor: ticket.trim() ? 'pointer' : 'not-allowed', marginBottom: 32 }}>
            🔍 Chercher
          </button>

          {/* Liste commandes rapide */}
          {orders.filter(o => o.status === 'en_cours' || o.status === 'en_attente').length > 0 && (
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase' }}>Commandes à traiter</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {orders.filter(o => o.status === 'en_cours' || o.status === 'en_attente').sort((a, b) => { const p: Record<string,number> = { vip: 0, express: 1, normal: 2, economique: 3 }; return (p[a.priority]||2)-(p[b.priority]||2) }).map(o => {
                  const etapeO = getEtapeCommande(o)
                  return (
                    <button key={o.id} onClick={() => { setTicket(o.ticket_number); setOrder(o); setError('') }}
                      style={{ background: '#fff', border: `2px solid ${o.priority === 'vip' || o.priority === 'express' ? etapeO.color : '#e2e8f0'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%' }}>
                      <span style={{ fontSize: 32 }}>{etapeO.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 900, fontSize: 16, margin: '0 0 2px', color: '#1e293b' }}>#{o.ticket_number} {(o.priority === 'vip' || o.priority === 'express') && <span style={{ marginLeft: 8, background: o.priority === 'vip' ? '#fef3c7' : '#fee2e2', color: o.priority === 'vip' ? '#92400e' : '#991b1b', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>{o.priority === 'vip' ? '⭐ VIP' : '⚡ Express'}</span>}</p>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{o.client?.first_name} {o.client?.last_name} • {o.clothes.length} article(s)</p>
                      </div>
                      <span style={{ background: etapeO.color + '20', color: etapeO.color, padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{etapeO.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ECRAN 2 — Commande active */}
      {order && !success && etape && (
        <div style={{ textAlign: 'center', maxWidth: 560, width: '100%' }}>
          {/* Client */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, border: '2px solid #e2e8f0' }}>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 4px' }}>Client</p>
            <p style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' }}>{order.client?.first_name} {order.client?.last_name}</p>
            <p style={{ fontSize: 20, color: '#7c3aed', fontWeight: 700, margin: '0 0 10px' }}>#{order.ticket_number}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ background: '#f1f5f9', padding: '6px 16px', borderRadius: 99, fontSize: 15, fontWeight: 700, color: '#475569' }}>{order.clothes.length} vêtement(s)</span>
              {order.priority !== 'normal' && <span style={{ background: order.priority === 'vip' ? '#fef3c7' : '#fee2e2', color: order.priority === 'vip' ? '#92400e' : '#991b1b', padding: '6px 16px', borderRadius: 99, fontSize: 15, fontWeight: 700 }}>{order.priority === 'vip' ? '⭐ VIP' : '⚡ Express'}</span>}
            </div>
          </div>

          {/* Étape actuelle */}
          <div style={{ background: etape.color, borderRadius: 24, padding: '32px 24px', marginBottom: 20, boxShadow: `0 8px 32px ${etape.color}40` }}>
            <p style={{ fontSize: 80, margin: '0 0 8px' }}>{etape.emoji}</p>
            <p style={{ fontSize: 34, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>{etape.label}</p>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: 0 }}>En cours pour toute la commande</p>
          </div>

          {/* Instructions spéciales */}
          {order.clothes.some(c => c.special_instructions) && (
            <div style={{ background: '#fff7ed', border: '3px solid #f97316', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#c2410c', margin: '0 0 10px' }}>⚠️ ATTENTION !</p>
              {order.clothes.filter(c => c.special_instructions).map((c, i) => (
                <p key={i} style={{ fontSize: 16, color: '#9a3412', margin: '0 0 6px', fontWeight: 600, textTransform: 'capitalize' }}>• {c.type} : {c.special_instructions}</p>
              ))}
            </div>
          )}

          {/* Résumé vêtements */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {order.clothes.map((c, i) => (
                <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>
                  {c.quantity}x {c.type} {c.color ? `(${c.color})` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Bouton principal ENORME */}
          {etape.next ? (
            <button onClick={avancer}
              style={{ width: '100%', padding: '28px', fontSize: 26, fontWeight: 900, background: prochaine?.color || '#059669', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', boxShadow: `0 8px 24px ${prochaine?.color || '#059669'}50`, marginBottom: 14 }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {prochaine?.emoji} Passer à : {prochaine?.label}
            </button>
          ) : (
            <div style={{ background: '#059669', borderRadius: 20, padding: 28, marginBottom: 14 }}>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>✅ Commande terminée !</p>
            </div>
          )}

          <button onClick={() => { setOrder(null); setTicket(''); setError('') }}
            style={{ background: 'transparent', border: '2px solid #e2e8f0', borderRadius: 14, padding: '14px 24px', fontSize: 16, fontWeight: 700, color: '#64748b', cursor: 'pointer', width: '100%' }}>
            ← Retour
          </button>
        </div>
      )}

      {/* ECRAN 3 — Succès */}
      {success && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 120, margin: '0 0 24px' }}>🎉</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: '#059669', margin: '0 0 8px' }}>Commande prête !</p>
          <p style={{ fontSize: 18, color: '#64748b' }}>Le client peut venir récupérer ses vêtements</p>
        </div>
      )}
    </div>
  )
}
