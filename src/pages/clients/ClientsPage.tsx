import React, { useState, useMemo } from 'react'
import { useClientStore, useOrderStore, useLoyaltyStore } from '../../lib/store'
import { PageHeader, Button, SearchInput, Table, Modal, Field, Input, Select, Textarea, Badge, EmptyState, Card, Tabs, Alert } from '../../components/ui'
import { Plus, Eye, Edit2, Trash2, Ban, Printer, Star, Phone } from 'lucide-react'
import type { Client, ClientGroup } from '../../types'

const GROUP_LABELS: Record<ClientGroup, string> = { standard: 'Standard', vip: 'VIP', entreprise: 'Entreprise', hotel: 'Hôtel', blacklist: 'Liste noire' }
const GROUP_COLORS: Record<ClientGroup, string> = { standard: 'gray', vip: 'purple', entreprise: 'blue', hotel: 'orange', blacklist: 'red' }
const LEVEL_COLORS: Record<string, string> = { bronze: 'orange', silver: 'gray', gold: 'yellow', platinum: 'purple' }

const EMPTY: Partial<Client> = { first_name: '', last_name: '', phone: '', whatsapp: '', email: '', address: '', group: 'standard', notes: '', discount_rate: 0 }

export const ClientsPage: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, searchClients } = useClientStore()
  const orders = useOrderStore(s => s.orders)
  const { cards, getCardByClient, getLevelFromPoints } = useLoyaltyStore()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Client | null>(null)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState<Partial<Client>>(EMPTY)
  const [activeTab, setActiveTab] = useState('info')
  const [showBlacklist, setShowBlacklist] = useState(false)

  const filtered = useMemo(() => {
    let list = search ? searchClients(search) : clients
    if (filterGroup) list = list.filter(c => c.group === filterGroup)
    if (showBlacklist) list = list.filter(c => c.is_blacklisted)
    else list = list.filter(c => !c.is_blacklisted)
    return list
  }, [clients, search, filterGroup, showBlacklist])

  const getClientOrders = (id: string) => orders.filter(o => o.client_id === id)
  const getClientTotal = (id: string) => orders.filter(o => o.client_id === id && o.payment_status === 'paye').reduce((s, o) => s + o.total, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editClient) {
      updateClient(editClient.id, form)
    } else {
      const newClient: Client = { id: crypto.randomUUID(), agency_id: 'default', balance: 0, credit: 0, loyalty_points: 0, is_blacklisted: false, created_at: new Date().toISOString(), ...form } as Client
      addClient(newClient)
    }
    resetForm()
  }

  const resetForm = () => { setForm(EMPTY); setShowForm(false); setEditClient(null) }

  const openEdit = (c: Client) => { setEditClient(c); setForm(c); setShowForm(true) }

  const printClient = (c: Client) => {
    const clientOrders = getClientOrders(c.id)
    const total = getClientTotal(c.id)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Fiche Client — ${c.first_name} ${c.last_name}</title>
    <style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto}h1{color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.field{background:#f8f7ff;padding:10px;border-radius:8px}
    .label{font-size:11px;color:#666;margin-bottom:3px}.value{font-weight:600;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#7c3aed;color:white;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}
    </style></head><body>
    <h1>🧺 PressingManager — Fiche Client</h1>
    <div class="grid">
    <div class="field"><div class="label">Nom complet</div><div class="value">${c.first_name} ${c.last_name}</div></div>
    <div class="field"><div class="label">Téléphone</div><div class="value">${c.phone}</div></div>
    <div class="field"><div class="label">WhatsApp</div><div class="value">${c.whatsapp || '-'}</div></div>
    <div class="field"><div class="label">Email</div><div class="value">${c.email || '-'}</div></div>
    <div class="field"><div class="label">Groupe</div><div class="value">${GROUP_LABELS[c.group]}</div></div>
    <div class="field"><div class="label">Points fidélité</div><div class="value">${c.loyalty_points} pts</div></div>
    <div class="field"><div class="label">Total dépensé</div><div class="value">${total.toLocaleString('fr-FR')} XOF</div></div>
    <div class="field"><div class="label">Remise</div><div class="value">${c.discount_rate}%</div></div>
    </div>
    <p><strong>Adresse:</strong> ${c.address || '-'}</p>
    <p><strong>Notes:</strong> ${c.notes || '-'}</p>
    <h2>Historique des commandes (${clientOrders.length})</h2>
    <table><tr><th>Ticket</th><th>Date</th><th>Total</th><th>Statut</th></tr>
    ${clientOrders.map(o => `<tr><td>#${o.ticket_number}</td><td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td><td>${o.total.toLocaleString('fr-FR')} XOF</td><td>${o.status}</td></tr>`).join('')}
    </table>
    <p style="text-align:center;color:#999;margin-top:30px;font-size:11px">Imprimé le ${new Date().toLocaleDateString('fr-FR')} — PressingManager v1.0</p>
    </body></html>`)
    win.document.close()
    win.print()
  }

  const detectDuplicates = () => {
    const seen = new Map<string, Client[]>()
    clients.forEach(c => {
      const key = c.phone.replace(/\s/g, '')
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push(c)
    })
    return Array.from(seen.values()).filter(g => g.length > 1)
  }
  const duplicates = detectDuplicates()

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle={`${clients.filter(c => !c.is_blacklisted).length} client(s) actif(s)`}
        action={<Button icon={<Plus size={18} />} onClick={() => { setForm(EMPTY); setShowForm(true) }}>Nouveau client</Button>} />

      {/* Alerts */}
      {duplicates.length > 0 && (
        <Alert type="warning" message={`⚠️ ${duplicates.length} doublon(s) détecté(s) par numéro de téléphone — vérifiez vos fiches clients`} />
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, email..." className="flex-1" />
          <Select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="sm:w-44">
            <option value="">Tous les groupes</option>
            {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <button onClick={() => setShowBlacklist(!showBlacklist)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition border ${showBlacklist ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600'}`}>
            🚫 {showBlacklist ? 'Liste noire' : 'Blacklist'}
          </button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['standard', 'vip', 'entreprise', 'hotel'] as ClientGroup[]).map(g => (
          <Card key={g} className="p-4 text-center cursor-pointer hover:border-purple-300 border-2 border-transparent" onClick={() => setFilterGroup(filterGroup === g ? '' : g)}>
            <p className="text-2xl font-bold text-gray-900">{clients.filter(c => c.group === g && !c.is_blacklisted).length}</p>
            <Badge label={GROUP_LABELS[g]} color={GROUP_COLORS[g]} />
          </Card>
        ))}
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <Table headers={['Client', 'Contact', 'Groupe', 'Commandes', 'CA Total', 'Fidélité', 'Actions']}>
          {filtered.map(client => {
            const card = getCardByClient(client.id)
            const level = getLevelFromPoints(client.loyalty_points)
            return (
              <tr key={client.id} className="hover:bg-purple-50 transition">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{client.first_name} {client.last_name}</p>
                      <p className="text-xs text-gray-400">Depuis {new Date(client.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium">{client.phone}</p>
                  {client.whatsapp && <p className="text-xs text-green-600">📱 {client.whatsapp}</p>}
                  {client.email && <p className="text-xs text-gray-400 truncate max-w-32">{client.email}</p>}
                </td>
                <td className="px-5 py-4">
                  <Badge label={GROUP_LABELS[client.group]} color={GROUP_COLORS[client.group]} />
                  {client.is_blacklisted && <div className="mt-1"><Badge label="🚫 Blacklist" color="red" /></div>}
                  {client.discount_rate > 0 && <div className="mt-1"><Badge label={`-${client.discount_rate}%`} color="green" /></div>}
                </td>
                <td className="px-5 py-4 text-center font-bold text-purple-700">{getClientOrders(client.id).length}</td>
                <td className="px-5 py-4 font-bold text-sm">{getClientTotal(client.id).toLocaleString('fr-FR')} XOF</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-500" />
                    <span className="text-xs font-bold">{client.loyalty_points} pts</span>
                    <Badge label={level} color={LEVEL_COLORS[level]} />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setShowDetail(client); setActiveTab('info') }} className="p-1.5 hover:bg-purple-100 text-purple-600 rounded-lg" title="Voir détails"><Eye size={15} /></button>
                    <button onClick={() => openEdit(client)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Modifier"><Edit2 size={15} /></button>
                    <button onClick={() => printClient(client)} className="p-1.5 hover:bg-green-100 text-green-600 rounded-lg" title="Imprimer"><Printer size={15} /></button>
                    <button onClick={() => updateClient(client.id, { is_blacklisted: !client.is_blacklisted })}
                      className={`p-1.5 rounded-lg ${client.is_blacklisted ? 'hover:bg-green-100 text-green-600' : 'hover:bg-orange-100 text-orange-500'}`} title={client.is_blacklisted ? 'Retirer de la liste noire' : 'Blacklister'}>
                      <Ban size={15} />
                    </button>
                    <button onClick={() => { if (confirm(`Supprimer ${client.first_name} ${client.last_name} ?`)) deleteClient(client.id) }}
                      className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg" title="Supprimer"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </Table>
      ) : (
        <Card><EmptyState icon="👥" message={showBlacklist ? "Liste noire vide" : "Aucun client trouvé"} action={!showBlacklist ? <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>Ajouter le premier client</Button> : undefined} /></Card>
      )}

      {/* FORM MODAL */}
      <Modal open={showForm} onClose={resetForm} title={editClient ? `Modifier — ${editClient.first_name} ${editClient.last_name}` : 'Nouveau client'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom" required><Input required value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Prénom" /></Field>
            <Field label="Nom" required><Input required value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Nom de famille" /></Field>
            <Field label="Téléphone" required><Input required value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+225 XX XX XX XX XX" /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+225 XX XX XX XX XX" /></Field>
            <Field label="Email"><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" /></Field>
            <Field label="Groupe"><Select value={form.group || 'standard'} onChange={e => setForm({ ...form, group: e.target.value as ClientGroup })}>
              {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select></Field>
            <Field label="Adresse"><Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Adresse complète" /></Field>
            <Field label="Remise accordée (%)" hint="Réduction automatique sur toutes les commandes"><Input type="number" min="0" max="100" value={form.discount_rate || 0} onChange={e => setForm({ ...form, discount_rate: parseFloat(e.target.value) })} /></Field>
          </div>
          <Field label="Observations / Notes spéciales"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Allergies, préférences, informations importantes..." /></Field>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editClient ? '✅ Mettre à jour' : '✅ Enregistrer'}</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      {showDetail && (
        <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`${showDetail.first_name} ${showDetail.last_name}`} size="xl">
          <div className="space-y-5">
            <Tabs
              tabs={[{ key: 'info', label: 'Informations', icon: '👤' }, { key: 'orders', label: `Commandes (${getClientOrders(showDetail.id).length})`, icon: '🧺' }, { key: 'loyalty', label: 'Fidélité', icon: '⭐' }]}
              active={activeTab} onChange={setActiveTab}
            />

            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Téléphone', value: showDetail.phone, icon: '📞' },
                    { label: 'WhatsApp', value: showDetail.whatsapp || '-', icon: '📱' },
                    { label: 'Email', value: showDetail.email || '-', icon: '📧' },
                    { label: 'Groupe', value: GROUP_LABELS[showDetail.group], icon: '🏷️' },
                    { label: 'Remise', value: `${showDetail.discount_rate || 0}%`, icon: '💰' },
                    { label: 'Inscrit le', value: new Date(showDetail.created_at).toLocaleDateString('fr-FR'), icon: '📅' },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{item.icon} {item.label}</p>
                      <p className="font-semibold text-sm mt-0.5 break-all">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-700">{getClientOrders(showDetail.id).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Commandes</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-green-700">{getClientTotal(showDetail.id).toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-gray-500 mt-1">XOF dépensés</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{showDetail.loyalty_points}</p>
                    <p className="text-xs text-gray-500 mt-1">Points</p>
                  </div>
                </div>
                {showDetail.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-yellow-700 mb-1">📝 Observations</p>
                    <p className="text-sm text-yellow-800">{showDetail.notes}</p>
                  </div>
                )}
                {showDetail.address && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-500">📍 Adresse</p>
                    <p className="text-sm font-medium text-blue-800 mt-0.5">{showDetail.address}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button icon={<Printer size={16} />} variant="ghost" className="flex-1" onClick={() => printClient(showDetail)}>Imprimer la fiche</Button>
                  <Button icon={<Edit2 size={16} />} variant="secondary" className="flex-1" onClick={() => { setShowDetail(null); openEdit(showDetail) }}>Modifier</Button>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {getClientOrders(showDetail.id).length > 0 ? (
                  getClientOrders(showDetail.id).reverse().map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-purple-700">#{order.ticket_number}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')} — {order.clothes.length} vêtement(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{order.total.toLocaleString('fr-FR')} XOF</p>
                        <Badge label={order.status.replace('_', ' ')} color={order.status === 'pret' ? 'green' : order.status === 'livre' ? 'gray' : 'yellow'} />
                      </div>
                    </div>
                  ))
                ) : <p className="text-center text-gray-400 py-8 text-sm">Aucune commande</p>}
              </div>
            )}

            {activeTab === 'loyalty' && (
              <div className="space-y-4">
                {(() => {
                  const level = getLevelFromPoints(showDetail.loyalty_points)
                  const levelColors: Record<string, string> = { bronze: 'from-amber-700 to-amber-500', silver: 'from-gray-500 to-gray-400', gold: 'from-yellow-500 to-yellow-400', platinum: 'from-purple-600 to-indigo-500' }
                  const nextLevel = { bronze: 500, silver: 2000, gold: 5000, platinum: Infinity }
                  const nextPts = nextLevel[level]
                  const progress = nextPts === Infinity ? 100 : Math.min(100, (showDetail.loyalty_points / nextPts) * 100)
                  return (
                    <div>
                      <div className={`bg-gradient-to-r ${levelColors[level]} rounded-2xl p-6 text-white mb-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm opacity-80">Niveau fidélité</p>
                            <p className="text-2xl font-bold capitalize">{level}</p>
                          </div>
                          <span className="text-5xl">{level === 'platinum' ? '💎' : level === 'gold' ? '🥇' : level === 'silver' ? '🥈' : '🥉'}</span>
                        </div>
                        <p className="text-3xl font-bold">{showDetail.loyalty_points} points</p>
                        {nextPts !== Infinity && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs opacity-70 mb-1">
                              <span>{showDetail.loyalty_points} pts</span>
                              <span>{nextPts} pts pour niveau suivant</span>
                            </div>
                            <div className="bg-white/30 rounded-full h-2">
                              <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm font-bold text-gray-700 mb-2">Avantages actuels :</p>
                        <div className="space-y-1">
                          {level === 'platinum' && <p className="text-sm text-purple-700">💎 Tous avantages inclus — Service premium</p>}
                          {['platinum', 'gold'].includes(level) && <p className="text-sm text-yellow-700">🥇 Réduction 20% sur tous les services</p>}
                          {['platinum', 'gold', 'silver'].includes(level) && <p className="text-sm text-gray-600">🥈 Livraison prioritaire</p>}
                          <p className="text-sm text-amber-700">🥉 Accès aux promotions exclusives</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
