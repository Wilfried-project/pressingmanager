// src/components/CommandPalette.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommandPalette } from '../lib/useCommandPalette'
import { useOrderStore, useClientStore, useShopConfig } from '../lib/store'
import {
  Search, Package, Users, Wallet, Gift, Settings, LayoutDashboard,
  ScanLine, Plus, ArrowRight, ChevronRight, Command as CommandIcon,
  FileText, Bell, Calendar, BarChart3, Truck, Box, UserCog, X
} from 'lucide-react'

interface CommandItem {
  id: string
  type: 'navigation' | 'action' | 'client' | 'order'
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate()
  const { isOpen, close } = useCommandPalette()
  const { orders } = useOrderStore()
  const { clients } = useClientStore()
  const { config } = useShopConfig()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Construire la liste des commandes
  const allCommands: CommandItem[] = useMemo(() => {
    const nav = (path: string) => () => { navigate(path); close() }

    const commands: CommandItem[] = [
      // ===== Navigation =====
      { id: 'nav-dashboard', type: 'navigation', label: 'Tableau de bord', description: 'Vue d\'ensemble', icon: <LayoutDashboard size={18} />, action: nav('/'), keywords: ['accueil', 'dashboard', 'home'] },
      { id: 'nav-orders', type: 'navigation', label: 'Commandes', description: 'Toutes les commandes', icon: <Package size={18} />, action: nav('/orders'), keywords: ['tickets', 'depots'] },
      { id: 'nav-clients', type: 'navigation', label: 'Clients', description: 'Répertoire clients', icon: <Users size={18} />, action: nav('/clients'), keywords: ['contacts'] },
      { id: 'nav-cashier', type: 'navigation', label: 'Caisse', description: 'Point de vente', icon: <Wallet size={18} />, action: nav('/cashier'), keywords: ['pos', 'paiement', 'encaissement'] },
      { id: 'nav-atelier', type: 'navigation', label: 'Atelier', description: 'Scan QR et traitement', icon: <ScanLine size={18} />, action: nav('/atelier'), keywords: ['scan', 'lavage', 'repassage'] },
      { id: 'nav-loyalty', type: 'navigation', label: 'Fidélité', description: 'Points et coupons', icon: <Gift size={18} />, action: nav('/loyalty'), keywords: ['points', 'recompenses', 'vip'] },
      { id: 'nav-agenda', type: 'navigation', label: 'Agenda', description: 'Planning et événements', icon: <Calendar size={18} />, action: nav('/agenda'), keywords: ['calendrier', 'planning'] },
      { id: 'nav-billing', type: 'navigation', label: 'Facturation', description: 'Factures et paiements', icon: <FileText size={18} />, action: nav('/billing'), keywords: ['factures'] },
      { id: 'nav-notifications', type: 'navigation', label: 'Notifications', description: 'SMS et WhatsApp', icon: <Bell size={18} />, action: nav('/notifications'), keywords: ['messages', 'sms', 'whatsapp'] },
      { id: 'nav-stock', type: 'navigation', label: 'Stock', description: 'Produits et consommables', icon: <Box size={18} />, action: nav('/stock'), keywords: ['lessive', 'produits'] },
      { id: 'nav-delivery', type: 'navigation', label: 'Livraisons', description: 'Tournées coursiers', icon: <Truck size={18} />, action: nav('/delivery'), keywords: ['coursier', 'collecte'] },
      { id: 'nav-accounting', type: 'navigation', label: 'Comptabilité', description: 'Recettes et dépenses', icon: <BarChart3 size={18} />, action: nav('/accounting'), keywords: ['compta', 'finances'] },
      { id: 'nav-reports', type: 'navigation', label: 'Rapports', description: 'Statistiques', icon: <BarChart3 size={18} />, action: nav('/reports'), keywords: ['stats', 'analytics'] },
      { id: 'nav-hr', type: 'navigation', label: 'Employés & RH', description: 'Équipe et pointages', icon: <UserCog size={18} />, action: nav('/hr'), keywords: ['rh', 'equipe', 'personnel'] },
      { id: 'nav-settings', type: 'navigation', label: 'Paramètres', description: 'Configuration', icon: <Settings size={18} />, action: nav('/settings'), keywords: ['config', 'reglages'] },

      // ===== Actions =====
      { id: 'action-new-order', type: 'action', label: 'Nouvelle commande', description: 'Créer un dépôt client', icon: <Plus size={18} />, action: () => { navigate('/orders'); close(); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-order')), 300) }, keywords: ['creer', 'depot', 'nouveau'] },
      { id: 'action-new-client', type: 'action', label: 'Nouveau client', description: 'Ajouter un client', icon: <Plus size={18} />, action: () => { navigate('/clients'); close() }, keywords: ['creer', 'ajouter', 'nouveau'] },
      { id: 'action-scan', type: 'action', label: 'Scanner QR code', description: 'Pointer un ticket', icon: <ScanLine size={18} />, action: nav('/atelier'), keywords: ['scan', 'qr', 'camera'] },
      { id: 'action-open-cashier', type: 'action', label: 'Ouvrir la caisse', description: 'Session de caisse', icon: <Wallet size={18} />, action: nav('/cashier'), keywords: ['caisse', 'ouvrir', 'session'] },
    ]

    // ===== Commandes récentes (5) =====
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map<CommandItem>(o => ({
        id: 'order-' + o.id,
        type: 'order',
        label: `#${o.ticket_number}`,
        description: `${o.client?.first_name || ''} ${o.client?.last_name || ''} · ${o.total?.toLocaleString('fr-FR') || 0} XOF`,
        icon: <Package size={18} />,
        action: () => { navigate('/orders'); close() },
        keywords: [o.ticket_number, o.client?.first_name || '', o.client?.last_name || '', o.client?.phone || ''],
      }))

    // ===== Clients (10 max) =====
    const topClients = clients.slice(0, 10).map<CommandItem>(c => ({
      id: 'client-' + c.id,
      type: 'client',
      label: `${c.first_name} ${c.last_name || ''}`.trim(),
      description: `${c.phone} · ${c.loyalty_points || 0} pts`,
      icon: <Users size={18} />,
      action: () => { navigate('/clients'); close() },
      keywords: [c.first_name, c.last_name || '', c.phone, c.email || ''],
    }))

    return [...commands, ...recentOrders, ...topClients]
  }, [orders, clients, navigate, close])

  // Filtrer selon la recherche
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase().trim()
    return allCommands.filter(cmd => {
      const searchable = [cmd.label, cmd.description || '', ...(cmd.keywords || [])].join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }, [allCommands, query])

  // Reset l'index quand la liste change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll vers l'élément sélectionné
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    }
  }

  if (!isOpen) return null

  // Grouper par type
  const groups = [
    { label: 'Actions rapides', items: filtered.filter(f => f.type === 'action') },
    { label: 'Navigation', items: filtered.filter(f => f.type === 'navigation') },
    { label: 'Commandes récentes', items: filtered.filter(f => f.type === 'order') },
    { label: 'Clients', items: filtered.filter(f => f.type === 'client') },
  ].filter(g => g.items.length > 0)

  let globalIndex = -1

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(15,23,42,0.25), 0 8px 20px rgba(108,71,255,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header avec input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un client, ticket, action..."
            className="flex-1 text-base bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <button
            onClick={close}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Liste des résultats */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">Aucun résultat</p>
              <p className="text-xs text-slate-500">Essayez avec d'autres mots-clés</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <div className="px-5 pt-4 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map(item => {
                  globalIndex++
                  const idx = globalIndex
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={
                        'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ' +
                        (isSelected ? 'bg-violet-50' : 'hover:bg-slate-50')
                      }
                    >
                      <div className={
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ' +
                        (isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600')
                      }>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={
                          'font-semibold text-sm truncate ' +
                          (isSelected ? 'text-violet-900' : 'text-slate-900')
                        }>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className={
                            'text-xs truncate mt-0.5 ' +
                            (isSelected ? 'text-violet-700' : 'text-slate-500')
                          }>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="shrink-0 text-violet-500">
                          <ChevronRight size={16} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer avec raccourcis */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold">↑↓</kbd>
              <span>Naviguer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold">↵</kbd>
              <span>Sélectionner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold">Esc</kbd>
              <span>Fermer</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
            <CommandIcon size={12} />
            <span>PressingManager</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
