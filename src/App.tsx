import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore, useShopConfig } from './lib/store'
import { useSettingsStore } from './lib/settingsStore'
import { useTheme } from './lib/useTheme'
import { Toaster } from 'sonner'
import { CommandPalette } from './components/CommandPalette'
import { BillingPage } from './pages/billing/BillingPage'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { DashboardModern } from './pages/dashboard/DashboardModern'
import { ClientsPageModern } from './pages/clients/ClientsPageModern'
import { OrdersPageModern } from './pages/orders/OrdersPageModern'
import { CashierPageModern } from './pages/cashier/CashierPageModern'
import { UsersPage } from './pages/users/UsersPage'
import { ScanPage } from './pages/scan/ScanPage'
import { AtelierPageModern } from './pages/atelier/AtelierPageModern'
import {

  MultiAgencyPage,
} from './pages/AllPages'
import { ServicesPageModern } from './pages/services/ServicesPageModern'
import { NotificationsPageModern } from './pages/notifications/NotificationsPageModern'
import { HRPageModern } from './pages/hr/HRPageModern'
import { DeliveryPageModern } from './pages/delivery/DeliveryPageModern'
import { AgendaPageModern } from './pages/agenda/AgendaPageModern'
import { ReportsPageModern } from './pages/reports/ReportsPageModern'
import { StockPageModern } from './pages/stock/StockPageModern'
import { AccountingPageModern } from './pages/accounting/AccountingPageModern'
import { SettingsPageModern } from './pages/settings/SettingsPageModern'
import { LoyaltyPageModern } from './pages/loyalty/LoyaltyPageModern'
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard'
 
const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore(s => s.user)
  const { settings } = useSettingsStore()
  const location = window.location.pathname

  if (!user) return <Navigate to="/login" replace />

  // Si l'utilisateur n'a pas terminé son onboarding, rediriger vers /onboarding
  // sauf s'il y est déjà (évite une boucle infinie)
  if (settings && !settings.onboarding_completed && location !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Layout>{children}</Layout>
}
 
function App() {
  const [loading, setLoading] = useState(true)
  const [suspended, setSuspended] = useState(false)
  const [expired, setExpired] = useState(false)
  const { user, setUser, setSession } = useAuthStore()
  const { setConfig } = useShopConfig()
  useTheme()

  // Charger les settings du pressing au démarrage (necessaire pour l'onboarding)
  const { loadSettings: loadAppSettings } = useSettingsStore()
  useEffect(() => {
    if (user) {
      loadAppSettings()
    }
  }, [user])

  // VÃ©rifie que le pressing (tenant) n'est pas suspendu ET que son
  // abonnement n'est pas expirÃ©, avant de laisser l'utilisateur accÃ©der
  // Ã  l'application. Dans les deux cas, la session est fermÃ©e
  // immÃ©diatement, mÃªme si les identifiants Ã©taient corrects.
  const checkTenantStatus = async (tenantId: string): Promise<boolean> => {
    if (!tenantId) return true
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_status, subscription_expiration')
        .eq('id', tenantId)
        .single()

      if (tenant?.subscription_status === 'suspendu') {
        setSuspended(true)
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        return false
      }

      if (tenant?.subscription_expiration) {
        const expDate = new Date(tenant.subscription_expiration)
        const now = new Date()
        if (expDate < now) {
          setExpired(true)
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
          return false
        }
      }

      return true
    } catch (err) {
      console.error('Erreur vÃ©rification statut pressing:', err)
      return true
    }
  }
 
  useEffect(() => {
    const loadTenantConfig = async () => {
      try {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
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
            const tenantOk = await checkTenantStatus(employee.tenant_id)
            if (!tenantOk) { setLoading(false); return }
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
          const tenantOk = await checkTenantStatus(employee.tenant_id)
          if (!tenantOk) { setLoading(false); return }
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
            id: session.user.id,            email: session.user.email || '',
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
        <p className="text-white text-2xl font-bold">PressingManager</p>
        <p className="text-purple-200 text-sm mt-1">Chargement en cours...</p>
      </div>
    </div>
  )

  if (suspended) return (
    <div className="min-h-screen bg-gradient-to-br from-red-800 to-red-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">â¸ï¸</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">AccÃ¨s suspendu</h1>
        <p className="text-gray-600 text-sm mb-6">L'accÃ¨s Ã  ce pressing a Ã©tÃ© temporairement suspendu. Vos donnÃ©es restent en sÃ©curitÃ© â€” contactez-nous pour rÃ©activer votre accÃ¨s.</p>
        <a href="https://wa.me/2250779613865?text=Bonjour%2C%20mon%20acc%C3%A8s%20PressingManager%20est%20suspendu%2C%20je%20souhaite%20le%20r%C3%A9activer." target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition mb-3">Contacter sur WhatsApp</a>
        <button onClick={() => window.location.reload()} className="text-purple-600 font-semibold hover:underline text-sm">RÃ©essayer</button>
      </div>
    </div>
  )

  if (expired) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-700 to-orange-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">â°</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Abonnement expirÃ©</h1>
        <p className="text-gray-600 text-sm mb-6">L'abonnement de ce pressing est arrivÃ© Ã  Ã©chÃ©ance. Vos donnÃ©es restent en sÃ©curitÃ© â€” contactez-nous pour renouveler et retrouver l'accÃ¨s.</p>
        <a href="https://wa.me/2250779613865?text=Bonjour%2C%20mon%20abonnement%20PressingManager%20est%20expir%C3%A9%2C%20je%20souhaite%20le%20renouveler." target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition mb-3">Contacter sur WhatsApp</a>
        <button onClick={() => window.location.reload()} className="text-purple-600 font-semibold hover:underline text-sm">RÃ©essayer</button>
      </div>
    </div>
  )
 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/scan/:ticket" element={<ScanPage />} />
        <Route path="/onboarding" element={<Protected><OnboardingWizard /></Protected>} />
        <Route path="/" element={<Protected><DashboardModern /></Protected>} />
        <Route path="/orders" element={<Protected><OrdersPageModern /></Protected>} />
        <Route path="/clients" element={<Protected><ClientsPageModern /></Protected>} />
        <Route path="/cashier" element={<Protected><CashierPageModern /></Protected>} />
        <Route path="/billing" element={<Protected><BillingPage /></Protected>} />
        <Route path="/stock" element={<Protected><StockPageModern /></Protected>} />
        <Route path="/hr" element={<Protected><HRPageModern /></Protected>} />
        <Route path="/notifications" element={<Protected><NotificationsPageModern /></Protected>} />
        <Route path="/loyalty" element={<Protected><LoyaltyPageModern /></Protected>} />
        <Route path="/agenda" element={<Protected><AgendaPageModern /></Protected>} />
        <Route path="/multiagency" element={<Protected><MultiAgencyPage /></Protected>} />
        <Route path="/accounting" element={<Protected><AccountingPageModern /></Protected>} />
        <Route path="/reports" element={<Protected><ReportsPageModern /></Protected>} />
        <Route path="/services" element={<Protected><ServicesPageModern /></Protected>} />
        <Route path="/delivery" element={<Protected><DeliveryPageModern /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPageModern /></Protected>} />
        <Route path="/users" element={<Protected><UsersPage /></Protected>} />
        <Route path="/atelier" element={<Protected><AtelierPageModern /></Protected>} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
            <CommandPalette />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.04)',
            fontFamily: 'Inter, sans-serif',
          },
          className: 'toast-custom',
        }}
      />
    </BrowserRouter>
  )
}
 
export default App






















