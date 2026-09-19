const fs = require('fs')
const path = 'src/pages/settings/SettingsPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

function replaceBlock(oldStr, newStr, label) {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    count++
    console.log(`OK : ${label}`)
  } else {
    console.log(`ECHEC : ${label} — bloc non trouve tel quel`)
  }
}

// 1. Import useEffect
replaceBlock(
  "import React, { useState, useRef } from 'react'",
  "import React, { useState, useRef, useEffect } from 'react'",
  "import useEffect"
)

// 2. Ajouter les états pour les heures de caisse
replaceBlock(
  "  const [activeTab, setActiveTab] = useState('boutique')\r\n  const [saved, setSaved] = useState(false)",
  "  const [activeTab, setActiveTab] = useState('boutique')\r\n  const [saved, setSaved] = useState(false)\r\n  const [cashOpenTime, setCashOpenTime] = useState('08:00')\r\n  const [cashCloseTime, setCashCloseTime] = useState('20:00')\r\n\r\n  useEffect(() => {\r\n    const loadCashHours = async () => {\r\n      try {\r\n        const { data: { session } } = await supabase.auth.getSession()\r\n        if (!session) return\r\n        const { data: emp } = await supabase.from('employees').select('tenant_id').eq('user_id', session.user.id).single()\r\n        if (!emp?.tenant_id) return\r\n        const { data: tenant } = await supabase.from('tenants').select('cash_open_time, cash_close_time').eq('id', emp.tenant_id).single()\r\n        if (tenant?.cash_open_time) setCashOpenTime(tenant.cash_open_time)\r\n        if (tenant?.cash_close_time) setCashCloseTime(tenant.cash_close_time)\r\n      } catch (err) { console.error('Erreur chargement heures caisse:', err) }\r\n    }\r\n    loadCashHours()\r\n  }, [])",
  "etats heures de caisse + chargement"
)

// 3. Inclure les heures dans la sauvegarde
replaceBlock(
  "            msg_reception: form.msgReception,\r\n            msg_pret: form.msgPret,\r\n            logo: form.logo,\r\n          }).eq('id', emp.tenant_id)",
  "            msg_reception: form.msgReception,\r\n            msg_pret: form.msgPret,\r\n            logo: form.logo,\r\n            cash_open_time: cashOpenTime,\r\n            cash_close_time: cashCloseTime,\r\n          }).eq('id', emp.tenant_id)",
  "sauvegarde heures caisse"
)

// 4. Ajouter les champs UI dans l'onglet Mon Pressing, juste avant le bouton Sauvegarder
replaceBlock(
  '            <Field label="Message de pied de ticket/facture">\r\n              <Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Ex: Merci pour votre confiance ! Revenez nous voir." />\r\n            </Field>\r\n\r\n            <Button className="w-full" icon={<Save size={16} />} onClick={handleSave}>\r\n              Sauvegarder les informations\r\n            </Button>',
  '            <Field label="Message de pied de ticket/facture">\r\n              <Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Ex: Merci pour votre confiance ! Revenez nous voir." />\r\n            </Field>\r\n\r\n            <div className="grid grid-cols-2 gap-4">\r\n              <Field label="Ouverture automatique de la caisse" hint="La caisse s\'ouvre automatiquement dès qu\'un employé se connecte après cette heure">\r\n                <Input type="time" value={cashOpenTime} onChange={e => setCashOpenTime(e.target.value)} />\r\n              </Field>\r\n              <Field label="Fermeture automatique de la caisse" hint="La caisse se ferme automatiquement dès qu\'un employé se connecte après cette heure">\r\n                <Input type="time" value={cashCloseTime} onChange={e => setCashCloseTime(e.target.value)} />\r\n              </Field>\r\n            </div>\r\n\r\n            <Button className="w-full" icon={<Save size={16} />} onClick={handleSave}>\r\n              Sauvegarder les informations\r\n            </Button>',
  "champs UI heures de caisse"
)

fs.writeFileSync(path, content, 'utf8')
console.log(`\nTermine : ${count}/4 corrections appliquees`)
