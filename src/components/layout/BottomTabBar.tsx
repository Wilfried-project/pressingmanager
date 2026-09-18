// src/components/layout/BottomTabBar.tsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../lib/store'
import { ALL_MODULES, ROLE_PERMISSIONS } from './Layout'

// ============================================
// 5 onglets prioritaires pour mobile
// ============================================
const MOBILE_TABS = [
  { path: '/',        label: 'Accueil', icon: 'grid_view',           activeIcon: 'grid_view' },
  { path: '/orders',  label: 'Commandes', icon: 'receipt_long',      activeIcon: 'receipt_long' },
  { path: '/atelier', label: 'Scan',    icon: 'qr_code_scanner',    activeIcon: 'qr_code_scanner' },
  { path: '/cashier', label: 'Caisse',  icon: 'point_of_sale',      activeIcon: 'point_of_sale' },
  { path: '/clients', label: 'Clients', icon: 'groups',             activeIcon: 'groups' },
]

const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 22, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
)

export const BottomTabBar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()

  // Filtrer selon les permissions du user
  const userPermissions: string[] = user?.permissions?.length
    ? user.permissions
    : ROLE_PERMISSIONS[user?.role || 'employe'] || ['/']

  const visibleTabs = MOBILE_TABS.filter(tab => userPermissions.includes(tab.path))

  // Ne rien afficher si aucun onglet dispo (au cas où)
  if (visibleTabs.length === 0) return null

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div className="flex items-stretch justify-around" style={{ minHeight: 62 }}>
        {visibleTabs.map(tab => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path)

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 transition-colors relative ' +
                (isActive ? 'text-violet-600' : 'text-slate-500 active:bg-slate-50')
              }
            >
              {/* Indicateur actif (barre en haut) */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-violet-600"
                  aria-hidden
                />
              )}

              {/* Icone */}
              <span
                className={
                  'flex items-center justify-center w-9 h-9 rounded-xl transition-all ' +
                  (isActive ? 'bg-violet-100' : '')
                }
              >
                <Icon
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  className={isActive ? 'material-symbols-outlined-filled' : ''}
                />
              </span>

              {/* Label */}
              <span
                className={
                  'text-[10px] font-semibold tracking-tight ' +
                  (isActive ? 'text-violet-700' : 'text-slate-500')
                }
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomTabBar
