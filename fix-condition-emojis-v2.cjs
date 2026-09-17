const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

const pairs = [
  ['<option value="bon"> Bon état</option>', '<option value="bon">Bon état</option>'],
  ['<option value="taches">🟡 Taches</option>', '<option value="taches">Taches</option>'],
  ['<option value="dechire">🔴 Déchiré</option>', '<option value="dechire">Déchiré</option>'],
  ['<option value="use">⚪ Usé</option>', '<option value="use">Usé</option>'],
  ['<option value="abime"> Abîmé</option>', '<option value="abime">Abîmé</option>'],
]

pairs.forEach(([oldStr, newStr]) => {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr)
    count++
  }
})

fs.writeFileSync(path, content, 'utf8')
console.log(`Termine : ${count}/5 options corrigees`)
