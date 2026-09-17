// src/pages/services/ServicesPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { servicePriceService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Button, Modal } from '../../components/ui'
import {
  Tag, Plus, Pencil, Trash2, Search, Filter, Clock, Zap,
  DollarSign, TrendingUp, Award, Shirt, Layers, Sparkles,
  CheckCircle2, XCircle, Crown, Percent, Package, Shield
} from 'lucide-react'

const DEFAULT_PRICES = [
  { id: 'chemise-lavage_simple',   cloth_type: 'chemise',    service_type: 'lavage_simple',    price: 1500, express_surcharge: 300,  duration_hours: 48 },
  { id: 'chemise-repassage',       cloth_type: 'chemise',    service_type: 'repassage',        price: 750,  express_surcharge: 150,  duration_hours: 24 },
  { id: 'chemise-nettoyage_sec',   cloth_type: 'chemise',    service_type: 'nettoyage_sec',    price: 2500, express_surcharge: 500,  duration_hours: 72 },
  { id: 'pantalon-lavage_simple',  cloth_type: 'pantalon',   service_type: 'lavage_simple',    price: 1500, express_surcharge: 300,  duration_hours: 48 },
  { id: 'pantalon-nettoyage_sec',  cloth_type: 'pantalon',   service_type: 'nettoyage_sec',    price: 2500, express_surcharge: 500,  duration_hours: 72 },
  { id: 'costume-nettoyage_sec',   cloth_type: 'costume',    service_type: 'nettoyage_sec',    price: 5000, express_surcharge: 1000, duration_hours: 72 },
  { id: 'robe-nettoyage_sec',      cloth_type: 'robe',       service_type: 'nettoyage_sec',    price: 3500, express_surcharge: 700,  duration_hours: 72 },
  { id: 'couverture-lavage_simple',cloth_type: 'couverture', service_type: 'lavage_simple',    price: 3000, express_surcharge: 600,  duration_hours: 96 },
  { id: 'tapis-lavage_simple',     cloth_type: 'tapis',      service_type: 'lavage_simple',    price: 5000, express_surcharge: 1000, duration_hours: 96 },
  { id: 'couette-lavage_simple',   cloth_type: 'couette',    service_type: 'lavage_simple',    price: 4000, express_surcharge: 800,  duration_hours: 96 },
  { id: 'chaussures-detachage',    cloth_type: 'chaussures', service_type: 'detachage',        price: 2000, express_surcharge: 400,  duration_hours: 48 },
  { id: 'tout-service_vip',        cloth_type: 'tout',       service_type: 'service_vip',      price: 8000, express_surcharge: 2000, duration_hours: 24 },
]

const SERVICE_LABELS: Record<string, string> = {
  lavage_simple: 'Lavage simple',
  lavage_express: 'Lavage express',
  repassage: 'Repassage',
  nettoyage_sec: 'Nettoyage a sec',
  detachage: 'Detachage',
  impermeabilisant: 'Impermeabilisant',
  service_vip: 'Service VIP',
}

const SERVICE_COLORS: Record<string, { bg: string; text: string }> = {
  lavage_simple:    { bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  lavage_express:   { bg: 'bg-amber-50',   text: 'text-amber-700' },
  repassage:        { bg: 'bg-violet-50',  text: 'text-violet-700' },
  nettoyage_sec:    { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  detachage:        { bg: 'bg-red-50',     text: 'text-red-700' },
  impermeabilisant: { bg: 'bg-blue-50',    text: 'text-blue-700' },
  service_vip:      { bg: 'bg-primary-fixed', text: 'text-primary' },
}

const CLOTH_ICONS: Record<string, any> = {
  chemise: Shirt,
  pantalon: Shirt,
  robe: Shirt,
  costume: Shirt,
  couverture: Package,
  tapis: Package,
  couette: Package,
  chaussures: Package,
  tout: Crown,
}

export const ServicesPageModern: React.FC = () => {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ price: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [newEntry, setNewEntry] = useState({ cloth_type: '', service_type: '', price: 0 })

  // ============================================
  // CHARGEMENT
  // ============================================
  const loadPrices = async () => {
    setLoading(true)
    try {
      const data = await servicePriceService.getAll()
      if (data.length > 0) {
        setPrices(data)
      } else {
        setPrices(DEFAULT_PRICES)
      }
    } catch (err) {
      console.error('Erreur chargement prix:', err)
      setPrices(DEFAULT_PRICES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrices() }, [])

  // ============================================
  // CALCULS
  // ============================================
  const allServices = useMemo(() => {
    const set = new Set(prices.map(p => p.service_type))
    return Array.from(set).sort()
  }, [prices])

  const stats = useMemo(() => {
    const avgPrice = prices.length > 0
      ? prices.reduce((s, p) => s + (p.price || 0), 0) / prices.length
      : 0

    // Prestation phare = service le plus frequent
    const serviceMap = new Map<string, number>()
    prices.forEach(p => {
      serviceMap.set(p.service_type, (serviceMap.get(p.service_type) || 0) + 1)
    })
    const topService = Array.from(serviceMap.entries()).sort((a, b) => b[1] - a[1])[0]

    // Prix max
    const maxPrice = prices.reduce((max, p) => Math.max(max, p.price || 0), 0)

    return {
      total: prices.length,
      avgPrice: Math.round(avgPrice),
      topService: topService ? topService[0] : '-',
      topServiceCount: topService ? topService[1] : 0,
      maxPrice,
    }
  }, [prices])

  const filtered = useMemo(() => {
    return prices.filter(p => {
      const ms = !search ||
        p.cloth_type?.toLowerCase().includes(search.toLowerCase()) ||
        p.service_type?.toLowerCase().includes(search.toLowerCase())
      const msv = !filterService || p.service_type === filterService
      return ms && msv
    })
  }, [prices, search, filterService])

  // ============================================
  // ACTIONS
  // ============================================
  const handleSave = async (p: any) => {
    try {
      await servicePriceService.upsert(p.cloth_type, p.service_type, editData.price)
      setPrices(ps => ps.map(pp => pp.id === p.id ? { ...pp, price: editData.price } : pp))
      toast.success('Tarif mis a jour', {
        description: `${p.cloth_type} - ${SERVICE_LABELS[p.service_type] || p.service_type} : ${editData.price.toLocaleString('fr-FR')} XOF`
      })
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
    setEditId(null)
  }

  const handleAdd = async () => {
    const clothType = newEntry.cloth_type.trim().toLowerCase()
    const serviceType = newEntry.service_type.trim().toLowerCase()
    if (!clothType || !serviceType || !newEntry.price) {
      toast.warning('Informations manquantes', { description: 'Tous les champs sont obligatoires' })
      return
    }
    try {
      const saved = await servicePriceService.upsert(clothType, serviceType, newEntry.price)
      setPrices(ps => [
        ...ps.filter(p => !(p.cloth_type === clothType && p.service_type === serviceType)),
        saved
      ])
      toast.success('Tarif ajoute', { description: `${clothType} - ${serviceType}` })
      setNewEntry({ cloth_type: '', service_type: '', price: 0 })
      setShowAdd(false)
    } catch (err) {
      toast.error('Erreur lors de l ajout')
    }
  }

  const handleDelete = async (p: any) => {
    if (!confirm(`Supprimer "${p.cloth_type} / ${(SERVICE_LABELS[p.service_type] || p.service_type)}" ?`)) return
    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(p.id)) {
        setPrices(ps => ps.filter(pp => pp.id !== p.id))
        toast.success('Tarif supprime', { description: p.cloth_type })
        return
      }
      await servicePriceService.delete(p.id)
      setPrices(ps => ps.filter(pp => pp.id !== p.id))
      toast.success('Tarif supprime', { description: p.cloth_type })
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Services & Tarifs
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              Catalogue dynamique
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {prices.length} prestation(s) configuree(s) · Appliquees automatiquement en caisse
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-modern-primary self-start md:self-auto">
          <Plus size={18} strokeWidth={2.5} />
          Ajouter un tarif
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-violet-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Total prestations</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                <Tag size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-violet-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.total}
              <span className="text-sm font-bold ml-1.5">tarifs</span>
            </div>
            <p className="text-[11px] text-violet-700 mt-2 font-medium">
              {allServices.length} type(s) de service
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Prix moyen</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <DollarSign size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.avgPrice.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">
              Marge operationnelle ~68%
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Prestation phare</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <Award size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-base font-black text-emerald-900 tracking-tight mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {SERVICE_LABELS[stats.topService] || stats.topService || '-'}
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              {stats.topServiceCount} declinaison(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tarif max</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                <Crown size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stats.maxPrice.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              Prestation VIP
            </p>
          </div>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">
          i
        </div>
        <div>
          <p className="text-xs font-bold text-blue-900 mb-1">Astuce Caisse</p>
          <p className="text-xs text-blue-700">
            Les prix configures ici sont automatiquement appliques lors de la creation d&apos;un ticket en caisse ou par les livreurs mobiles.
          </p>
        </div>
      </div>

      {/* RECHERCHE + FILTRE */}
      <div className="card-modern flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un vetement, un service..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Filter size={16} className="text-on-surface-variant shrink-0" />
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Tous les services</option>
            {allServices.map(s => (
              <option key={s} value={s}>{SERVICE_LABELS[s] || s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLEAU */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type d&apos;article</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Prestation</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Delai</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Prix</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Express</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const serviceLabel = SERVICE_LABELS[p.service_type] || p.service_type.replace(/_/g, ' ')
                  const serviceColor = SERVICE_COLORS[p.service_type] || { bg: 'bg-slate-100', text: 'text-slate-700' }
                  const Icon = CLOTH_ICONS[p.cloth_type] || Shirt
                  const isEditing = editId === p.id
                  return (
                    <tr key={p.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                            <Icon size={18} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface capitalize truncate">{p.cloth_type}</p>
                            <p className="text-xs text-on-surface-variant">Reference #{p.cloth_type.substring(0, 6).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={'badge-modern ' + serviceColor.bg + ' ' + serviceColor.text}>
                          {serviceLabel}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          <Clock size={12} />
                          <span>{p.duration_hours || 48}h</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={editData.price}
                            onChange={e => setEditData({ price: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-28 text-right"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {(p.price || 0).toLocaleString('fr-FR')}
                            <span className="text-xs font-medium text-on-surface-variant ml-1">XOF</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {p.express_surcharge > 0 ? (
                          <span className="badge-modern bg-emerald-50 text-emerald-700">
                            <Zap size={11} />
                            +{p.express_surcharge.toLocaleString('fr-FR')}
                          </span>
                        ) : (
                          <span className="badge-modern bg-slate-100 text-slate-500">
                            <XCircle size={11} />
                            Non
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSave(p)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition"
                            >
                              Sauver
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setEditId(p.id); setEditData({ price: p.price }) }}
                              className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white text-on-surface-variant transition-all flex items-center justify-center"
                              title="Modifier le prix"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-red-500 hover:text-white text-on-surface-variant transition-all flex items-center justify-center"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-modern text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
            <Tag size={28} className="text-on-surface-variant/50" />
          </div>
          <p className="text-sm font-bold text-on-surface mb-1">Aucun tarif</p>
          <p className="text-xs text-on-surface-variant mb-4">Ajoutez votre premiere prestation</p>
          <button onClick={() => setShowAdd(true)} className="btn-modern-primary mx-auto">
            <Plus size={16} strokeWidth={2.5} />
            Ajouter un tarif
          </button>
        </div>
      )}

      {/* SECTION MAJORATIONS */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Majorations & Options speciales
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Suppléments cumulables activables en un clic au moment de l&apos;enregistrement du ticket
            </p>
          </div>
          <Percent size={18} className="text-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Zap, label: 'Option Express 24h', desc: 'Traitement prioritaire', value: '+50%', color: 'amber' },
            { icon: Shield, label: 'Traitement Anti-acariens', desc: 'Couettes & tapis d&apos;interieur', value: '+1000 XOF', color: 'emerald' },
            { icon: Crown, label: 'Plage sous House Luxe', desc: 'Housse zippee reutilisable', value: 'Inclus', color: 'violet' },
          ].map((maj, i) => {
            const Icon = maj.icon
            const colorMap: Record<string, string> = {
              amber: 'from-amber-500 to-orange-400',
              emerald: 'from-emerald-500 to-emerald-400',
              violet: 'from-violet-500 to-violet-600',
            }
            return (
              <div key={i} className="rounded-2xl p-4 bg-surface-container-low border border-outline-variant/30 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className={'w-10 h-10 rounded-xl bg-gradient-to-br ' + colorMap[maj.color] + ' text-white flex items-center justify-center shadow-md'}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <span className="badge-modern bg-white border border-outline-variant/40 text-on-surface-variant font-bold">
                    {maj.value}
                  </span>
                </div>
                <p className="font-semibold text-sm text-on-surface">{maj.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{maj.desc}</p>
                <button className="mt-3 text-xs font-semibold text-primary hover:underline">
                  Configurer
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL AJOUTER */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un tarif" size="md">
        <form onSubmit={e => { e.preventDefault(); handleAdd() }} className="space-y-4">
          <Field label="Type de vetement" required>
            <Input
              required
              value={newEntry.cloth_type}
              onChange={e => setNewEntry({ ...newEntry, cloth_type: e.target.value })}
              placeholder="Ex: ensemble militaire, doudoune..."
            />
          </Field>

          <Field label="Type de service" required>
            <Input
              required
              value={newEntry.service_type}
              onChange={e => setNewEntry({ ...newEntry, service_type: e.target.value })}
              placeholder="Ex: nettoyage sec, repassage delicat..."
            />
          </Field>

          <Field label="Prix (XOF)" required>
            <Input
              type="number"
              min="0"
              required
              value={newEntry.price}
              onChange={e => setNewEntry({ ...newEntry, price: Math.max(0, parseInt(e.target.value) || 0) })}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Ajouter</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ServicesPageModern

