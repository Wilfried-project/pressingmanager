const fs = require('fs')
const path = 'src/components/ui/index.tsx'
let content = fs.readFileSync(path, 'utf8')

// Regex tolérante aux fins de ligne CRLF/LF pour localiser le composant Input en entier
const pattern = /export const Input: React\.FC<React\.InputHTMLAttributes<HTMLInputElement>> = \(\{ className = '', type, value, onChange, \.\.\.props \}\) => \{\r?\n  if \(type === 'number'\) \{\r?\n    return \(\r?\n      <input\r?\n        \{\.\.\.props\}\r?\n        type="number"\r?\n        value=\{value === 0 \|\| value === '0' \? '' : value\}\r?\n        onChange=\{onChange\}\r?\n        className=\{`w-full px-4 py-2\.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm \$\{className\}`\}\r?\n      \/>\r?\n    \)\r?\n  \}\r?\n  return \(\r?\n    <input\r?\n      \{\.\.\.props\}\r?\n      type=\{type\}\r?\n      value=\{value\}\r?\n      onChange=\{onChange\}\r?\n      className=\{`w-full px-4 py-2\.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm \$\{className\}`\}\r?\n    \/>\r?\n  \)\r?\n\}/

const replacement = `export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', type, value, onChange, ...props }) => {
  const [showPassword, setShowPassword] = React.useState(false)
  if (type === 'number') {
    return (
      <input
        {...props}
        type="number"
        value={value === 0 || value === '0' ? '' : value}
        onChange={onChange}
        className={\`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm \${className}\`}
      />
    )
  }
  if (type === 'password') {
    return (
      <div className="relative">
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={\`w-full px-4 py-2.5 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm \${className}\`}
        />
        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold">
          {showPassword ? 'Masquer' : 'Afficher'}
        </button>
      </div>
    )
  }
  return (
    <input
      {...props}
      type={type}
      value={value}
      onChange={onChange}
      className={\`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm \${className}\`}
    />
  )
}`

if (pattern.test(content)) {
  content = content.replace(pattern, replacement)
  fs.writeFileSync(path, content, 'utf8')
  console.log('SUCCES : bouton afficher/masquer ajoute au composant Input global')
} else {
  console.log('ECHEC : le pattern ne correspond pas exactement')
}
