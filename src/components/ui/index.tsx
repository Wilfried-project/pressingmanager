import React from 'react'
import { X } from 'lucide-react'

// STAT CARD
const colorMap: Record<string, any> = {
  purple: { border: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-600' },
  green: { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-600' },
  orange: { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-600' },
  red: { border: 'border-red-500', bg: 'bg-red-100', text: 'text-red-600' },
  yellow: { border: 'border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-600' },
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-600' },
  cyan: { border: 'border-cyan-500', bg: 'bg-cyan-100', text: 'text-cyan-600' },
}

export const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }> = ({ label, value, icon, color, sub }) => {
  const c = colorMap[color] || colorMap.purple
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${c.border} hover:shadow-md transition`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`${c.bg} ${c.text} p-3 rounded-full flex-shrink-0 ml-3`}>{icon}</div>
      </div>
    </div>
  )
}

// BADGE
const badgeColors: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-700', blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700', orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700', yellow: 'bg-yellow-100 text-yellow-700',
  gray: 'bg-gray-100 text-gray-700', indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}
export const Badge: React.FC<{ label: string; color?: string }> = ({ label, color = 'gray' }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColors[color] || badgeColors.gray}`}>{label}</span>
)

// BUTTON
const btnVariants: Record<string, string> = {
  primary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-purple-50 text-purple-600 border border-purple-300',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm',
}
const btnSizes: Record<string, string> = {
  xs: 'px-2.5 py-1 text-xs', sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base',
}
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; icon?: React.ReactNode; loading?: boolean }> = ({
  variant = 'primary', size = 'md', icon, loading, children, className = '', ...props
}) => (
  <button {...props} disabled={loading || props.disabled}
    className={`${btnVariants[variant] || btnVariants.primary} ${btnSizes[size] || btnSizes.md} rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : icon}
    {children}
  </button>
)

// MODAL
export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: string }> = ({ open, onClose, title, children, size = 'md' }) => {
  const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size] || sizes.md} my-4`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// SEARCH
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></span>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Rechercher...'}
      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
  </div>
)

// TABLE
export const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
          <tr>{headers.map((h, i) => <th key={i} className="px-5 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </div>
  </div>
)

// PAGE HEADER
export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; back?: React.ReactNode }> = ({ title, subtitle, action, back }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      {back}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-0.5 text-sm">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
)

// FORM FIELDS
export const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode; hint?: string }> = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
)

// INPUT — fix zéro: si type=number et value=0 on affiche vide
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', type, value, onChange, ...props }) => {
  if (type === 'number') {
    return (
      <input
        {...props}
        type="number"
        value={value === 0 || value === '0' ? '' : value}
        onChange={onChange}
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${className}`}
      />
    )
  }
  return (
    <input
      {...props}
      type={type}
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm ${className}`}
    />
  )
}

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = '', ...props }) => (
  <select {...props} className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white ${className}`}>
    {children}
  </select>
)

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea {...props} rows={props.rows || 3} className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none ${className}`} />
)

// EMPTY STATE
export const EmptyState: React.FC<{ icon: string; message: string; action?: React.ReactNode }> = ({ icon, message, action }) => (
  <div className="text-center py-16 px-4">
    <div className="text-5xl mb-3">{icon}</div>
    <p className="text-gray-400 text-base">{message}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
)

// ALERT
export const Alert: React.FC<{ type: 'success' | 'error' | 'warning' | 'info'; message: string; className?: string }> = ({ type, message, className = '' }) => {
  const styles: Record<string, string> = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  }
  const icons: Record<string, string> = { success: '', error: '', warning: '', info: 'ℹ️' }
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${styles[type]} ${className}`}>
      <span className="text-lg">{icons[type]}</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// CARD
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''} ${className}`}>
    {children}
  </div>
)

// TABS
export const Tabs: React.FC<{ tabs: { key: string; label: string; icon?: string }[]; active: string; onChange: (k: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
    {tabs.map(tab => (
      <button key={tab.key} onClick={() => onChange(tab.key)}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${active === tab.key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
        {tab.icon && <span>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
)

// STATUS BADGE helpers
export const getOrderStatusColor = (status: string) => ({
  en_attente: 'blue', en_cours: 'yellow', pret: 'green', livre: 'gray', annule: 'red'
}[status] || 'gray')

export const getPriorityColor = (priority: string) => ({
  economique: 'cyan', normal: 'gray', express: 'orange', vip: 'purple'
}[priority] || 'gray')

export const getClothStatusColor = (status: string) => ({
  recu: 'blue', tri: 'indigo', pretraitement: 'purple', detachage: 'yellow',
  lavage: 'cyan', essorage: 'blue', sechage: 'orange', repassage: 'red',
  controle: 'yellow', retouche: 'orange', emballage: 'indigo', stock: 'gray', pret: 'green', livre: 'gray'
}[status] || 'gray')
