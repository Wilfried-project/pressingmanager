import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore, useShopConfig } from './lib/store'
import { BillingPage } from './pages/billing/BillingPage'\nimport { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ClientsPage } from './pages/clients/ClientsPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { CashierPage } from './pages/cashier/CashierPage'
import { UsersPage } from './pages/users/UsersPage'
import { ScanPage } from './pages/scan/ScanPage'
import { AtelierPage } from './pages/atelier/AtelierPage'
import {
  StockPage, HRPage, NotificationsPage, LoyaltyPage,
  AgendaPage, MultiAgencyPage, AccountingPage, ReportsPage,
  ServicesPage, DeliveryPage, SettingsPage
} from './pages/AllPages'

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore(s => s.user)
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function App() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setSession } = useAuthStore()
  const { setConfig } = useShopConfig()

  // Détecter le sous-domaine et charger la config du pressing
  useEffect(() => {
    const loadTenantConfig = async () => {
      try {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        // Ex: elegance.pressing-manager.com → slug = elegance
        // app.pressing-manager.com → pas de slug spécifique
        const isCustomSubdomain = parts.length >= 3 &&
          parts[0] !== 'www' &&
          parts[0] !== 'app' &&
          parts[0] !== 'admin' &&
          parts[0] !== 'localhost'

        if (isCustomSubdomain) {
          const slug = parts[0]
          const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single()

          if (tenant) {
            setConfig({
              name: tenant.name || 'Mon Pressing',
              slogan: tenant.slogan || 'Logiciel de gestion professionnelle',
              logo: tenant.logo || '',
              primaryColor: tenant.primary_color || '#7c3aed',
              phone: tenant.phone || '',
              email: tenant.email || '',
              address: tenant.address || '',
              currency: tenant.currency || 'XOF',
              footer: tenant.footer || 'Merci pour votre confiance !',
              msgReception: tenant.msg_reception || '',
              msgPret: tenant.msg_pret || '',
            })
          }
        }
      } catch (err) {
        console.error('Erreur chargement tenant:', err)
      }
    }
    loadTenantConfig()
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSession(session)
          const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          if (employee) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: employee.full_name,
              phone: employee.phone || '',
              role: employee.role,
              agency_id: employee.tenant_id || 'default',
              is_active: employee.is_active,
              permissions: employee.permissions || [],
              created_at: new Date().toISOString()
            })
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.email?.split('@')[0] || 'Admin',
              phone: '',
              role: 'admin',
              agency_id: 'default',
              is_active: true,
              permissions: [],
              created_at: new Date().toISOString()
            })
          }
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session) {
        setSession(session)
        const { data: employee } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (employee) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: employee.full_name,
            phone: employee.phone || '',
            role: employee.role,
            agency_id: employee.tenant_id || 'default',
            is_active: employee.is_active,
            permissions: employee.permissions || [],
            created_at: new Date().toISOString()
          })
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.email?.split('@')[0] || 'Admin',
            phone: '',
            role: 'admin',
            agency_id: 'default',
            is_active: true,
            permissions: [],
            created_at: new Date().toISOString()
          })
        }
      } else {
        setUser(null)
        setSession(null)
      }
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
        {/* Routes publiques */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/scan/:ticket" element={<ScanPage />} />

        {/* Routes protégées */}
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
        <Route path="/atelier" element={<Protected><AtelierPage /></Protected>} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


