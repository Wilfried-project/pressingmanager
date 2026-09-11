import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useOrderStore, useStockStore, useNotificationStore, useShopConfig } from '../../lib/store'
import { supabase } from '../../lib/supabase'

// Icône Material Symbols (Google) — celle utilisée par le design Stitch.
const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 20, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
)

export const ALL_MODULES = [
  { path: '/', label: 'Tableau de bord', icon: 'grid_view', group: 'Principal' },
  { path: '/orders', label: 'Commandes', icon: 'receipt_long', group: 'Principal' },
  { path: '/clients', label: 'Clients', icon: 'groups', group: 'Clients & Ventes' },
  { path: '/billing', label: 'Facturation', icon: 'request_quote', group: 'Clients & Ventes' },
  { path: '/cashier', label: 'Caisse', icon: 'point_of_sale', group: 'Clients & Ventes' },
  { path: '/loyalty', label: 'Fidélité', icon: 'loyalty', group: 'Clients & Ventes' },
  { path: '/stock', label: 'Stock', icon: 'inventory_2', group: 'Opérations' },
  { path: '/delivery', label: 'Livraisons', icon: 'local_shipping', group: 'Opérations' },
  { path: '/notifications', label: 'Notifications', icon: 'notifications', group: 'Opérations' },
  { path: '/agenda', label: 'Agenda', icon: 'calendar_month', group: 'Opérations' },
  { path: '/atelier', label: 'Atelier', icon: 'qr_code_scanner', group: 'Opérations' },
  { path: '/hr', label: 'Employés & RH', icon: 'badge', group: 'Équipe' },
  { path: '/accounting', label: 'Comptabilité', icon: 'account_balance_wallet', group: 'Finance' },
  { path: '/reports', label: 'Rapports', icon: 'monitoring', group: 'Finance' },
  { path: '/services', label: 'Services & Tarifs', icon: 'sell', group: 'Administration' },
  { path: '/settings', label: 'Paramètres', icon: 'settings', group: 'Administration' },
  { path: '/users', label: 'Utilisateurs', icon: 'manage_accounts', group: 'Administration' },
]

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_MODULES.map(m => m.path),
  caissier: ['/', '/cashier', '/billing', '/clients', '/loyalty'],
  employe: ['/', '/orders'],
  livreur: ['/', '/delivery'],
  comptable: ['/', '/accounting', '/reports', '/billing'],
  responsable: ['/', '/orders', '/clients', '/stock', '/hr', '/reports', '/billing', '/cashier', '/loyalty', '/notifications', '/agenda'],
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { config } = useShopConfig()
  const getLateOrders = useOrderStore(s => s.getLateOrders)
  const getLowStockItems = useStockStore(s => s.getLowStockItems)
  const getPendingNotifications = useNotificationStore(s => s.getPendingNotifications)

  const lateCount = getLateOrders().length
  const lowStockCount = getLowStockItems().length
  const alertCount = lateCount + lowStockCount

  const userPermissions: string[] = user?.permissions?.length
    ? user.permissions
    : ROLE_PERMISSIONS[user?.role || 'employe'] || ['/']

  const allowedModules = ALL_MODULES.filter(m => userPermissions.includes(m.path))

  const groups = allowedModules.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof ALL_MODULES>)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between overflow-y-auto transition-transform duration-200`}>
        <div className="p-space-lg">
          <div className="flex items-center gap-space-md mb-space-xl px-space-xs">
            {config.logo
              ? <img src={config.logo} alt="logo" className="h-8 w-auto object-contain" />
              : <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center text-on-primary"><Icon name="local_laundry_service" size={18} /></div>
            }
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight leading-none">{config.name || 'PressingManager'}</span>
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest mt-space-2xs">{user?.full_name || ''}</span>
            </div>
          </div>
          <nav className="flex flex-col gap-space-md">
            {Object.entries(groups).map(([groupLabel, items]) => (
              <div key={groupLabel} className="flex flex-col gap-space-2xs">
                <span className="font-label-sm text-label-sm text-outline px-space-md uppercase font-bold tracking-wider">{groupLabel}</span>
                {items.map(item => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-all ${isActive ? 'bg-primary-container text-on-primary font-label-lg shadow-[0_4px_12px_rgba(124,58,237,0.2)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}>
                      <Icon name={item.icon} size={20} />
                      <span className="font-label-md text-label-md">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Contenu + en-tête */}
      <div className="lg:pl-64">
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40">
          <div className="h-16 w-full px-space-md lg:px-space-xl flex items-center justify-between gap-space-lg">
            <div className="flex items-center gap-space-md">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-surface-container rounded-lg text-on-surface-variant">
                <Icon name={sidebarOpen ? 'close' : 'menu'} size={22} />
              </button>
              <div className="hidden md:flex items-center flex-1 max-w-xl relative">
                <span className="material-symbols-outlined absolute left-space-md text-outline pointer-events-none" style={{ fontSize: 20 }}>search</span>
                <input className="w-full pl-10 pr-space-lg py-space-xs bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-full shadow-[0_1px_3px_rgba(15,23,42,0.05)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline" placeholder="Rechercher un ticket, client, téléphone..." type="text" />
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              {alertCount > 0 && (
                <button onClick={() => navigate('/orders')} className="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-error-container text-on-error-container rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>warning</span>
                  <span className="font-label-sm text-label-sm font-bold">{alertCount} alerte(s)</span>
                </button>
              )}
              <button onClick={() => navigate('/orders')} className="hidden sm:flex items-center gap-space-xs px-space-lg py-space-xs bg-primary-container text-on-primary font-label-md text-label-md rounded-full hover:bg-primary shadow-[0_2px_8px_rgba(124,58,237,0.25)] active:scale-95 transition-all">
                <Icon name="add" size={18} />
                <span>Nouvelle Commande</span>
              </button>
              <div className="flex items-center gap-space-sm pl-space-sm">
                <div className="text-right hidden sm:flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">{user?.full_name || 'Admin'}</span>
                  <span className="font-label-sm text-label-sm text-outline leading-tight capitalize">{user?.role || 'admin'}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <button onClick={handleLogout} className="p-1.5 hover:bg-error-container text-outline hover:text-error rounded-full transition" title="Déconnexion">
                  <Icon name="logout" size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 bg-background min-h-screen">
          <div className="max-w-[1440px] w-full mx-auto px-space-lg lg:px-space-xl py-space-xl">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 lg:hidden z-40" onClick={() => setSidebarOpen(false)} />}
    </div>
  )
}
