const fs = require('fs')
const path = 'src/components/layout/Layout.tsx'
let content = fs.readFileSync(path, 'utf8')
let count = 0

// Retire tout caractère non-ASCII (emoji + variantes) juste avant ces libellés précis
const pairs = [
  [/[^\x00-\x7F]+\s*\{alertCount\} alerte\(s\)/gu, '{alertCount} alerte(s)'],
  [/[^\x00-\x7F]+\s*\{lateCount\} retard\(s\)/gu, '{lateCount} retard(s)'],
]

pairs.forEach(([pattern, replacement]) => {
  const before = content
  content = content.replace(pattern, replacement)
  if (content !== before) count++
})

fs.writeFileSync(path, content, 'utf8')
console.log(`Termine : ${count}/2 emojis retires`)
