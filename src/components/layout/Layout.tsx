import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Bell, ChevronRight } from 'lucide-react'
import { useAuthStore, useOrderStore, useStockStore, useNotificationStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'

const navGroups = [
  { label: 'Principal', items: [
    { path: '/', label: 'Tableau de bord', icon: '📊' },
    { path: '/orders', label: 'Commandes', icon: '🧺' },
    { path: '/clothes', label: 'Suivi vêtements', icon: '👔' },
  ]},
  { label: 'Clients & Ventes', items: [
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/billing', label: 'Facturation', icon: '🧾' },
    { path: '/cashier', label: 'Caisse', icon: '💰' },
    { path: '/loyalty', label: 'Fidélité', icon: '⭐' },
  ]},
  { label: 'Opérations', items: [
    { path: '/stock', label: 'Stock', icon: '📦' },
    { path: '/delivery', label: 'Livraisons', icon: '🚚' },
    { path: '/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/agenda', label: 'Agenda', icon: '📅' },
  ]},
  { label: 'Équipe', items: [
    { path: '/hr', label: 'Employés & RH', icon: '👷' },
  ]},
  { label: 'Finance', items: [
    { path: '/accounting', label: 'Comptabilité', icon: '📒' },
    { path: '/reports', label: 'Rapports', icon: '📈' },
  ]},
  { label: 'Administration', items: [
    { path: '/services', label: 'Services & Tarifs', icon: '💲' },
    { path: '/multiagency', label: 'Multi-agences', icon: '🏢' },
    { path: '/settings', label: 'Paramètres', icon: '⚙️' },
  ]},
]

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const getLateOrders = useOrderStore(s => s.getLateOrders)
  const getLowStockItems = useStockStore(s => s.getLowStockItems)
  const getPendingNotifications = useNotificationStore(s => s.getPendingNotifications)

  const lateCount = getLateOrders().length
  const lowStockCount = getLowStockItems().length
  const pendingNotifs = getPendingNotifications().length
  const alertCount = lateCount + lowStockCount

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white text-lg">🧺</div>
                <div className="hidden sm:block">
                  <p className="text-lg font-bold text-purple-700 leading-none">PressingManager</p>
                  <p className="text-xs text-gray-400">Gestion professionnelle</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingNotifs > 0 && (
                <button onClick={() => navigate('/notifications')} className="relative p-2 hover:bg-gray-100 rounded-lg">
                  <Bell size={20} className="text-gray-600" />
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{pendingNotifs}</span>
                </button>
              )}
              {alertCount > 0 && (
                <button className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  ⚠️ {alertCount} alerte(s)
                </button>
              )}
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800 leading-none">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</p>
                </div>
                <button onClick={handleLogout} className="ml-1 p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition" title="Déconnexion">
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative w-64 bg-white border-r border-gray-200 transition-transform duration-200 z-20 h-full overflow-y-auto flex-shrink-0 flex flex-col`}>
          {/* Alerts in sidebar */}
          {(lateCount > 0 || lowStockCount > 0) && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              {lateCount > 0 && <p className="text-xs text-red-700 font-semibold">⚠️ {lateCount} retard(s)</p>}
              {lowStockCount > 0 && <p className="text-xs text-red-700 font-semibold mt-0.5">📦 {lowStockCount} rupture(s) stock</p>}
            </div>
          )}

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-medium ${isActive ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'}`}>
                        <span className="text-base">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight size={14} />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">PressingManager v1.0.0</p>
            <p className="text-xs text-gray-300 text-center">© 2024 — Tous droits réservés</p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 lg:hidden z-10" onClick={() => setSidebarOpen(false)} />}
    </div>
  )
}
