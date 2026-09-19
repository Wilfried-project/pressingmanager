const fs = require('fs')
const path = 'src/pages/settings/SettingsPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

function insertAfter(anchor, toInsert, label) {
  if (content.includes(anchor)) {
    content = content.replace(anchor, anchor + toInsert)
    count++
    console.log(`OK : ${label}`)
  } else {
    console.log(`ECHEC : ${label} — ancre non trouvee`)
  }
}

// 1. États + chargement — ancré sur la ligne saved seule
insertAfter(
  "const [saved, setSaved] = useState(false)",
  `
  const [cashOpenTime, setCashOpenTime] = useState('08:00')
  const [cashCloseTime, setCashCloseTime] = useState('20:00')

  useEffect(() => {
    const loadCashHours = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()
        if (!emp?.tenant_id) return
        const { data: tenant } = await supabase.from('tenants').select('cash_open_time, cash_close_time').eq('id', emp.tenant_id).single()
        if (tenant?.cash_open_time) setCashOpenTime(tenant.cash_open_time)
        if (tenant?.cash_close_time) setCashCloseTime(tenant.cash_close_time)
      } catch (err) { console.error('Erreur chargement heures caisse:', err) }
    }
    loadCashHours()
  }, [])`,
  "etats + chargement heures caisse"
)

// 2. Sauvegarde — ancré sur logo: form.logo, seul
insertAfter(
  "logo: form.logo,",
  `
            cash_open_time: cashOpenTime,
            cash_close_time: cashCloseTime,`,
  "sauvegarde heures caisse"
)

// 3. Champs UI — ancré sur le footer Field seul, juste avant sa fermeture
insertAfter(
  `<Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Ex: Merci pour votre confiance ! Revenez nous voir." />
            </Field>`,
  `

            <div className="grid grid-cols-2 gap-4">
              <Field label="Ouverture automatique de la caisse" hint="La caisse s'ouvre automatiquement dès qu'un employé se connecte après cette heure">
                <Input type="time" value={cashOpenTime} onChange={e => setCashOpenTime(e.target.value)} />
              </Field>
              <Field label="Fermeture automatique de la caisse" hint="La caisse se ferme automatiquement dès qu'un employé se connecte après cette heure">
                <Input type="time" value={cashCloseTime} onChange={e => setCashCloseTime(e.target.value)} />
              </Field>
            </div>`,
  "champs UI heures de caisse"
)

fs.writeFileSync(path, content, 'utf8')
console.log(`\nTermine : ${count}/3 corrections appliquees`)
