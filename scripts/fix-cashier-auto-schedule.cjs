const fs = require('fs')
const path = 'src/pages/cashier/CashierPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

function insertBefore(anchor, toInsert, label) {
  if (content.includes(anchor)) {
    content = content.replace(anchor, toInsert + anchor)
    count++
    console.log(`OK : ${label}`)
  } else {
    console.log(`ECHEC : ${label} — ancre non trouvee`)
  }
}

// 1. Import supabase
insertBefore(
  "import { cashService } from '../../lib/db'",
  "import { supabase } from '../../lib/supabase'\n",
  "import supabase"
)

// 2. Nouvel effet — vérification automatique des horaires, ancré avant handleOpenSession
insertBefore(
  "  const handleOpenSession = async () => {",
  `  // Ouverture/fermeture automatique selon les heures configurées dans Paramètres —
  // vérifiée à chaque chargement de la page (dès qu'un employé se connecte)
  useEffect(() => {
    const checkAutoSchedule = async () => {
      if (loading) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
        if (!emp?.tenant_id) return
        const { data: tenant } = await supabase.from('tenants').select('cash_open_time, cash_close_time').eq('id', emp.tenant_id).single()
        const openTime = tenant?.cash_open_time || '08:00'
        const closeTime = tenant?.cash_close_time || '20:00'
        const now = new Date()
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        const [openH, openM] = openTime.split(':').map(Number)
        const [closeH, closeM] = closeTime.split(':').map(Number)
        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM

        if (!currentSession && nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
          const amount = lastClosedSession?.closing_amount || 0
          const newSession = await cashService.addSession({ id: crypto.randomUUID(), agency_id: 'default', opening_amount: amount, opened_by: 'Système (auto)', opened_at: new Date().toISOString(), status: 'open', notes: 'Ouverture automatique' })
          setSessions(s => [newSession, ...s])
        } else if (currentSession && nowMinutes >= closeMinutes) {
          const updated = await cashService.updateSession(currentSession.id, { status: 'closed', closed_at: new Date().toISOString(), closing_amount: soldeAttendu, notes: 'Fermeture automatique' })
          setSessions(s => s.map((x: any) => x.id === currentSession.id ? updated : x))
        }
      } catch (err) { console.error('Erreur verification horaires caisse:', err) }
    }
    checkAutoSchedule()
  }, [loading])

`,
  "effet verification auto horaires"
)

fs.writeFileSync(path, content, 'utf8')
console.log(`\nTermine : ${count}/2 corrections appliquees`)
