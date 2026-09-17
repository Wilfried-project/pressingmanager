const fs = require('fs')
const path = 'src/components/ui/index.tsx'
let content = fs.readFileSync(path, 'utf8')

const before = content
content = content.replace(
  /const icons: Record<string, string> = \{ success: '[^']*', error: '[^']*', warning: '[^']*', info: '[^']*' \}/,
  "const icons: Record<string, string> = { success: '', error: '', warning: '', info: '' }"
)

if (content !== before) {
  fs.writeFileSync(path, content, 'utf8')
  console.log('SUCCES : emoji info retire du composant Alert')
} else {
  console.log('ECHEC : pattern non trouve')
}
