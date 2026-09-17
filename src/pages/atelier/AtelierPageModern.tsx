import React, { useState, useRef, useMemo } from 'react'
import { useOrderStore, useShopConfig } from '../../lib/store'
import type { Order } from '../../types'
import {
  ScanLine, Keyboard, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Package, Waves, Shirt, ClipboardCheck, ShoppingBag, Camera, X, Zap
} from 'lucide-react'
import { StatusBadge, Avatar, KpiCard } from '../../components/ui'

const ETAPES = [
  { key: 'recu',      label: 'Recu',      color: '#64748b', next: 'tri' },
  { key: 'tri',       label: 'Tri',       color: '#6366f1', next: 'lavage' },
  { key: 'lavage',    label: 'Lavage',    color: '#06b6d4', next: 'sechage' },
  { key: 'sechage',   label: 'Sechage',   color: '#f97316', next: 'repassage' },
  { key: 'repassage', label: 'Repassage', color: '#ef4444', next: 'emballage' },
  { key: 'emballage', label: 'Emballage', color: '#8b5cf6', next: 'pret' },
  { key: 'pret',      label: 'PRET !',    color: '#059669', next: null },
]

const getEtape = (key: string) => ETAPES.find(e => e.key === key) || ETAPES[0]

const getEtapeCommande = (order: Order) => {
  const statuts = order.clothes.map(c => c.status)
  for (const etape of ETAPES) {
    if (statuts.some(s => s === etape.key)) return etape
  }
  return ETAPES[0]
}

const ETAPE_TO_BADGE: Record<string, any> = {
  recu: 'pending', tri: 'inProgress', lavage: 'inProgress', sechage: 'inProgress',
  repassage: 'inProgress', emballage: 'inProgress', pret: 'ready'
}

export const AtelierPageModern: React.FC = () => {
  const { orders, updateOrder } = useOrderStore()
  const { config } = useShopConfig()
  const [ticket, setTicket] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stats = useMemo(() => {
    const enCours = orders.filter(o => o.status !== 'livre' && o.status !== 'annule')
    return {
      tri: enCours.filter(o => o.clothes.some(c => c.status === 'recu' || c.status === 'tri')).length,
      lavage: enCours.filter(o => o.clothes.some(c => c.status === 'lavage')).length,
      repassage: enCours.filter(o => o.clothes.some(c => c.status === 'sechage' || c.status === 'repassage')).length,
      controle: enCours.filter(o => o.clothes.some(c => c.status === 'emballage')).length,
      prets: orders.filter(o => o.status === 'pret').length,
    }
  }, [orders])

  const filePrioritaire = useMemo(() => {
    const priorityMap: Record<string, number> = { vip: 0, express: 1, normal: 2, economique: 3 }
    return orders
      .filter(o => o.status !== 'livre' && o.status !== 'annule')
      .sort((a, b) => (priorityMap[a.priority] || 2) - (priorityMap[b.priority] || 2))
      .slice(0, 8)
  }, [orders])

  const handleFound = (ticketNum: string) => {
    const clean = ticketNum.split('/').pop() || ticketNum
    setTicket(clean.toUpperCase())
    const found = orders.find(o =>
      o.ticket_number.toLowerCase() === clean.toLowerCase() &&
      o.status !== 'livre' && o.status !== 'annule'
    )
    if (found) { setOrder(found); setError(''); setSuccess(false) }
    else { setError('Ticket introuvable : ' + clean) }
  }

  const startScan = async () => {
    setScanning(true)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              stopScan()
              handleFound(barcodes[0].rawValue)
              return
            }
          } catch {}
          if (streamRef.current) requestAnimationFrame(scan)
        }
        requestAnimationFrame(scan)
      } else {
        setError('Scanner non supporte - utilisez Chrome recent')
        stopScan()
      }
    } catch {
      setError('Autorisez la camera dans votre navigateur')
      setScanning(false)
    }
  }

  const stopScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }

  const chercher = () => handleFound(ticket)

  const avancer = () => {
    if (!order) return
    const etapeActuelle = getEtapeCommande(order)
    if (!etapeActuelle.next) return
    const updatedClothes = order.clothes.map(c => ({
      ...c,
      status: etapeActuelle.next as any,
      status_history: [...(c.status_history || []), {
        status: etapeActuelle.next as any,
        changed_at: new Date().toISOString(),
        changed_by: 'atelier',
        notes: ''
      }]
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

  /* ======================= SUCCES ======================= */
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle2 size={64} className="text-emerald-600" />
          </div>
          <h1
            className="text-4xl font-extrabold text-emerald-600 mb-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Commande prete !
          </h1>
          <p className="text-on-surface-variant">Le client peut venir recuperer ses vetements</p>
        </div>
      </div>
    )
  }

  /* ======================= ECRAN COMMANDE ACTIVE ======================= */
  if (order && etape) {
    return (
      <div
        className="min-h-screen rounded-2xl p-6 transition-all duration-500"
        style={{ background: `${etape.color}10` }}
      >
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Header ticket */}
          <div className="card-modern mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={`${order.client?.first_name || '?'} ${order.client?.last_name || ''}`} size="lg" />
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Client</p>
                <p className="text-2xl font-extrabold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {order.client?.first_name} {order.client?.last_name}
                </p>
                <p className="text-primary font-bold mt-0.5">#{order.ticket_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge-modern bg-surface-container text-on-surface-variant">
                <Package size={12} />
                {order.clothes.length} vetement(s)
              </span>
              {order.priority !== 'normal' && (
                <StatusBadge status={order.priority === 'vip' ? 'vip' : 'urgent'} label={order.priority === 'vip' ? 'VIP' : 'Express'} />
              )}
            </div>
          </div>

          {/* Etape actuelle */}
          <div
            className="rounded-3xl p-8 mb-5 text-center"
            style={{
              background: etape.color,
              boxShadow: `0 12px 40px ${etape.color}50`
            }}
          >
            <p className="text-white/70 text-sm uppercase tracking-widest font-bold mb-2">
              Etape actuelle
            </p>
            <p
              className="text-5xl font-extrabold text-white mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {etape.label}
            </p>
            <p className="text-white/80 text-sm">En cours pour toute la commande</p>
          </div>

          {/* Instructions speciales */}
          {order.clothes.some(c => c.special_instructions) && (
            <div className="rounded-2xl p-5 mb-5 bg-amber-50 border-2 border-amber-300 animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <p className="text-lg font-extrabold text-amber-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ATTENTION !
                </p>
              </div>
              {order.clothes.filter(c => c.special_instructions).map((c, i) => (
                <p key={i} className="text-amber-800 font-semibold text-sm capitalize mb-1">
                  - {c.type} : {c.special_instructions}
                </p>
              ))}
            </div>
          )}

          {/* Liste des articles */}
          <div className="card-modern mb-5">
            <p className="text-sm font-bold text-on-surface mb-3">Articles a traiter</p>
            <div className="flex flex-wrap gap-2">
              {order.clothes.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30"
                >
                  <Shirt size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-on-surface capitalize">
                    {c.quantity}x {c.type}
                  </span>
                  {c.color && <span className="text-xs text-on-surface-variant">({c.color})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Bouton action principal */}
          {etape.next ? (
            <button
              onClick={avancer}
              className="w-full py-7 rounded-2xl font-extrabold text-2xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] mb-4 shadow-lg flex items-center justify-center gap-3"
              style={{
                background: prochaine?.color || '#059669',
                boxShadow: `0 12px 32px ${prochaine?.color || '#059669'}50`,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <ArrowRight size={28} strokeWidth={3} />
              Passer a : {prochaine?.label}
            </button>
          ) : (
            <div className="rounded-2xl p-7 mb-4 bg-emerald-600 text-center">
              <p className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Commande terminee !
              </p>
            </div>
          )}

          <button
            onClick={() => { setOrder(null); setTicket(''); setError('') }}
            className="w-full py-4 rounded-2xl bg-white border-2 border-outline-variant/40 text-on-surface-variant font-bold hover:bg-surface-container transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Retour a la recherche
          </button>
        </div>
      </div>
    )
  }

  /* ======================= ECRAN PRINCIPAL (SCAN) ======================= */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-3xl font-extrabold text-on-surface tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Atelier & Traitement Technique
            </h1>
            <span className="badge-modern bg-emerald-50 text-emerald-700">
              <span className="badge-dot bg-emerald-500 animate-pulse" />
              Douchette connectee
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Pointez au pistolet code-barres, scan QR ou tapez le numero de ticket
          </p>
        </div>
      </div>

      {/* KPI etapes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Tri & Reception"
          value={stats.tri}
          unit="en attente"
          icon={<ClipboardCheck size={18} />}
        />
        <KpiCard
          label="Lavage Tambour"
          value={stats.lavage}
          unit="en machine"
          icon={<Waves size={18} />}
        />
        <KpiCard
          label="Repassage"
          value={stats.repassage}
          unit="sous presse"
          icon={<Shirt size={18} />}
        />
        <KpiCard
          label="Controle Qualite"
          value={stats.controle}
          unit="en inspection"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Prets en Caisse"
          value={stats.prets}
          unit="cintres"
          icon={<ShoppingBag size={18} />}
          variant="primary"
        />
      </div>

      {/* Zone scan + file */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Colonne gauche : SCAN */}
        <div className="flex flex-col gap-4">
          <div className="card-modern">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center">
                <ScanLine size={18} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Poste Rapide
                </h3>
                <p className="text-xs text-on-surface-variant">Numero du ticket / piece</p>
              </div>
            </div>

            {scanning ? (
              <div className="mb-4">
                <video
                  ref={videoRef}
                  className="w-full rounded-2xl border-4 border-primary max-h-72 object-cover"
                  playsInline
                  muted
                />
                <p className="text-xs text-center text-on-surface-variant mt-3 mb-3">
                  Pointez vers le QR code du ticket
                </p>
                <button
                  onClick={stopScan}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-600 border-2 border-red-200 font-bold flex items-center justify-center gap-2"
                >
                  <X size={16} /> Arreter le scan
                </button>
              </div>
            ) : (
              <button
                onClick={startScan}
                className="w-full py-5 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white font-extrabold text-lg mb-4 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Camera size={22} />
                Activer le Scan Camera
              </button>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-outline-variant/40" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                ou saisie manuelle
              </span>
              <div className="flex-1 h-px bg-outline-variant/40" />
            </div>

            <div className="relative mb-4">
              <Keyboard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={ticket}
                onChange={e => setTicket(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && chercher()}
                placeholder="PM-123456"
                autoFocus
                className="w-full pl-12 pr-4 py-5 text-2xl font-extrabold text-center tracking-widest border-2 border-outline-variant/40 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
            </div>

            {error && (
              <div className="rounded-xl p-3 mb-4 bg-red-50 border border-red-200 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={chercher}
              disabled={!ticket.trim()}
              className={`w-full py-4 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition ${
                ticket.trim()
                  ? 'bg-primary text-white hover:bg-primary-container shadow-md'
                  : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              }`}
            >
              <ArrowRight size={18} strokeWidth={3} />
              Pointer la piece & Charger
            </button>
          </div>
        </div>

        {/* Colonne droite : FILE PRIORITAIRE */}
        <div className="card-modern">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                File de traitement prioritaire
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {filePrioritaire.length} commande(s) en attente
              </p>
            </div>
            <Zap size={18} className="text-amber-500" />
          </div>

          {filePrioritaire.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
              {filePrioritaire.map(o => {
                const etapeO = getEtapeCommande(o)
                const isUrgent = o.priority === 'vip' || o.priority === 'express'
                return (
                  <button
                    key={o.id}
                    onClick={() => { setTicket(o.ticket_number); setOrder(o); setError('') }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:shadow-md flex items-center gap-3 ${
                      isUrgent
                        ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <Avatar name={`${o.client?.first_name || '?'} ${o.client?.last_name || ''}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-primary">#{o.ticket_number}</span>
                        {isUrgent && (
                          <StatusBadge status={o.priority === 'vip' ? 'vip' : 'urgent'} label={o.priority === 'vip' ? 'VIP' : 'Express'} />
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {o.client?.first_name} {o.client?.last_name} - {o.clothes.length} article(s)
                      </p>
                    </div>
                    <StatusBadge status={ETAPE_TO_BADGE[etapeO.key] || 'pending'} label={etapeO.label} />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">Aucune commande en attente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AtelierPageModern
