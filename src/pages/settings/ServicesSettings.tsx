import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useShopConfig } from '../../lib/store'
import { toast } from '../../lib/toast'
import {
  Plus, Trash2, Edit2, Save, X, Tag, Shirt, DollarSign,
  Package, Search, ChevronDown, Check
} from 'lucide-react'

// ============================================
// Types de base
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

export const ServicesSettings: React.FC = () => {
  const { config } = useShopConfig()
  const [tenantId, setTenantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Prix personnalisés chargés depuis Supabase
  const [prices, setPrices] = useState<ServicePrice[]>([])

  // Recherche
  const [searchCloth, setSearchCloth] = useState('')

  // Modal d'édition de prix
  const [editPrice, setEditPrice] = useState<{ cloth_type: string; service_type: string; price: number } | null>(null)

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
  // Charger les prix depuis service_prices
  // ============================================
  const loadPrices = async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('cloth_type', { ascending: true })
      if (error) throw error
      setPrices(data || [])
    } catch (err) {
      console.error('Erreur chargement prix:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrices() }, [tenantId])

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
      // Upsert : on cherche si la combinaison existe déjà
      const existing = prices.find(
        p => p.cloth_type === editPrice.cloth_type && p.service_type === editPrice.service_type
      )

      if (existing) {
        // Update
        const { error } = await supabase
          .from('service_prices')
          .update({ price: editPrice.price })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        // Insert
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
      await loadPrices()
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
      await loadPrices()
    } catch (err: any) {
      toast.error('Erreur', { description: err.message })
    }
  }

  // ============================================
  // Helper : récupérer le prix pour une combinaison
  // ============================================
  const getPrice = (clothType: string, serviceType: string): number | null => {
    const found = prices.find(p => p.cloth_type === clothType && p.service_type === serviceType)
    return found ? found.price : null
  }

  // ============================================
  // Filtrer les vêtements par recherche
  // ============================================
  const filteredClothTypes = useMemo(() => {
    if (!searchCloth) return DEFAULT_CLOTH_TYPES
    return DEFAULT_CLOTH_TYPES.filter(ct =>
      ct.label.toLowerCase().includes(searchCloth.toLowerCase())
    )
  }, [searchCloth])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold tracking-wider uppercase">
              <Tag size={12} />
              Personnalisation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Services & Tarifs
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Définissez vos prix par type de vêtement et par service
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-sm text-blue-900">Comment ça marche ?</p>
          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
            Pour chaque combinaison <strong>vêtement × service</strong>, définissez le prix.
            Ce prix sera automatiquement appliqué lors de la création d'une commande.
            Si vous ne définissez pas de prix, le prix par défaut du service sera utilisé.
          </p>
        </div>
      </div>

      {/* Section 1 — Type de vêtements */}
      <div className="card-modern">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shirt size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-on-surface">Types de vêtements</h2>
            <p className="text-xs text-on-surface-variant">{DEFAULT_CLOTH_TYPES.length} types disponibles</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CLOTH_TYPES.map(ct => (
            <span key={ct.value} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-medium">
              <Shirt size={12} className="text-purple-600" />
              {ct.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant mt-3 italic">
          💡 Pour modifier la liste des vêtements, contactez le support.
        </p>
      </div>

      {/* Section 2 — Grille tarifaire */}
      <div className="card-modern">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-600" />
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
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low border-y border-outline-variant/30">
                  <th className="py-3 px-5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-low z-10">
                    Vêtement
                  </th>
                  {DEFAULT_SERVICES.map(svc => (
                    <th key={svc.value} className="py-3 px-4 text-center text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                      {svc.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClothTypes.map(ct => (
                  <tr key={ct.value} className="border-b border-outline-variant/20 hover:bg-primary-fixed/10 transition">
                    <td className="py-3 px-5 sticky left-0 bg-white z-10 font-semibold text-sm text-on-surface">
                      {ct.label}
                    </td>
                    {DEFAULT_SERVICES.map(svc => {
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
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[80px] ${
                                price
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-transparent'
                              }`}
                              title={price ? `Prix: ${price.toLocaleString('fr-FR')} XOF` : `Prix par défaut: ${svc.defaultPrice.toLocaleString('fr-FR')} XOF`}
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
          💡 Cliquez sur un prix pour le modifier. Les prix sans fond vert utilisent le prix par défaut du service.
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
                  {DEFAULT_CLOTH_TYPES.find(c => c.value === editPrice.cloth_type)?.label} · {DEFAULT_SERVICES.find(s => s.value === editPrice.service_type)?.label}
                </p>
              </div>
              <button onClick={() => setEditPrice(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Prix (XOF)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editPrice.price}
                  onChange={e => setEditPrice({ ...editPrice, price: parseFloat(e.target.value) || 0 })}
                  onFocus={e => e.target.value === '0' && (e.target.value = '')}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Prix par défaut : {DEFAULT_SERVICES.find(s => s.value === editPrice.service_type)?.defaultPrice.toLocaleString('fr-FR')} XOF
                </p>
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
    </div>
  )
}

export default ServicesSettings