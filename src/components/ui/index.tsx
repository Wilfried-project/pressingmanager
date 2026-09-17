import React from 'react'
import { X, Search, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

// ============================================
// COULEURS — Utilise le design system (tailwind.config.ts)
// ============================================
const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  purple: { bg: 'bg-primary-fixed', text: 'text-primary', ring: 'ring-primary/20' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-500/20' },
  green: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  orange: { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-500/20' },
  red: { bg: 'bg-red-100', text: 'text-red-600', ring: 'ring-red-500/20' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', ring: 'ring-yellow-500/20' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-500/20' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', ring: 'ring-cyan-500/20' },
}

// ============================================
// STAT CARD (modernise, garde la meme API)
// ============================================
export const StatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  sub?: string
}> = ({ label, value, icon, color, sub }) => {
  const c = colorMap[color] || colorMap.purple
  return (
    <div className="card-modern flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="kpi-label-modern truncate">{label}</p>
        <p className="kpi-value-modern text-on-surface mt-1.5 truncate">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
      <div className={`${c.bg} ${c.text} p-3 rounded-2xl flex-shrink-0`}>
        {icon}
      </div>
    </div>
  )
}

// ============================================
// KPI CARD (nouveau — avec tendance)
// ============================================
export const KpiCard: React.FC<{
  label: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  trend?: number
  variant?: 'default' | 'primary'
  sub?: string
}> = ({ label, value, unit, icon, trend, variant = 'default', sub }) => {
  const isPrimary = variant === 'primary'
  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 ${
        isPrimary
          ? 'bg-gradient-to-br from-primary to-primary-container text-white border-transparent shadow-md'
          : 'bg-white border-outline-variant/30 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`kpi-label-modern ${isPrimary ? 'text-white/70' : ''}`}>
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isPrimary ? 'bg-white/15 text-white' : 'bg-surface-container text-primary'
          }`}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`kpi-value-modern ${isPrimary ? 'text-white' : 'text-on-surface'}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-sm font-medium ${isPrimary ? 'text-white/80' : 'text-on-surface-variant'}`}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <p className={`text-xs mt-1.5 ${isPrimary ? 'text-white/70' : 'text-on-surface-variant'}`}>
          {sub}
        </p>
      )}
      {trend !== undefined && (
        <p className={`text-xs font-semibold mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'} ${isPrimary ? 'text-white/90' : ''}`}>
          {trend >= 0 ? '↑ +' : '↓ '}{trend}% vs mois dernier
        </p>
      )}
    </div>
  )
}

// ============================================
// STATUS BADGE (nouveau — avec point colore)
// ============================================
type StatusVariant =
  | 'pending' | 'inProgress' | 'ready' | 'delivered' | 'cancelled'
  | 'urgent' | 'vip' | 'paid' | 'unpaid' | 'partial'
  | 'active' | 'inactive'

const STATUS_MAP: Record<StatusVariant, { label: string; bg: string; text: string; dot: string }> = {
  pending:    { label: 'En attente', bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500' },
  inProgress: { label: 'En cours',   bg: 'bg-blue-50',     text: 'text-blue-700',     dot: 'bg-blue-500' },
  ready:      { label: 'Pret',       bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  delivered:  { label: 'Livre',      bg: 'bg-slate-100',   text: 'text-slate-600',    dot: 'bg-slate-400' },
  cancelled:  { label: 'Annule',     bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500' },
  urgent:     { label: 'Urgent',     bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500' },
  vip:        { label: 'VIP',        bg: 'bg-primary-fixed', text: 'text-primary',    dot: 'bg-primary' },
  paid:       { label: 'Paye',       bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  unpaid:     { label: 'Non paye',   bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500' },
  partial:    { label: 'Partiel',    bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500' },
  active:     { label: 'Actif',      bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  inactive:   { label: 'Inactif',    bg: 'bg-slate-100',   text: 'text-slate-500',    dot: 'bg-slate-400' },
}

export const StatusBadge: React.FC<{ status: StatusVariant; label?: string }> = ({ status, label }) => {
  const s = STATUS_MAP[status]
  return (
    <span className={`badge-modern ${s.bg} ${s.text}`}>
      <span className={`badge-dot ${s.dot}`} />
      {label ?? s.label}
    </span>
  )
}

// ============================================
// AVATAR (nouveau — initiales colorees)
// ============================================
const AVATAR_COLORS = [
  'bg-primary text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-blue-500 text-white',
  'bg-pink-500 text-white',
  'bg-indigo-500 text-white',
  'bg-red-500 text-white',
]

export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm' }
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ============================================
// BADGE (ameliore)
// ============================================
const badgeColors: Record<string, string> = {
  purple: 'bg-primary-fixed text-primary',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}
export const Badge: React.FC<{ label: string; color?: string }> = ({ label, color = 'gray' }) => (
  <span className={`badge-modern ${badgeColors[color] || badgeColors.gray}`}>{label}</span>
)

// ============================================
// BUTTON (modernise)
// ============================================
const btnVariants: Record<string, string> = {
  primary: 'bg-primary hover:bg-primary-container text-white shadow-sm',
  secondary: 'bg-surface-container hover:bg-surface-container-high text-on-surface',
  danger: 'bg-error hover:bg-red-700 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-primary-fixed text-primary border border-primary/20',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
}
const btnSizes: Record<string, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
    icon?: React.ReactNode
    loading?: boolean
  }
> = ({ variant = 'primary', size = 'md', icon, loading, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`${btnVariants[variant] || btnVariants.primary} ${
      btnSizes[size] || btnSizes.md
    } rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {loading ? (
      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : (
      icon
    )}
    {children}
  </button>
)

// ============================================
// MODAL (garde tel quel, juste radius ameliore)
// ============================================
export const Modal: React.FC<{
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: string
}> = ({ open, onClose, title, children, size = 'md' }) => {
  const sizes: Record<string, string> = {
    sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl',
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${sizes[size] || sizes.md} my-4 max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/30 sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ============================================
// SEARCH INPUT (modernise)
// ============================================
export const SearchInput: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}> = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Rechercher...'}
      className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface placeholder:text-on-surface-variant transition"
    />
  </div>
)

// ============================================
// TABLE (header alleege)
// ============================================
export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-outline-variant/30">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-container-low border-b border-outline-variant/30">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">{children}</tbody>
      </table>
    </div>
  </div>
)

// ============================================
// PAGE HEADER (garde tel quel)
// ============================================
export const PageHeader: React.FC<{
  title: string
  subtitle?: string
  action?: React.ReactNode
  back?: React.ReactNode
}> = ({ title, subtitle, action, back }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      {back}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h1>
        {subtitle && <p className="text-on-surface-variant mt-0.5 text-sm">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
)

// ============================================
// FORM FIELDS (garde tel quel)
// ============================================
export const Field: React.FC<{
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}> = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-semibold text-on-surface mb-1.5">
      {label} {required && <span className="text-error">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-on-surface-variant mt-1">{hint}</p>}
  </div>
)

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '', type, value, onChange, ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false)
  if (type === 'number') {
    return (
      <input
        {...props}
        type="number"
        value={value === 0 || value === '0' ? '' : value}
        onChange={onChange}
        className={`w-full px-4 py-2.5 border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface transition ${className}`}
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
          className={`w-full px-4 py-2.5 pr-20 border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface transition ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary text-xs font-semibold"
        >
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
      className={`w-full px-4 py-2.5 border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface transition ${className}`}
    />
  )
}

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children, className = '', ...props
}) => (
  <select
    {...props}
    className={`w-full px-4 py-2.5 border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface bg-white transition ${className}`}
  >
    {children}
  </select>
)

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '', ...props
}) => (
  <textarea
    {...props}
    rows={props.rows || 3}
    className={`w-full px-4 py-2.5 border border-outline-variant/40 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-on-surface resize-none transition ${className}`}
  />
)

// ============================================
// EMPTY STATE (garde tel quel)
// ============================================
export const EmptyState: React.FC<{
  icon: string
  message: string
  action?: React.ReactNode
}> = ({ icon, message, action }) => (
  <div className="text-center py-16 px-4">
    <div className="text-5xl mb-3">{icon}</div>
    <p className="text-on-surface-variant text-base">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
)

// ============================================
// ALERT (icons Lucide ajoutees)
// ============================================
export const Alert: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  className?: string
}> = ({ type, message, className = '' }) => {
  const styles: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  }
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${styles[type]} ${className}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ============================================
// CARD (radius ameliore)
// ============================================
export const Card: React.FC<{
  children: React.ReactNode
  className?: string
  onClick?: () => void
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-6 ${
      onClick ? 'cursor-pointer hover:shadow-md transition' : ''
    } ${className}`}
  >
    {children}
  </div>
)

// ============================================
// TABS (garde tel quel, couleurs DS)
// ============================================
export const Tabs: React.FC<{
  tabs: { key: string; label: string; icon?: string }[]
  active: string
  onChange: (k: string) => void
}> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-surface-container p-1 rounded-xl overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`flex-shrink-0 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition ${
          active === tab.key
            ? 'bg-white text-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        {tab.icon && <span>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
)

// ============================================
// HELPERS COULEURS (gardes tel quel)
// ============================================
export const getOrderStatusColor = (status: string) =>
  ({
    en_attente: 'blue', en_cours: 'yellow', pret: 'green', livre: 'gray', annule: 'red',
  }[status] || 'gray')

export const getPriorityColor = (priority: string) =>
  ({
    economique: 'cyan', normal: 'gray', express: 'orange', vip: 'purple',
  }[priority] || 'gray')

export const getClothStatusColor = (status: string) =>
  ({
    recu: 'blue', tri: 'indigo', pretraitement: 'purple', detachage: 'yellow',
    lavage: 'cyan', essorage: 'blue', sechage: 'orange', repassage: 'red',
    controle: 'yellow', retouche: 'orange', emballage: 'indigo', stock: 'gray',
    pret: 'green', livre: 'gray',
  }[status] || 'gray')
