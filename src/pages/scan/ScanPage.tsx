import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export const ScanPage: React.FC = () => {
  const { ticket } = useParams<{ ticket: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrder = async () => {
      if (!ticket) { setError('Ticket invalide'); setLoading(false); return }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`*, client:clients(*), clothes(*)`)
          .eq('ticket_number', ticket.toUpperCase())
          .single()
        if (error || !data) { setError('Commande introuvable'); setLoading(false); return }
        setOrder(data)
      } catch { setError('Erreur de chargement') }
      finally { setLoading(false) }
    }
    loadOrder()
  }, [ticket])

  const STATUS_LABELS: Record<string, string> = {
    recu: 'Reçu', tri: 'Tri', lavage: 'Lavage', sechage: 'Séchage',
    repassage: 'Repassage', emballage: 'Emballage', pret: 'Prêt', livre: 'Livré'
  }

  const STATUS_COLORS: Record<string, string> = {
    recu: '#6b7280', tri: '#6366f1', lavage: '#06b6d4', sechage: '#f97316',
    repassage: '#ef4444', emballage: '#8b5cf6', pret: '#059669', livre: '#16a34a'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #6c47ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff', padding: 24 }}>
      <div style={{ textAlign: 'center', background: 'white', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 64, marginBottom: 16 }}>❌</p>
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Commande introuvable</h2>
        <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Le ticket #{ticket} n'existe pas ou a déjà été livré.</p>
      </div>
    </div>
  )

  const statusColor = STATUS_COLORS[order.status] || '#6b7280'

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#6c47ff', borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center', color: 'white' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🧺</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>PressingManager</h1>
          <p style={{ fontSize: 14, opacity: 0.8 }}>Suivi de commande</p>
        </div>

        {/* Info commande */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Ticket</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#6c47ff' }}>#{order.ticket_number}</p>
            </div>
            <div style={{ background: statusColor + '20', color: statusColor, padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
              {STATUS_LABELS[order.status] || order.status}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8f7ff', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Client</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{order.client?.first_name} {order.client?.last_name}</p>
            </div>
            <div style={{ background: '#f8f7ff', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Articles</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{order.clothes?.length || 0} vêtement(s)</p>
            </div>
            <div style={{ background: '#f8f7ff', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Date dépôt</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{new Date(order.received_at || order.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div style={{ background: '#f8f7ff', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Date prévue</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{order.expected_at ? new Date(order.expected_at).toLocaleDateString('fr-FR') : 'Non définie'}</p>
            </div>
          </div>
        </div>

        {/* Vêtements */}
        {order.clothes && order.clothes.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Vêtements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {order.clothes.map((cloth: any, i: number) => {
                const clothStatus = STATUS_LABELS[cloth.status] || cloth.status
                const clothColor = STATUS_COLORS[cloth.status] || '#6b7280'
                return (
                  <div key={cloth.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8f7ff', borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#6c47ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{cloth.type} {cloth.color ? `— ${cloth.color}` : ''}</p>
                      <p style={{ fontSize: 12, color: '#6b7280' }}>{cloth.service?.replace(/_/g, ' ')} • Qté: {cloth.quantity}</p>
                    </div>
                    <span style={{ background: clothColor + '20', color: clothColor, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{clothStatus}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Message statut */}
        {order.status === 'pret' && (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 16, padding: 20, marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>Vos vêtements sont prêts !</p>
            <p style={{ fontSize: 14, color: '#15803d', marginTop: 4 }}>Vous pouvez venir les récupérer.</p>
          </div>
        )}
      </div>
    </div>
  )
}
