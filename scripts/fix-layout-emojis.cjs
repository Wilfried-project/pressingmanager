const fs = require('fs')
const path = 'src/components/layout/Layout.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

const pairs = [
  [/ÔÜá´©Å \{alertCount\} alerte\(s\)/, '{alertCount} alerte(s)'],
  [/ÔÜá´©Å \{lateCount\} retard\(s\)/, '{lateCount} retard(s)'],
]

pairs.forEach(([pattern, replacement]) => {
  if (pattern.test(content)) {
    content = content.replace(pattern, replacement)
    count++
  }
})

fs.writeFileSync(path, content, 'utf8')
console.log(`Termine : ${count}/2 emojis retires`)
