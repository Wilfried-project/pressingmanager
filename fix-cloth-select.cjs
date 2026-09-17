const fs = require('fs')
const path = 'src/pages/orders/OrdersPage.tsx'
let content = fs.readFileSync(path, 'utf8')

const oldBlock = `{CLOTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      <Select value={cloth.service} onChange={e => {`

const newBlock = `{CLOTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Select>
                      <input type="text" placeholder="Ou saisir un type personnalisé..." onChange={e => { if (e.target.value) updateCloth(i, { type: e.target.value as ClothType }) }} className="w-full mt-1 px-2 py-1 border border-gray-200 rounded-lg text-xs" />
                    </Field>
                    <Field label="Service">
                      <Select value={cloth.service} onChange={e => {`

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock)
  fs.writeFileSync(path, content, 'utf8')
  console.log('✅ Select réparé et champ manuel ajouté')
} else {
  console.log('⚠️ Bloc exact non trouvé — rien de modifié, fichier intact')
}
