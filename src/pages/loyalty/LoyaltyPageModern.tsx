import React, { useState } from 'react'
import { useClientStore, useLoyaltyStore } from '../../lib/store'
import { Modal, Field, Input, Select, Button, KpiCard, StatusBadge, Avatar } from '../../components/ui'
import { Plus, Award, Medal, Trophy, Crown, Copy, Star, TrendingUp, Gift } from 'lucide-react'

// ============================================
// CONFIGURATION DES NIVEAUX
// ============================================
const LEVELS = {
  bronze:   { min: 0,    max: 499,       label: 'Bronze',   icon: Medal,  gradient: 'from-amber-600 to-amber-400', color: '#b45309', badge: 'partial' },
  silver:   { min: 500,  max: 1999,      label: 'Silver',   icon: Award,  gradient: 'from-slate-500 to-slate-400', color: '#64748b', badge: 'inactive' },
  gold:     { min: 2000, max: 4999,      label: 'Gold',     icon: Trophy, gradient: 'from-amber-500 to-yellow-400', color: '#f59e0b', badge: 'partial' },
  platinum: { min: 5000, max: Infinity,  label: 'Platinum', icon: Crown,  gradient: 'from-primary to-primary-container', color: '#630ed4', badge: 'vip' },
}

const POINTS_TO_XOF = 10 // 1 point = 10 XOF

export const LoyaltyPageModern: React.FC = () => {
  const clients = useClientStore(s => s.clients)
  const { coupons, addCoupon, getLevelFromPoints } = useLoyaltyStore()
  const [showCoupon, setShowCoupon] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [couponForm, setCouponForm] = useState({ code: '', discount_percent: 10, valid_until: '', client_id: '' })

  const clientsByLevel = React.useMemo(() => ({
    bronze: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'bronze').length,
    silver: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'silver').length,
    gold: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'gold').length,
    platinum: clients.filter(c => getLevelFromPoints(c.loyalty_points) === 'platinum').length,
  }), [clients, getLevelFromPoints])

  const topByPoints = React.useMemo(() =>
    [...clients].sort((a, b) => b.loyalty_points - a.loyalty_points).slice(0, 10),
    [clients]
  )

  const totalPoints = clients.reduce((s, c) => s + (c.loyalty_points || 0), 0)
  const totalValueXOF = totalPoints * POINTS_TO_XOF

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-3xl font-extrabold text-on-surface tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Programme de Fidelite
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary uppercase tracking-wider">
              <Award size={12} />
              Atelier Kouadou
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Points accumules, paliers privilegies, coupons de caisse et engagement client
          </p>
        </div>
        <button
          onClick={() => setShowCoupon(true)}
          className="btn-modern-primary self-start md:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          Creer un coupon
        </button>
      </div>

      {/* ============ 4 PALIERS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(LEVELS).map(([key, config]) => {
          const count = clientsByLevel[key as keyof typeof clientsByLevel]
          const Icon = config.icon
          const isPlatinum = key === 'platinum'
          return (
            <div
              key={key}
              className={
                isPlatinum
                  ? 'rounded-2xl p-5 text-white shadow-md'
                  : 'card-modern'
              }
              style={isPlatinum ? { background: 'linear-gradient(135deg, #630ed4 0%, #7c3aed 100%)' } : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={
                  'kpi-label-modern ' + (isPlatinum ? 'text-white/70' : '')
                }>
                  {config.label}
                </span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: isPlatinum ? 'rgba(255,255,255,0.15)' : config.color + '20',
                    color: isPlatinum ? '#fff' : config.color
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={'kpi-value-modern ' + (isPlatinum ? 'text-white' : '')}
                  style={{ color: !isPlatinum ? config.color : undefined }}
                >
                  {count}
                </span>
                <span className={'text-xs font-medium ' + (isPlatinum ? 'text-white/70' : 'text-on-surface-variant')}>
                  client(s)
                </span>
              </div>
              <div className={
                'mt-2 pt-2 border-t ' + (isPlatinum ? 'border-white/20' : 'border-outline-variant/30')
              }>
                <p className={
                  'text-[10px] font-semibold ' + (isPlatinum ? 'text-white/70' : 'text-on-surface-variant')
                }>
                  {config.min.toLocaleString('fr-FR')} pts
                  {config.max !== Infinity ? ' — ' + config.max.toLocaleString('fr-FR') + ' pts' : ' et +'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ============ KPI TOTAUX ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Points cumules"
          value={totalPoints.toLocaleString('fr-FR')}
          unit="pts"
          icon={<Star size={18} />}
        />
        <KpiCard
          label="Valeur fidelite"
          value={totalValueXOF.toLocaleString('fr-FR')}
          unit="XOF"
          icon={<TrendingUp size={18} />}
          variant="primary"
          sub={'1 pt = ' + POINTS_TO_XOF + ' XOF'}
        />
        <KpiCard
          label="Coupons actifs"
          value={coupons.filter(c => !c.is_used).length}
          unit={'sur ' + coupons.length}
          icon={<Gift size={18} />}
        />
      </div>

      {/* ============ CLASSEMENT ============ */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="font-bold text-base text-on-surface"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Classement fidelite
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Top 10 clients par points accumules
            </p>
          </div>
          <Trophy size={20} className="text-amber-500" />
        </div>

        {topByPoints.filter(c => c.loyalty_points > 0).length > 0 ? (
          <div className="flex flex-col gap-2">
            {topByPoints.filter(c => c.loyalty_points > 0).map((c, i) => {
              const level = getLevelFromPoints(c.loyalty_points)
              const levelConfig = LEVELS[level as keyof typeof LEVELS] || LEVELS.bronze
              const isMedal = i < 3
              const medalColors = ['bg-gradient-to-br from-amber-400 to-yellow-500', 'bg-gradient-to-br from-slate-300 to-slate-400', 'bg-gradient-to-br from-amber-700 to-amber-600']
              const valueXOF = (c.loyalty_points || 0) * POINTS_TO_XOF

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all"
                >
                  {/* Rang */}
                  <div
                    className={
                      'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 ' +
                      (isMedal ? medalColors[i] : 'bg-surface-container text-on-surface-variant')
                    }
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {i + 1}
                  </div>

                  {/* Avatar + infos */}
                  <Avatar name={c.first_name + ' ' + (c.last_name || '')} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-on-surface truncate">
                        {c.first_name} {c.last_name}
                      </p>
                      {level === 'platinum' && <Crown size={12} className="text-primary shrink-0" />}
                      {level === 'gold' && <Trophy size={12} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{c.phone}</p>
                  </div>

                  {/* Points + valeur */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-sm font-extrabold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {c.loyalty_points.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">pts</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      {valueXOF.toLocaleString('fr-FR')} XOF
                    </p>
                  </div>

                  {/* Palier */}
                  <div className="shrink-0 hidden sm:block">
                    <StatusBadge
                      status={levelConfig.badge as any}
                      label={levelConfig.label}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Star size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
            <p className="text-sm text-on-surface-variant">Aucun point attribue</p>
          </div>
        )}
      </div>

      {/* ============ COUPONS ============ */}
      <div className="card-modern">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="font-bold text-base text-on-surface"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Coupons & Reductions
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {coupons.filter(c => !c.is_used).length} coupon(s) actif(s)
            </p>
          </div>
          <Gift size={20} className="text-primary" />
        </div>

        {coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map(coupon => {
              const isUsed = coupon.is_used
              return (
                <div
                  key={coupon.id}
                  className={
                    'rounded-2xl p-4 border-2 border-dashed transition-all ' +
                    (isUsed
                      ? 'border-outline-variant/40 bg-surface-container-low opacity-60'
                      : 'border-primary/40 bg-primary-fixed/20 hover:border-primary hover:shadow-md')
                  }
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className={
                          'font-extrabold text-lg ' + (isUsed ? 'text-on-surface-variant' : 'text-primary')
                        }
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        -{coupon.discount_percent}%
                      </p>
                      <p className="text-xs font-medium text-on-surface-variant">
                        Code coupon
                      </p>
                    </div>
                    <StatusBadge
                      status={isUsed ? 'inactive' : 'active'}
                      label={isUsed ? 'Utilise' : 'Actif'}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-outline-variant/30 mb-3">
                    <code className="flex-1 text-xs font-bold text-on-surface truncate">
                      {coupon.code}
                    </code>
                    {!isUsed && (
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1.5 rounded-md hover:bg-primary-fixed text-primary transition"
                        title="Copier le code"
                      >
                        {copiedCode === coupon.code ? (
                          <span className="text-[10px] font-bold">OK</span>
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Expire le {new Date(coupon.valid_until).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
              <Gift size={28} className="text-on-surface-variant/50" />
            </div>
            <p className="text-sm text-on-surface-variant mb-4">Aucun coupon cree</p>
            <button
              onClick={() => setShowCoupon(true)}
              className="btn-modern-primary mx-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              Creer un coupon
            </button>
          </div>
        )}
      </div>

      {/* ============ REGLE DE CONVERSION ============ */}
      <div className="card-modern flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shrink-0 shadow-sm">
          <TrendingUp size={22} />
        </div>
        <div className="flex-1">
          <h3
            className="font-bold text-on-surface"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Regle de conversion & Cagnotte en vigueur
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            1 000 XOF regles au comptoir = 10 points fidelite cumules. 100 points = 1 000 XOF deductibles immediatement lors du retrait du linge.
          </p>
        </div>
        <span className="badge-modern bg-emerald-50 text-emerald-700 self-start sm:self-auto">
          <span className="badge-dot bg-emerald-500" />
          Calcul automatise
        </span>
      </div>

      {/* ============ MODAL COUPON ============ */}
      <Modal
        open={showCoupon}
        onClose={() => setShowCoupon(false)}
        title="Creer un coupon"
        size="md"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            addCoupon({
              id: crypto.randomUUID(),
              code: couponForm.code,
              discount_percent: couponForm.discount_percent,
              valid_until: couponForm.valid_until,
              client_id: couponForm.client_id || undefined,
              is_used: false,
              created_at: new Date().toISOString()
            })
            setShowCoupon(false)
            setCouponForm({ code: '', discount_percent: 10, valid_until: '', client_id: '' })
          }}
          className="space-y-4"
        >
          <Field label="Code" required>
            <Input
              required
              value={couponForm.code}
              onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
              placeholder="Ex: FIDELITE20"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Reduction (%)" required>
              <Input
                type="number"
                min="1"
                max="100"
                required
                value={couponForm.discount_percent}
                onChange={e => setCouponForm({ ...couponForm, discount_percent: parseInt(e.target.value) })}
              />
            </Field>
            <Field label="Valide jusqu au" required>
              <Input
                type="date"
                required
                value={couponForm.valid_until}
                onChange={e => setCouponForm({ ...couponForm, valid_until: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Client (optionnel)">
            <Select
              value={couponForm.client_id}
              onChange={e => setCouponForm({ ...couponForm, client_id: e.target.value })}
            >
              <option value="">Tous les clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Creer le coupon
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCoupon(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default LoyaltyPageModern
