const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')

const oldBlock = "{CLOTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}\r\n                      <Select value={cloth.service} onChange={e => {"

const newBlock = "{CLOTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}\r\n                      </Select>\r\n                      <input type=\"text\" placeholder=\"Ou saisir un type personnalisé...\" onChange={e => { if (e.target.value) updateCloth(i, { type: e.target.value as ClothType }) }} className=\"w-full mt-1 px-2 py-1 border border-gray-200 rounded-lg text-xs\" />\r\n                    </Field>\r\n                    <Field label=\"Service\">\r\n                      <Select value={cloth.service} onChange={e => {"

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock)
  fs.writeFileSync(path, content, 'utf8')
  console.log('SUCCES : Select repare et champ manuel ajoute')
} else {
  console.log('ECHEC encore - abandon de cette approche')
}
