// src/pages/hr/HRPageModern.tsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  attendanceService, leaveService, employeeService, agendaService
} from '../../lib/db'
import { toast } from '../../lib/toast'
import { Field, Input, Select, Textarea, Button, Modal, Avatar } from '../../components/ui'
import {
  Users, UserCheck, Calendar, Wallet, Plus, Trash2, Phone,
  CheckCircle2, XCircle, Clock, Cake, Award, TrendingUp, Sparkles,
  Briefcase, Filter, Search, Plane, AlertCircle, ChevronRight
} from 'lucide-react'
import type { Employee, Attendance, Leave } from '../../types'

// ============================================
// CONFIG ROLES
// ============================================
const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  admin:     { label: 'Administrateur', bg: 'bg-violet-100',  text: 'text-violet-700' },
  manager:   { label: 'Manager',        bg: 'bg-blue-100',    text: 'text-blue-700' },
  caissier:  { label: 'Caissier',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
  reception: { label: 'Reception',      bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  laveur:    { label: 'Laveur',         bg: 'bg-orange-100',  text: 'text-orange-700' },
  repasseur: { label: 'Repasseur',      bg: 'bg-amber-100',   text: 'text-amber-700' },
  livreur:   { label: 'Livreur',        bg: 'bg-indigo-100',  text: 'text-indigo-700' },
}

const STATUS_ATT: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  present: { label: 'Present', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  absent:  { label: 'Absent',  bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  retard:  { label: 'Retard',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  conge:   { label: 'Conge',   bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
}

export const HRPageModern: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves'>('employees')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    role: 'laveur' as Employee['role'],
    phone: '',
    salary: 0,
    hire_date: ''
  })
  const [attForm, setAttForm] = useState({
    employee_id: '',
    status: 'present' as Attendance['status']
  })
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    type: 'conge' as Leave['type'],
    start_date: '',
    end_date: '',
    notes: ''
  })

  // ============================================
  // CHARGEMENT
  // ============================================
  const refreshAttendances = () =>
    attendanceService.getAll()
      .then(data => setAttendances(data as Attendance[]))
      .catch(err => console.error('Erreur pointage:', err))

  const refreshLeaves = () =>
    leaveService.getAll()
      .then(data => setLeaves(data as Leave[]))
      .catch(err => console.error('Erreur conges:', err))

  const refreshEmployees = () => {
    setLoadingEmployees(true)
    employeeService.getAll()
      .then(data => setEmployees(data as Employee[]))
      .catch(err => console.error('Erreur employes:', err))
      .finally(() => setLoadingEmployees(false))
  }

  useEffect(() => {
    refreshEmployees()
    refreshAttendances()
    refreshLeaves()
  }, [])

  // ============================================
  // FILTRES + STATS
  // ============================================
  const todayAtt = useMemo(() => {
    const t = new Date().toISOString().split('T')[0]
    return attendances.filter(a => a.date === t)
  }, [attendances])

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees])
  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'pending'), [leaves])
  const totalSalaries = useMemo(() =>
    activeEmployees.reduce((s, e) => s + (e.salary || 0), 0),
    [activeEmployees]
  )

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const ms = !search || e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.phone || '').includes(search)
      const mr = !filterRole || e.role === filterRole
      return ms && mr
    })
  }, [employees, search, filterRole])

  // ============================================
  // ACTIONS
  // ============================================
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.warning('Nom obligatoire')
      return
    }
    try {
      await employeeService.create({ ...form, salary: Number(form.salary), is_active: true })
      toast.success('Employe ajoute', { description: form.full_name })
      refreshEmployees()
      setShowForm(false)
      setForm({ full_name: '', role: 'laveur', phone: '', salary: 0, hire_date: '' })
    } catch {
      toast.error('Erreur lors de la creation')
    }
  }

  const handleToggleActive = async (emp: Employee) => {
    await employeeService.update(emp.id, { is_active: !emp.is_active })
    toast.success(emp.is_active ? 'Employe desactive' : 'Employe reactive', { description: emp.full_name })
    refreshEmployees()
  }

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`Supprimer ${emp.full_name} ?`)) return
    await employeeService.delete(emp.id)
    toast.success('Employe supprime', { description: emp.full_name })
    refreshEmployees()
  }

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attForm.employee_id) {
      toast.warning('Selectionnez un employe')
      return
    }
    await attendanceService.create({
      id: crypto.randomUUID(),
      employee_id: attForm.employee_id,
      date: new Date().toISOString().split('T')[0],
      check_in: new Date().toISOString(),
      status: attForm.status
    })
    const emp = employees.find(e => e.id === attForm.employee_id)
    toast.success('Pointage enregistre', { description: emp?.full_name })
    refreshAttendances()
    setShowAttendance(false)
    setAttForm({ employee_id: '', status: 'present' })
  }

  const handleCheckOut = async (att: Attendance) => {
    await attendanceService.update(att.id, { check_out: new Date().toISOString() })
    toast.success('Depart enregistre')
    refreshAttendances()
  }

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
      toast.warning('Champs obligatoires manquants')
      return
    }
    await leaveService.create({
      id: crypto.randomUUID(),
      ...leaveForm,
      status: 'pending'
    })
    toast.success('Demande de conge enregistree')
    refreshLeaves()
    setShowLeave(false)
    setLeaveForm({ employee_id: '', type: 'conge', start_date: '', end_date: '', notes: '' })
  }

  const handleApproveLeave = async (leave: Leave) => {
    await leaveService.update(leave.id, { status: 'approved' })
    const emp = employees.find(e => e.id === leave.employee_id)
    toast.success('Conge approuve', { description: emp?.full_name })
    try {
      await agendaService.create({
        id: crypto.randomUUID(),
        title: `Conge - ${emp?.full_name || 'Employe'}`,
        type: 'conge',
        date: leave.start_date,
        time: '09:00',
        description: leave.end_date && leave.end_date !== leave.start_date
          ? `Du ${new Date(leave.start_date).toLocaleDateString('fr-FR')} au ${new Date(leave.end_date).toLocaleDateString('fr-FR')}`
          : (leave.notes || ''),
        created_at: new Date().toISOString()
      })
    } catch (err) { console.error(err) }
    refreshLeaves()
  }

  const handleRejectLeave = async (leave: Leave) => {
    await leaveService.update(leave.id, { status: 'rejected' })
    const emp = employees.find(e => e.id === leave.employee_id)
    toast.success('Conge refuse', { description: emp?.full_name })
    refreshLeaves()
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Employes & RH
            </h1>
            <span className="badge-modern bg-primary-fixed text-primary">
              <Sparkles size={12} />
              {activeEmployees.length} actif(s)
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Gestion du personnel, pointages, conges et salaires
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-modern-primary self-start md:self-auto">
          <Plus size={18} strokeWidth={2.5} />
          Nouvel employe
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="relative overflow-hidden rounded-2xl p-5 border border-violet-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Employes actifs</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-md">
                <Users size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-violet-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {activeEmployees.length}
              <span className="text-sm font-bold ml-1.5">pers.</span>
            </div>
            <p className="text-[11px] text-violet-700 mt-2 font-medium">
              sur {employees.length} enregistre(s)
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Presents aujourd&apos;hui</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md">
                <UserCheck size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {todayAtt.filter(a => a.status === 'present').length}
              <span className="text-sm font-bold ml-1.5">/ {activeEmployees.length}</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 font-medium">
              Pointage du jour
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Conges en attente</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md">
                <Calendar size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pendingLeaves.length}
              <span className="text-sm font-bold ml-1.5">demande(s)</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              A traiter
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Masse salariale</span>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalSalaries.toLocaleString('fr-FR')}
              <span className="text-sm font-bold ml-1.5">XOF</span>
            </div>
            <p className="text-[11px] text-cyan-700 mt-2 font-medium">
              Mensuel
            </p>
          </div>
        </div>
      </div>

      {/* TABS + RECHERCHE */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
          {[
            { key: 'employees' as const, label: `Equipe (${employees.length})`, icon: Users },
            { key: 'attendance' as const, label: 'Pointage', icon: Clock },
            { key: 'leaves' as const, label: `Conges${pendingLeaves.length > 0 ? ` (${pendingLeaves.length})` : ''}`, icon: Plane },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ' +
                  (isActive ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
                }
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'employees' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-medium cursor-pointer focus:ring-2 focus:ring-primary/20 transition"
            >
              <option value="">Tous les roles</option>
              {Object.keys(ROLE_CONFIG).map(r => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'attendance' && (
          <button onClick={() => setShowAttendance(true)} className="btn-modern-primary self-start">
            <Plus size={16} strokeWidth={2.5} />
            Enregistrer presence
          </button>
        )}

        {activeTab === 'leaves' && (
          <button onClick={() => setShowLeave(true)} className="btn-modern-primary self-start">
            <Plus size={16} strokeWidth={2.5} />
            Demande de conge
          </button>
        )}
      </div>

      {/* TAB EMPLOYES */}
      {activeTab === 'employees' && (
        <>
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(emp => {
                const config = ROLE_CONFIG[emp.role] || ROLE_CONFIG.laveur
                return (
                  <div key={emp.id} className="card-modern flex flex-col justify-between hover:shadow-lg transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={emp.full_name} size="lg" />
                          <div className="min-w-0">
                            <h3 className="font-bold text-on-surface truncate">{emp.full_name}</h3>
                            <p className="text-xs text-on-surface-variant font-mono">#{emp.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActive(emp)}
                          className={
                            'badge-modern shrink-0 ' +
                            (emp.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')
                          }
                        >
                          <span className={'w-1.5 h-1.5 rounded-full ' + (emp.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {emp.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </div>

                      <div className="mb-4">
                        <span className={'badge-modern ' + config.bg + ' ' + config.text}>
                          <Briefcase size={11} />
                          {config.label}
                        </span>
                      </div>

                      <div className="rounded-xl bg-surface-container-low p-3 flex flex-col gap-2.5">
                        {emp.phone && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant flex items-center gap-1.5">
                              <Phone size={12} />
                              Telephone
                            </span>
                            <span className="font-semibold text-on-surface">{emp.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface-variant">Salaire mensuel</span>
                          <span className="font-bold text-on-surface">
                            {Number(emp.salary).toLocaleString('fr-FR')} XOF
                          </span>
                        </div>
                        {emp.hire_date && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant">Depuis</span>
                            <span className="font-medium text-on-surface-variant">
                              {new Date(emp.hire_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-end">
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-red-500 hover:text-white text-on-surface-variant transition-all flex items-center justify-center"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card-modern text-center py-16">
              <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
                <Users size={28} className="text-on-surface-variant/50" />
              </div>
              <p className="text-sm font-bold text-on-surface mb-1">Aucun employe</p>
              <p className="text-xs text-on-surface-variant mb-4">Ajoutez votre premier membre d&apos;equipe</p>
              <button onClick={() => setShowForm(true)} className="btn-modern-primary mx-auto">
                <Plus size={16} strokeWidth={2.5} />
                Ajouter
              </button>
            </div>
          )}
        </>
      )}

      {/* TAB POINTAGE */}
      {activeTab === 'attendance' && (
        todayAtt.length > 0 ? (
          <div className="card-modern !p-0 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30">
              <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Pointage du jour
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {todayAtt.length} enregistrement(s)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employe</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Arrivee</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Depart</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAtt.map(att => {
                    const emp = employees.find(e => e.id === att.employee_id)
                    const config = STATUS_ATT[att.status] || STATUS_ATT.present
                    return (
                      <tr key={att.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={emp?.full_name || '?'} size="sm" />
                            <span className="text-sm font-semibold text-on-surface">
                              {emp?.full_name || 'Inconnu'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className={'badge-modern ' + config.bg + ' ' + config.text}>
                            <span className={'w-1.5 h-1.5 rounded-full ' + config.dot} />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-on-surface">
                          {new Date(att.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-5 text-sm text-on-surface">
                          {att.check_out
                            ? new Date(att.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : <span className="text-xs text-on-surface-variant italic">En cours</span>
                          }
                        </td>
                        <td className="py-3 px-5 text-right">
                          {!att.check_out && (
                            <button
                              onClick={() => handleCheckOut(att)}
                              className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white text-primary text-xs font-semibold transition-all"
                            >
                              Enregistrer depart
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-modern text-center py-16">
            <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
              <Clock size={28} className="text-on-surface-variant/50" />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">Aucun pointage aujourd&apos;hui</p>
            <p className="text-xs text-on-surface-variant mb-4">Enregistrez la premiere arrivee</p>
            <button onClick={() => setShowAttendance(true)} className="btn-modern-primary mx-auto">
              <Plus size={16} strokeWidth={2.5} />
              Enregistrer
            </button>
          </div>
        )
      )}

      {/* TAB CONGES */}
      {activeTab === 'leaves' && (
        leaves.length > 0 ? (
          <div className="card-modern !p-0 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Demandes de conges
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {pendingLeaves.length} en attente de validation
                </p>
              </div>
              {pendingLeaves.length > 0 && (
                <span className="badge-modern bg-amber-50 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Action requise
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employe</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Du</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Au</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                    <th className="py-3 px-5 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(leave => {
                    const emp = employees.find(e => e.id === leave.employee_id)
                    return (
                      <tr key={leave.id} className="hover:bg-primary-fixed/20 transition-colors border-b border-outline-variant/20 last:border-0">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={emp?.full_name || '?'} size="sm" />
                            <span className="text-sm font-semibold text-on-surface">
                              {emp?.full_name || 'Inconnu'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="badge-modern bg-violet-50 text-violet-700 capitalize">
                            {leave.type}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-on-surface whitespace-nowrap">
                          {new Date(leave.start_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-5 text-sm text-on-surface whitespace-nowrap">
                          {new Date(leave.end_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-5">
                          <span className={
                            'badge-modern ' +
                            (leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                             leave.status === 'rejected' ? 'bg-red-50 text-red-700' :
                             'bg-amber-50 text-amber-700')
                          }>
                            <span className={
                              'w-1.5 h-1.5 rounded-full ' +
                              (leave.status === 'approved' ? 'bg-emerald-500' :
                               leave.status === 'rejected' ? 'bg-red-500' :
                               'bg-amber-500')
                            } />
                            {leave.status === 'approved' ? 'Approuve' :
                             leave.status === 'rejected' ? 'Refuse' : 'En attente'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          {leave.status === 'pending' && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveLeave(leave)}
                                className="w-8 h-8 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center transition"
                                title="Approuver"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => handleRejectLeave(leave)}
                                className="w-8 h-8 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition"
                                title="Refuser"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-modern text-center py-16">
            <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
              <Plane size={28} className="text-on-surface-variant/50" />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">Aucune demande de conge</p>
            <p className="text-xs text-on-surface-variant mb-4">Les demandes apparaitront ici</p>
            <button onClick={() => setShowLeave(true)} className="btn-modern-primary mx-auto">
              <Plus size={16} strokeWidth={2.5} />
              Nouvelle demande
            </button>
          </div>
        )
      )}

      {/* MODAL NOUVEL EMPLOYE */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvel employe" size="md">
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <Field label="Nom complet" required>
            <Input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Prenom et Nom" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role" required>
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Employee['role'] })}>
                {Object.keys(ROLE_CONFIG).map(r => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Telephone">
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 ..." />
            </Field>
            <Field label="Salaire mensuel (XOF)">
              <Input type="number" min="0" value={form.salary} onChange={e => setForm({ ...form, salary: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="Date d'embauche">
              <Input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL POINTAGE */}
      <Modal open={showAttendance} onClose={() => setShowAttendance(false)} title="Enregistrer une presence" size="md">
        <form onSubmit={handleCreateAttendance} className="space-y-4">
          <Field label="Employe" required>
            <Select required value={attForm.employee_id} onChange={e => setAttForm({ ...attForm, employee_id: e.target.value })}>
              <option value="">Selectionner...</option>
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Statut" required>
            <Select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value as any })}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="retard">Retard</option>
              <option value="conge">Conge</option>
            </Select>
          </Field>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Enregistrer</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAttendance(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CONGE */}
      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Nouvelle demande de conge" size="md">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <Field label="Employe" required>
            <Select required value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}>
              <option value="">Selectionner...</option>
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Type" required>
            <Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}>
              <option value="conge">Conge</option>
              <option value="maladie">Maladie</option>
              <option value="autre">Autre</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date debut" required>
              <Input type="date" required value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
            </Field>
            <Field label="Date fin" required>
              <Input type="date" required value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} placeholder="Motif..." rows={3} />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Envoyer la demande</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowLeave(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default HRPageModern
