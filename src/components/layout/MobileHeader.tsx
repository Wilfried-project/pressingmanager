// src/components/layout/MobileHeader.tsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, useOrderStore, useStockStore, useShopConfig } from '../../lib/store'
import { useCommandPalette } from '../../lib/useCommandPalette'

const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 20, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
)

export const MobileHeader: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { config } = useShopConfig()
  const { open: openPalette } = useCommandPalette()
  const getLateOrders = useOrderStore(s => s.getLateOrders)
  const getLowStockItems = useStockStore(s => s.getLowStockItems)

  const alertCount = getLateOrders().length + getLowStockItems().length

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header
      className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between gap-3 h-14 px-4">
        {/* Logo + Nom */}
        <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
          {config.logo ? (
            <img
              src={config.logo}
              alt="logo"
              className="h-8 w-8 object-contain rounded-lg shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center text-white shrink-0">
              <Icon name="local_laundry_service" size={16} />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 truncate">
              {config.name || 'PressingManager'}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {user?.full_name || 'Utilisateur'}
            </div>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Recherche (ouvre palette Cmd+K) */}
          <button
            onClick={openPalette}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
            aria-label="Recherche"
          >
            <Icon name="search" size={20} />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition relative"
            aria-label="Notifications"
          >
            <Icon name="notifications" size={20} />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <Link
            to="/settings"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm"
            aria-label="Mon compte"
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default MobileHeader
