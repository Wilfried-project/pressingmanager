const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')

const oldBlock = '<option value="bon"> Bon Ã©tat</option>\r\n                        <option value="taches">ðŸŸ¡ Taches</option>\r\n                        <option value="dechire">ðŸ”´ DÃ©chirÃ©</option>\r\n                        <option value="use">âšª UsÃ©</option>\r\n                        <option value="abime"> AbÃ®mÃ©</option>'

const newBlock = '<option value="bon">Bon état</option>\r\n                        <option value="taches">Taches</option>\r\n                        <option value="dechire">Déchiré</option>\r\n                        <option value="use">Usé</option>\r\n                        <option value="abime">Abîmé</option>'

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock)
  fs.writeFileSync(path, content, 'utf8')
  console.log('SUCCES : emojis etat reception retires')
} else {
  console.log('ECHEC : bloc non trouve tel quel')
  const idx = content.indexOf('value="bon"')
  if (idx > -1) console.log('Contexte reel:', JSON.stringify(content.substring(idx - 20, idx + 300)))
}
