import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './lib/store'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ClientsPage } from './pages/clients/ClientsPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { CashierPage } from './pages/cashier/CashierPage'
import { UsersPage } from './pages/users/UsersPage'
import {
  StockPage, HRPage, NotificationsPage, LoyaltyPage,
  AgendaPage, MultiAgencyPage, AccountingPage, ReportsPage,
  ServicesPage, DeliveryPage, BillingPage, SettingsPage
} from './pages/AllPages'

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore(s => s.user)
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function App() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setSession } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSession(session)
          setUser({ id: session.user.id, email: session.user.email || '', full_name: session.user.email?.split('@')[0] || 'Admin', phone: '', role: 'admin', agency_id: 'default', is_active: true, permissions: [], created_at: new Date().toISOString() })
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        setSession(session)
        setUser({ id: session.user.id, email: session.user.email || '', full_name: session.user.email?.split('@')[0] || 'Admin', phone: '', role: 'admin', agency_id: 'default', is_active: true, permissions: [], created_at: new Date().toISOString() })
      } else { setUser(null); setSession(null) }
      setLoading(false)
    })
    return () => subscription?.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-700 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-2xl font-bold">🧺 PressingManager</p>
        <p className="text-purple-200 text-sm mt-1">Chargement en cours...</p>
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
        <Route path="/clients" element={<Protected><ClientsPage /></Protected>} />
        <Route path="/cashier" element={<Protected><CashierPage /></Protected>} />
        <Route path="/billing" element={<Protected><BillingPage /></Protected>} />
        <Route path="/stock" element={<Protected><StockPage /></Protected>} />
        <Route path="/hr" element={<Protected><HRPage /></Protected>} />
        <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="/loyalty" element={<Protected><LoyaltyPage /></Protected>} />
        <Route path="/agenda" element={<Protected><AgendaPage /></Protected>} />
        <Route path="/multiagency" element={<Protected><MultiAgencyPage /></Protected>} />
        <Route path="/accounting" element={<Protected><AccountingPage /></Protected>} />
        <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
        <Route path="/services" element={<Protected><ServicesPage /></Protected>} />
        <Route path="/delivery" element={<Protected><DeliveryPage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/users" element={<Protected><UsersPage /></Protected>} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
