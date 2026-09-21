import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useShopConfig } from '../../lib/store'
import { toast } from '../../lib/toast'
import {
  Plus, Trash2, Save, X, Tag, Shirt, DollarSign,
  Search, ShoppingBag
} from 'lucide-react'

// ============================================
// Types de base (par défaut, non supprimables)
// ============================================
const DEFAULT_CLOTH_TYPES = [
  { value: 'chemise', label: 'Chemise' },
  { value: 'pantalon', label: 'Pantalon' },
  { value: 'robe', label: 'Robe' },
  { value: 'costume', label: 'Costume' },
  { value: 'veste', label: 'Veste' },
  { value: 'manteau', label: 'Manteau' },
  { value: 'jupe', label: 'Jupe' },
  { value: 'pull', label: 'Pull' },
  { value: 'tshirt', label: 'T-Shirt' },
  { value: 'cravate', label: 'Cravate' },
  { value: 'couverture', label: 'Couverture' },
  { value: 'rideau', label: 'Rideau' },
  { value: 'nappe', label: 'Nappe' },
  { value: 'tapis', label: 'Tapis' },
  { value: 'couette', label: 'Couette' },
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'sac', label: 'Sac' },
  { value: 'autre', label: 'Autre' },
]

const DEFAULT_SERVICES = [
  { value: 'lavage_simple', label: 'Lavage simple', defaultPrice: 1500 },
  { value: 'lavage_express', label: 'Lavage express', defaultPrice: 2500 },
  { value: 'repassage', label: 'Repassage', defaultPrice: 750 },
  { value: 'nettoyage_sec', label: 'Nettoyage à sec', defaultPrice: 3500 },
  { value: 'detachage', label: 'Détachage', defaultPrice: 1500 },
  { value: 'impermeabilisant', label: 'Imperméabilisant', defaultPrice: 2500 },
  { value: 'service_vip', label: 'Service VIP complet', defaultPrice: 8000 },
]

interface ServicePrice {
  id?: string
  tenant_id?: string
  cloth_type: string
  service_type: string
  price: number
  created_at?: string
}

interface CustomItem {
  id: string
  tenant_id: string
  label: string
  base_price?: number
  icon?: string
  is_active: boolean
  created_at: string
}

// ✅ NOUVEAU : types pour la fusion
interface ServiceItem {
  value: string
  label: string
  defaultPrice: number
  isCustom: boolean
  id?: string
}

interface ClothItem {
  value: string
  label: string
  isCustom: boolean
  id?: string
}

// ============================================
// COMPOSANT
// ============================================
export const ServicesSettings: React.FC = () => {
  const { config } = useShopConfig()
  const [tenantId, setTenantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Données
  const [prices, setPrices] = useState<ServicePrice[]>([])
  const [customServices, setCustomServices] = useState<CustomItem[]>([])
  const [customClothTypes, setCustomClothTypes] = useState<CustomItem[]>([])

  // Recherche
  const [searchCloth, setSearchCloth] = useState('')

  // Modals
  const [editPrice, setEditPrice] = useState<{ cloth_type: string; service_type: string; price: number } | null>(null)
  const [showAddService, setShowAddService] = useState(false)
  const [showAddCloth, setShowAddCloth] = useState(false)
  const [newServiceLabel, setNewServiceLabel] = useState('')
  const [newServicePrice, setNewServicePrice] = useState(1500)
  const [newClothLabel, setNewClothLabel] = useState('')

  // ============================================
  // Charger le tenant_id
  // ============================================
  useEffect(() => {
    const loadTenant = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: emp } = await supabase
        .from('employees')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .single()
      if (emp?.tenant_id) setTenantId(emp.tenant_id)
    }
    loadTenant()
  }, [])

  // ============================================
  // Charger toutes les données
  // ============================================
  const loadAll = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const [pricesRes, servicesRes, clothRes] = await Promise.all([
        supabase.from('service_prices').select('*').eq('tenant_id', tenantId).order('cloth_type'),
        supabase.from('custom_services').select('*').eq('tenant_id', tenantId).order('created_at'),
        supabase.from('custom_cloth_types').select('*').eq('tenant_id', tenantId).order('created_at'),
      ])
      setPrices(pricesRes.data || [])
      setCustomServices(servicesRes.data || [])
      setCustomClothTypes(clothRes.data || [])
    } catch (err) {
      console.error('Erreur chargement:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [tenantId])

  // ============================================
  // Fusionner services par défaut + personnalisés
  // ============================================
  const allServices = useMemo<ServiceItem[]>(() => {
    const base: ServiceItem[] = DEFAULT_SERVICES.map(s => ({
      value: s.value,
      label: s.label,
      defaultPrice: s.defaultPrice,
      isCustom: false,
    }))
    const custom: ServiceItem[] = customServices.map(cs => ({
      value: cs.label.toLowerCase().replace(/\s+/g, '_'),
      label: cs.label,
      defaultPrice: cs.base_price || 0,
      isCustom: true,
      id: cs.id,
    }))
    return [...base, ...custom]
  }, [customServices])

  // ============================================
  // Fusionner vêtements par défaut + personnalisés
  // ============================================
  const allClothTypes = useMemo<ClothItem[]>(() => {
    const base: ClothItem[] = DEFAULT_CLOTH_TYPES.map(ct => ({
      value: ct.value,
      label: ct.label,
      isCustom: false,
    }))
    const custom: ClothItem[] = customClothTypes.map(cct => ({
      value: cct.label.toLowerCase().replace(/\s+/g, '_'),
      label: cct.label,
      isCustom: true,
      id: cct.id,
    }))
    return [...base, ...custom]
  }, [customClothTypes])

  // ============================================
  // Sauvegarder un prix
  // ============================================
  const handleSavePrice = async () => {
    if (!editPrice || !tenantId) return
    if (editPrice.price <= 0) {
      toast.error('Le prix doit être supérieur à 0')
      return
    }

    setSaving(true)
    try {
      const existing = prices.find(
        p => p.cloth_type === editPrice.cloth_type && p.service_type === editPrice.service_type
      )

      if (existing) {
        const { error } = await supabase
          .from('service_prices')
          .update({ price: editPrice.price })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('service_prices')
          .insert({
            tenant_id: tenantId,
            cloth_type: editPrice.cloth_type,
            service_type: editPrice.service_type,
            price: editPrice.price,
          })
        if (error) throw error
      }

      toast.success('Prix enregistré !')
      setEditPrice(null)
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Supprimer un prix
  // ============================================
  const handleDeletePrice = async (id: string) => {
    if (!confirm('Supprimer ce prix ?')) return
    try {
      const { error } = await supabase.from('service_prices').delete().eq('id', id)
      if (error) throw error
      toast.success('Prix supprimé')
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    }
  }

  // ============================================
  // Ajouter un service personnalisé
  // ============================================
  const handleAddService = async () => {
    if (!newServiceLabel.trim() || !tenantId) {
      toast.error('Nom du service requis')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('custom_services').insert({
        tenant_id: tenantId,
        label: newServiceLabel.trim(),
        base_price: newServicePrice,
      })
      if (error) throw error
      toast.success('Service ajouté !')
      setNewServiceLabel('')
      setNewServicePrice(1500)
      setShowAddService(false)
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Supprimer un service personnalisé
  // ============================================
  const handleDeleteService = async (id: string, label: string) => {
    if (!confirm(`Supprimer le service "${label}" ?\n\nLes prix associés seront aussi supprimés.`)) return
    try {
      const { error } = await supabase.from('custom_services').delete().eq('id', id)
      if (error) throw error
      toast.success('Service supprimé')
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    }
  }

  // ============================================
  // Ajouter un type de vêtement personnalisé
  // ============================================
  const handleAddCloth = async () => {
    if (!newClothLabel.trim() || !tenantId) {
      toast.error('Nom du vêtement requis')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('custom_cloth_types').insert({
        tenant_id: tenantId,
        label: newClothLabel.trim(),
      })
      if (error) throw error
      toast.success('Vêtement ajouté !')
      setNewClothLabel('')
      setShowAddCloth(false)
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Supprimer un type de vêtement personnalisé
  // ============================================
  const handleDeleteCloth = async (id: string, label: string) => {
    if (!confirm(`Supprimer le vêtement "${label}" ?\n\nLes prix associés seront aussi supprimés.`)) return
    try {
      const { error } = await supabase.from('custom_cloth_types').delete().eq('id', id)
      if (error) throw error
      toast.success('Vêtement supprimé')
      await loadAll()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    }
  }

  // ============================================
  // Helper : récupérer le prix
  // ============================================
  const getPrice = (clothType: string, serviceType: string): number | null => {
    const found = prices.find(p => p.cloth_type === clothType && p.service_type === serviceType)
    return found ? found.price : null
  }

  // ============================================
  // Filtrer les vêtements
  // ============================================
  const filteredClothTypes = useMemo(() => {
    if (!searchCloth) return allClothTypes
    return allClothTypes.filter(ct =>
      ct.label.toLowerCase().includes(searchCloth.toLowerCase())
    )
  }, [allClothTypes, searchCloth])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold tracking-wider uppercase">
            <Tag size={12} />
            Personnalisation
          </span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Services & Tarifs</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Gérez vos services, types de vêtements et prix
        </p>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-sm text-blue-900">Comment ça marche ?</p>
          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
            Ajoutez vos propres services et vêtements, puis définissez les prix dans la grille.
            Les prix s'appliquent automatiquement lors de la création d'une commande.
          </p>
        </div>
      </div>

      {/* ========== SECTION 1 : Services ========== */}
      <div className="card-modern">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <ShoppingBag size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Services</h2>
              <p className="text-xs text-on-surface-variant">{allServices.length} services disponibles</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddService(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition"
          >
            <Plus size={16} />
            Ajouter un service
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allServices.map(s => (
            <div
              key={s.value}
              className={`group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-medium ${
                s.isCustom
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              <span>{s.label}</span>
              <span className="text-[10px] opacity-60">({s.defaultPrice} XOF)</span>
              {s.isCustom && (
                <button
                  onClick={() => s.id && handleDeleteService(s.id, s.label)}
                  className="w-4 h-4 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center"
                  title="Supprimer ce service"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========== SECTION 2 : Types de vêtements ========== */}
      <div className="card-modern">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shirt size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Types de vêtements</h2>
              <p className="text-xs text-on-surface-variant">{allClothTypes.length} types disponibles</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCloth(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
          >
            <Plus size={16} />
            Ajouter un vêtement
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allClothTypes.map(ct => (
            <div
              key={ct.value}
              className={`group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-medium ${
                ct.isCustom
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              <Shirt size={12} className={ct.isCustom ? 'text-emerald-600' : 'text-purple-600'} />
              <span>{ct.label}</span>
              {ct.isCustom && (
                <button
                  onClick={() => ct.id && handleDeleteCloth(ct.id, ct.label)}
                  className="w-4 h-4 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center"
                  title="Supprimer ce vêtement"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========== SECTION 3 : Grille tarifaire ========== */}
      <div className="card-modern">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Grille tarifaire</h2>
              <p className="text-xs text-on-surface-variant">{prices.length} prix personnalisés</p>
            </div>
          </div>
          <div className="relative w-full lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchCloth}
              onChange={e => setSearchCloth(e.target.value)}
              placeholder="Rechercher un vêtement..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-on-surface-variant mt-3">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-low border-y border-outline-variant/30">
                  <th className="py-3 px-5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10">
                    Vêtement
                  </th>
                  {allServices.map(svc => (
                    <th key={svc.value} className="py-3 px-3 text-center text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      {svc.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClothTypes.map(ct => (
                  <tr key={ct.value} className="border-b border-outline-variant/20 hover:bg-primary-fixed/10 transition">
                    <td className="py-3 px-5 sticky left-0 bg-white z-10 font-semibold text-sm text-on-surface">
                      <div className="flex items-center gap-2">
                        <Shirt size={12} className="text-purple-600" />
                        {ct.label}
                      </div>
                    </td>
                    {allServices.map(svc => {
                      const price = getPrice(ct.value, svc.value)
                      const existing = prices.find(p => p.cloth_type === ct.value && p.service_type === svc.value)
                      return (
                        <td key={svc.value} className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1 group">
                            <button
                              onClick={() => setEditPrice({
                                cloth_type: ct.value,
                                service_type: svc.value,
                                price: price || svc.defaultPrice
                              })}
                              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[70px] ${
                                price
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-transparent'
                              }`}
                            >
                              {price ? price.toLocaleString('fr-FR') : svc.defaultPrice.toLocaleString('fr-FR')}
                            </button>
                            {existing && (
                              <button
                                onClick={() => existing.id && handleDeletePrice(existing.id)}
                                className="w-6 h-6 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                                title="Supprimer ce prix"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-on-surface-variant mt-3 italic">
          💡 Cliquez sur un prix pour le modifier. Les prix sans fond vert utilisent le prix par défaut.
        </p>
      </div>

      {/* ============================================ */}
      {/* MODAL : Modifier un prix */}
      {/* ============================================ */}
      {editPrice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditPrice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-lg">Modifier le prix</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {allClothTypes.find(c => c.value === editPrice.cloth_type)?.label} · {allServices.find(s => s.value === editPrice.service_type)?.label}
                </p>
              </div>
              <button onClick={() => setEditPrice(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prix (XOF)</label>
                <input
                  type="number"
                  min="0"
                  value={editPrice.price}
                  onChange={e => setEditPrice({ ...editPrice, price: parseFloat(e.target.value) || 0 })}
                  onFocus={e => e.target.value === '0' && (e.target.value = '')}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSavePrice}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
                <button
                  onClick={() => setEditPrice(null)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL : Ajouter un service */}
      {/* ============================================ */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddService(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ShoppingBag size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Nouveau service</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ajouter un service personnalisé</p>
                </div>
              </div>
              <button onClick={() => setShowAddService(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du service *</label>
                <input
                  type="text"
                  value={newServiceLabel}
                  onChange={e => setNewServiceLabel(e.target.value)}
                  placeholder="Ex: Lavage à la main"
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prix par défaut (XOF)</label>
                <input
                  type="number"
                  min="0"
                  value={newServicePrice}
                  onChange={e => setNewServicePrice(parseFloat(e.target.value) || 0)}
                  onFocus={e => e.target.value === '0' && (e.target.value = '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddService}
                  disabled={saving || !newServiceLabel.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                  Ajouter
                </button>
                <button
                  onClick={() => { setShowAddService(false); setNewServiceLabel(''); setNewServicePrice(1500) }}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL : Ajouter un vêtement */}
      {/* ============================================ */}
      {showAddCloth && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddCloth(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Shirt size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Nouveau vêtement</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ajouter un type de vêtement</p>
                </div>
              </div>
              <button onClick={() => setShowAddCloth(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du vêtement *</label>
                <input
                  type="text"
                  value={newClothLabel}
                  onChange={e => setNewClothLabel(e.target.value)}
                  placeholder="Ex: Cravate en soie"
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddCloth}
                  disabled={saving || !newClothLabel.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                  Ajouter
                </button>
                <button
                  onClick={() => { setShowAddCloth(false); setNewClothLabel('') }}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesSettings