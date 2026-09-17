// src/pages/stock/StockPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useStockStore } from '../../lib/store'
import { stockService } from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Button, Modal } from '../../components/ui'
import {
  Package, AlertTriangle, Wallet, Layers, Plus, Search, Trash2,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, Box, Filter, Sparkles
} from 'lucide-react'
import type { StockItem } from '../../types'

const CATEGORIES = ['lessive', 'eau_javel', 'detachant', 'parfum', 'sacs', 'etiquettes', 'cintres', 'emballages', 'autre']

export const StockPageModern: React.FC = () => {
  const { items: localItems, addItem, deleteItem, addMovement } = useStockStore()
  const [items, setItems] = useState<StockItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showMovement, setShowMovement] = useState<StockItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState({
    name: '',
    category: 'lessive' as StockItem['category'],
    quantity: 0,
    unit: 'L',
    min_threshold: 5,
    purchase_price: 0,
    supplier: ''
  })
  const [mvt, setMvt] = useState({
    type: 'entree' as 'entree' | 'sortie',
    quantity: 0,
    reason: ''
  })

  useEffect(() => {
    stockService.getAll()
      .then(data => setItems(data as StockItem[]))
      .catch(() => setItems(localItems))
  }, [])

  // ============================================
  // CALCULS
  // ============================================
  const lowStock = useMemo(() => items.filter(i => i.quantity <= i.min_threshold), [items])

  const filtered = useMemo(() => {
    return items.filter(i => {
      const ms = i.name.toLowerCase().includes(search.toLowerCase())
      const mc = !filterCategory || i.category === filterCategory
      return ms && mc
    })
  }, [items, search, filterCategory])

  const stockValue = items.reduce((s, i) => s + (i.quantity * (i.purchase_price || 0)), 0)
  const categoriesCount = new Set(items.map(i => i.category)).size
  const criticalPct = items.length > 0 ? (lowStock.length / items.length) * 100 : 0

  // ============================================
  // ACTIONS
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.warning('Nom obligatoire', { description: 'Veuillez saisir le nom du produit' })
      return
    }
    try {
      const item = await stockService.create({
        id: crypto.randomUUID(),
        agency_id: 'default',
        ...form,
        quantity: Number(form.quantity),
        min_threshold: Number(form.min_threshold),
        purchase_price: Number(form.purchase_price),
        created_at: new Date().toISOString()
      })
      setItems([...items, item as StockItem])
      toast.success('Produit ajoute au stock', { description: form.name })
    } catch {
      addItem({
        id: crypto.randomUUID(),
        agency_id: 'default',
        ...form,
        quantity: Number(form.quantity),
        min_threshold: Number(form.min_threshold),
        purchase_price: Number(form.purchase_price),
        created_at: new Date().toISOString()
      })
      toast.success('Enregistre localement', { description: 'Sera synchronise plus tard' })
    }
    setShowForm(false)
    setForm({ name: '', category: 'lessive', quantity: 0, unit: 'L', min_threshold: 5, purchase_price: 0, supplier: '' })
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showMovement) return
    if (!mvt.reason || mvt.quantity <= 0) {
      toast.warning('Informations manquantes', { description: 'Quantite et raison obligatoires' })
      return
    }

    const newQty = mvt.type === 'entree'
      ? showMovement.quantity + Number(mvt.quantity)
      : showMovement.quantity - Number(mvt.quantity)

    try {
      await stockService.update(showMovement.id, { quantity: newQty })
      setItems(items.map(i => i.id === showMovement.id ? { ...i, quantity: newQty } : i))
      toast.success(mvt.type === 'entree' ? 'Entree enregistree' : 'Sortie enregistree', {
        description: `${mvt.quantity} ${showMovement.unit} · Nouveau stock: ${newQty} ${showMovement.unit}`
      })
    } catch {
      addMovement({
        id: crypto.randomUUID(),
        stock_item_id: showMovement.id,
        type: mvt.type,
        quantity: Number(mvt.quantity),
        reason: mvt.reason,
        created_by: 'system',
        created_at: new Date().toISOString()
      })
      toast.success('Enregistre localement')
    }
    setShowMovement(null)
    setMvt({ type: 'entree', quantity: 0, reason: '' })
  }

  const handleDelete = async (item: StockItem) => {
    if (!confirm(`Supprimer "${item.name}" du stock ?`)) return
    try {
      await stockService.delete(item.id)
      setItems(items.filter(i => i.id !== item.id))
      toast.success('Produit supprime', { description: item.name })
    } catch {
      deleteItem(item.id)
      toast.success('Supprime localement')
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
              Gestion des Stocks
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              Atelier & Logistique
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Suivi temps reel des consommables · {items.length} reference(s)
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-modern-primary self-start md:self-auto">
          <Plus size={18} strokeWidth={2.5} />
          Ajouter un produit
        </button>
      </div>

      {/* ALERTE RUPTURE */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-white border border-red-100 animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">{lowStock.length} produit(s) en rupture de stock</p>
            <p className="text-xs text-red-600 mt-0.5">
              Reapprovisionnement recommande sous 48h
            </p>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-violet-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Total references</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                <Package size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-violet-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {items.length}
              <span className="text-sm font-bold ml-1.5">articles</span>
            </div>
            <p className="text-[11px] text-violet-700 mt-2 font-medium">
              {categoriesCount} famille(s) de produits
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-red-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Alertes rupture</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-400 text-white flex items-center justify-center shadow-md">
                <AlertTriangle size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {lowStock.length}
              <span className="text-sm font-bold ml-1.5">critique(s)</span>
            </div>
            <p className="text-[11px] text-red-700 mt-2 font-medium">
              {criticalPct.toFixed(0)}% du stock total
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Valeur du stock</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {stockValue.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              Valeur immobilisee
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Categories</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <Layers size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {categoriesCount}
              <span className="text-sm font-bold ml-1.5">familles</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">
              Categories suivies
            </p>
          </div>
        </div>
      </div>

      {/* RECHERCHE + FILTRE */}
      <div className="card-modern flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Filter size={16} className="text-on-surface-variant shrink-0" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium text-on-surface cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">Toutes les categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLEAU */}
      {filtered.length > 0 ? (
        <div className="card-modern !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Produit</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Categorie</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[180px]">Disponibilite</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Seuil min</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Prix achat</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fournisseur</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                  <th className="py-3.5 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isCritical = item.quantity <= item.min_threshold
                  const gaugePct = Math.min(100, Math.round((item.quantity / Math.max(1, item.min_threshold * 3)) * 100))
                  return (
                    <tr key={item.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' +
                            (isCritical ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600')
                          }>
                            <Box size={18} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-on-surface truncate">{item.name}</div>
                            <div className="text-xs text-on-surface-variant truncate">{item.unit}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="badge-modern bg-surface-container text-on-surface-variant capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={
                            'text-sm font-bold ' +
                            (isCritical ? 'text-red-600' : 'text-emerald-600')
                          }>
                            {item.quantity} {item.unit}
                          </span>
                          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className={'h-full rounded-full transition-all ' + (isCritical ? 'bg-red-500' : 'bg-emerald-500')}
                              style={{ width: gaugePct + '%' }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center text-sm font-semibold text-on-surface">
                        {item.min_threshold} {item.unit}
                      </td>
                      <td className="py-4 px-5 text-right text-sm font-semibold text-on-surface">
                        {(item.purchase_price || 0).toLocaleString('fr-FR')} XOF
                      </td>
                      <td className="py-4 px-5 text-sm text-on-surface-variant">
                        {item.supplier || '-'}
                      </td>
                      <td className="py-4 px-5">
                        <span className={
                          'badge-modern ' +
                          (isCritical ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')
                        }>
                          <span className={'w-1.5 h-1.5 rounded-full ' + (isCritical ? 'bg-red-500' : 'bg-emerald-500')} />
                          {isCritical ? 'Rupture' : 'En stock'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setShowMovement(item)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-all"
                            title="Mouvement de stock"
                          >
                            Mouvement
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
            <Package size={28} className="text-on-surface-variant/50" />
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Aucun produit en stock</p>
          <button onClick={() => setShowForm(true)} className="btn-modern-primary mx-auto">
            <Plus size={16} strokeWidth={2.5} />
            Ajouter un produit
          </button>
        </div>
      )}

      {/* MODAL NOUVEAU PRODUIT */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau produit en stock" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nom du produit" required>
            <Input
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Lessive liquide Ariel"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categorie">
              <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as StockItem['category'] })}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </Select>
            </Field>
            <Field label="Unite">
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="L, kg, pieces..." />
            </Field>
            <Field label="Quantite initiale">
              <Input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Seuil d'alerte">
              <Input type="number" min="0" value={form.min_threshold} onChange={e => setForm({ ...form, min_threshold: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Prix d'achat (XOF)">
              <Input type="number" min="0" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Fournisseur">
              <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Nom du fournisseur" />
            </Field>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MOUVEMENT */}
      <Modal open={!!showMovement} onClose={() => { setShowMovement(null); setMvt({ type: 'entree', quantity: 0, reason: '' }) }} title={'Mouvement de stock - ' + (showMovement?.name || '')} size="md">
        <form onSubmit={handleMovement} className="space-y-4">
          <div className="rounded-xl p-4 text-center bg-gradient-to-br from-violet-50 to-cyan-50 border border-violet-100">
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Stock actuel</p>
            <p className="text-3xl font-black text-violet-700" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {showMovement?.quantity} <span className="text-lg">{showMovement?.unit}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMvt({ ...mvt, type: 'entree' })}
              className={
                'p-3 rounded-xl border-2 text-center font-semibold transition flex items-center justify-center gap-2 ' +
                (mvt.type === 'entree' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-outline-variant/40 text-on-surface-variant')
              }
            >
              <ArrowUpCircle size={16} /> Entree
            </button>
            <button
              type="button"
              onClick={() => setMvt({ ...mvt, type: 'sortie' })}
              className={
                'p-3 rounded-xl border-2 text-center font-semibold transition flex items-center justify-center gap-2 ' +
                (mvt.type === 'sortie' ? 'border-red-500 bg-red-50 text-red-700' : 'border-outline-variant/40 text-on-surface-variant')
              }
            >
              <ArrowDownCircle size={16} /> Sortie
            </button>
          </div>

          <Field label="Quantite" required>
            <Input type="number" min="1" required value={mvt.quantity} onChange={e => setMvt({ ...mvt, quantity: parseInt(e.target.value) || 0 })} />
          </Field>

          <Field label="Raison" required>
            <Input required value={mvt.reason} onChange={e => setMvt({ ...mvt, reason: e.target.value })} placeholder="Ex: Achat fournisseur, Utilisation atelier..." />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowMovement(null); setMvt({ type: 'entree', quantity: 0, reason: '' }) }}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StockPageModern
