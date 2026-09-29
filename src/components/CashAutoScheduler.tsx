// src/components/CashAutoScheduler.tsx
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { cashService } from '../lib/db'

export const CashAutoScheduler: React.FC = () => {
  useEffect(() => {
    const checkAutoSchedule = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: emp } = await supabase
          .from('employees')
          .select('tenant_id')
          .eq('user_id', session.user.id)
          .single()
        if (!emp?.tenant_id) return

        const { data: tenant } = await supabase
          .from('tenants')
          .select('cash_open_time, cash_close_time')
          .eq('id', emp.tenant_id)
          .single()

        const openTime = tenant?.cash_open_time || '08:00'
        const closeTime = tenant?.cash_close_time || '20:00'

        const now = new Date()
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        const [openH, openM] = openTime.split(':').map(Number)
        const [closeH, closeM] = closeTime.split(':').map(Number)
        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM

        const allSessions = await cashService.getSessions()
        const currentSession = allSessions.find((s: any) => s.status === 'open')

        if (!currentSession && nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
          const lastClosed = allSessions
            .filter((s: any) => s.status === 'closed')
            .sort((a: any, b: any) => new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime())[0]

          await cashService.addSession({
            id: crypto.randomUUID(),
            agency_id: 'default',
            opening_amount: lastClosed?.closing_amount || 0,
            opened_by: 'Systeme (auto)',
            opened_at: new Date().toISOString(),
            status: 'open',
            notes: `Ouverture automatique (${openTime})`
          })
          console.log('✅ Caisse ouverte automatiquement à', new Date().toLocaleTimeString('fr-FR'))
        }
        else if (currentSession && nowMinutes >= closeMinutes) {
          const sessionTx = (await cashService.getTransactions())
            .filter((t: any) => t.session_id === currentSession.id)
          const totalEntrees = sessionTx.filter((t: any) => t.type === 'entree').reduce((s: number, t: any) => s + t.amount, 0)
          const totalSorties = sessionTx.filter((t: any) => t.type === 'sortie').reduce((s: number, t: any) => s + t.amount, 0)
          const soldeAttendu = (currentSession.opening_amount || 0) + totalEntrees - totalSorties

          await cashService.updateSession(currentSession.id, {
            status: 'closed',
            closed_at: new Date().toISOString(),
            closing_amount: soldeAttendu,
            notes: `Fermeture automatique (${closeTime})`
          })
          console.log('🔒 Caisse fermée automatiquement à', new Date().toLocaleTimeString('fr-FR'))
        }
      } catch (err) {
        console.error('Erreur CashAutoScheduler:', err)
      }
    }

    checkAutoSchedule()
    const interval = setInterval(checkAutoSchedule, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return null
}

export default CashAutoScheduler