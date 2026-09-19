const fs = require('fs')
const path = 'src/pages/settings/SettingsPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

function replaceOnce(pattern, replacement, label) {
  const before = content
  content = content.replace(pattern, replacement)
  if (content !== before) {
    count++
    console.log(`OK : ${label}`)
  } else {
    console.log(`ECHEC : ${label}`)
  }
}

// Retire tout caractère emoji Unicode en début de libellé, quelle que soit sa forme exacte
replaceOnce(/label="[^\x00-\x7F]+\s*Message de réception/u, 'label="Message de réception', "Message de réception")
replaceOnce(/[^\x00-\x7F]+\s*Message vêtements prêts/u, 'Message vêtements prêts', "Message vêtements prêts")
replaceOnce(/[^\x00-\x7F]+\s*Mot de passe<\/p>/u, 'Mot de passe</p>', "Mot de passe")
replaceOnce(/[^\x00-\x7F]+\s*Sécurité/u, 'Sécurité', "titre Sécurité")
replaceOnce(/[^\x00-\x7F]+\s*Données/u, 'Données', "titre Données")
replaceOnce(/[^\x00-\x7F]+\s*Exporter les données/u, 'Exporter les données', "bouton Exporter")
replaceOnce(/[^\x00-\x7F]+\s*Réinitialiser toutes les données/u, 'Réinitialiser toutes les données', "bouton Réinitialiser")

fs.writeFileSync(path, content, 'utf8')
console.log(`\nTermine : ${count}/7 corrections appliquees`)
