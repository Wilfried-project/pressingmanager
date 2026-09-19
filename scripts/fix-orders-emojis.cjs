const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

// Nettoyage générique : retire toute icône emoji présente dans un pattern icon: '...'
// en préservant la structure exacte du code (guillemets, virgules)
const emojiIconPattern = /icon: '[^\x00-\x7F]+'/gu
const before1 = content
content = content.replace(emojiIconPattern, "icon: ''")
if (content !== before1) count++

// Nettoyage des options de priorité (retire tout caractère non-ASCII en début de libellé)
const priorityOptionPattern = /(<option value="(normal|express|vip)">)[^\x00-\x7F]*\s*/g
const before2 = content
content = content.replace(priorityOptionPattern, '$1')
if (content !== before2) count++

fs.writeFileSync(path, content, 'utf8')
console.log(`Terminé — ${count} type(s) de nettoyage appliqué(s)`)
