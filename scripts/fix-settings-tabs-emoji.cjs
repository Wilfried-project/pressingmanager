const fs = require('fs')
const path = 'src/pages/settings/SettingsPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

const pairs = [
  ["{ key: 'boutique', label: 'Mon Pressing', icon: '🏪' }", "{ key: 'boutique', label: 'Mon Pressing', icon: '' }"],
  ["{ key: 'messages', label: 'Messages', icon: '💬' }", "{ key: 'messages', label: 'Messages', icon: '' }"],
  ["{ key: 'apparence', label: 'Apparence', icon: '🎨' }", "{ key: 'apparence', label: 'Apparence', icon: '' }"],
  ["{ key: 'account', label: 'Compte', icon: '👤' }", "{ key: 'account', label: 'Compte', icon: '' }"],
  ["{ key: 'system', label: 'Système', icon: '⚙️' }", "{ key: 'system', label: 'Système', icon: '' }"],
  ["🔓 Se déconnecter", "Se déconnecter"],
]

pairs.forEach(([oldStr, newStr]) => {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    count++
  }
})

fs.writeFileSync(path, content, 'utf8')
console.log(`Termine : ${count}/6 emojis retires`)
