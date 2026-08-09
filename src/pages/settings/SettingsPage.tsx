import React, { useState, useRef } from 'react'
import { useAuthStore, useShopConfig } from '../../lib/store'
import { PageHeader, Button, Field, Input, Select, Textarea, Card, Tabs, Badge, Alert } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Save, Upload, X } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { config, setConfig } = useShopConfig()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('boutique')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: config.name,
    slogan: config.slogan,
    logo: config.logo,
    primaryColor: config.primaryColor,
    phone: config.phone,
    email: config.email,
    address: config.address,
    currency: config.currency,
    footer: config.footer,
    msgReception: config.msgReception || '',
    msgPret: config.msgPret || '',
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Logo trop lourd — max 2 MB'); return }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, logo: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    setConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Paramètres" subtitle="Configuration de votre pressing" />

      <Tabs
        tabs={[
          { key: 'boutique', label: 'Mon Pressing', icon: '🏪' },
          { key: 'messages', label: 'Messages', icon: '💬' },
          { key: 'apparence', label: 'Apparence', icon: '🎨' },
          { key: 'account', label: 'Compte', icon: '👤' },
          { key: 'system', label: 'Système', icon: '⚙️' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {saved && <Alert type="success" message="✅ Paramètres sauvegardés avec succès !" />}

      {/* ONGLET MESSAGES */}
      {activeTab === 'messages' && (
        <Card>
          <h2 className="text-base font-bold mb-2">Messages WhatsApp automatiques</h2>
          <p className="text-sm text-gray-500 mb-5">Ces messages sont envoyés automatiquement via WhatsApp. Utilisez les variables : <span className="font-mono bg-gray-100 px-1 rounded">{'{prenom}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{ticket}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{nb}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{date}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{total}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{reste}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{adresse}'}</span> <span className="font-mono bg-gray-100 px-1 rounded">{'{nom}'}</span></p>
          <div className="space-y-5">
            <Field label="📥 Message de réception (envoyé à la création de commande)">
              <Textarea value={form.msgReception} onChange={e => setForm(f => ({ ...f, msgReception: e.target.value }))} rows={6} placeholder="Message envoyé quand le client dépose ses vêtements..." />
            </Field>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 mb-2">APERÇU</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{form.msgReception.replace('{prenom}', 'Kouassi').replace('{nb}', '3').replace('{ticket}', 'PM-123456').replace('{date}', '15/08/2026').replace('{total}', '7 500').replace('{adresse}', form.address || 'Abidjan').replace('{nom}', form.name || 'Mon Pressing')}</p>
            </div>
            <Field label="🎉 Message vêtements prêts (envoyé quand statut = Prêt)">
              <Textarea value={form.msgPret} onChange={e => setForm(f => ({ ...f, msgPret: e.target.value }))} rows={6} placeholder="Message envoyé quand les vêtements sont prêts..." />
            </Field>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 mb-2">APERÇU</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{form.msgPret.replace('{prenom}', 'Kouassi').replace('{nb}', '3').replace('{ticket}', 'PM-123456').replace('{reste}', '5 000').replace('{adresse}', form.address || 'Abidjan').replace('{nom}', form.name || 'Mon Pressing')}</p>
            </div>
            <Button className="w-full" icon={<Save size={16} />} onClick={handleSave}>
              Sauvegarder les messages
            </Button>
          </div>
        </Card>
      )}

      {/* ONGLET MON PRESSING */}
      {activeTab === 'boutique' && (
        <Card>
          <h2 className="text-base font-bold mb-5">Informations de votre pressing</h2>
          <div className="space-y-4">

            {/* Logo */}
            <Field label="Logo du pressing">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {form.logo
                    ? <img src={form.logo} alt="logo" className="w-full h-full object-cover rounded-xl" />
                    : <span className="text-3xl">🧺</span>
                  }
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition">
                    <Upload size={15} /> Choisir un logo
                  </button>
                  {form.logo && (
                    <button onClick={() => setForm(f => ({ ...f, logo: '' }))}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition">
                      <X size={15} /> Supprimer
                    </button>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG, SVG — max 2 MB</p>
                </div>
              </div>
            </Field>

            <Field label="Nom du pressing" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pressing Élégance, Clean & Fresh..." />
            </Field>

            <Field label="Slogan">
              <Input value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))} placeholder="Ex: Vos habits, notre passion !" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone">
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 XX XX XX XX" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@monpressing.ci" />
              </Field>
              <Field label="Devise">
                <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="XOF">XOF — Franc CFA Ouest</option>
                  <option value="XAF">XAF — Franc CFA Est</option>
                  <option value="GNF">GNF — Franc Guinéen</option>
                  <option value="USD">USD — Dollar US</option>
                  <option value="EUR">EUR — Euro</option>
                </Select>
              </Field>
              <Field label="Langue">
                <Select defaultValue="fr">
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 English</option>
                </Select>
              </Field>
            </div>

            <Field label="Adresse">
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse complète de votre pressing..." rows={2} />
            </Field>

            <Field label="Message de pied de ticket/facture">
              <Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Ex: Merci pour votre confiance ! Revenez nous voir." />
            </Field>

            <Button className="w-full" icon={<Save size={16} />} onClick={handleSave}>
              Sauvegarder les informations
            </Button>
          </div>
        </Card>
      )}

      {/* ONGLET APPARENCE */}
      {activeTab === 'apparence' && (
        <Card>
          <h2 className="text-base font-bold mb-5">Personnalisation visuelle</h2>
          <div className="space-y-6">

            <Field label="Couleur principale">
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="w-14 h-14 rounded-xl border border-gray-300 cursor-pointer p-1"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-700">{form.primaryColor}</p>
                  <p className="text-xs text-gray-400 mt-1">Utilisée sur les boutons, menus et tickets</p>
                </div>
              </div>
            </Field>

            {/* Couleurs prédéfinies */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Couleurs suggérées</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { color: '#7c3aed', label: 'Violet (défaut)' },
                  { color: '#2563eb', label: 'Bleu royal' },
                  { color: '#059669', label: 'Vert émeraude' },
                  { color: '#dc2626', label: 'Rouge' },
                  { color: '#d97706', label: 'Orange' },
                  { color: '#0891b2', label: 'Cyan' },
                  { color: '#7c2d12', label: 'Marron' },
                  { color: '#1f2937', label: 'Anthracite' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, primaryColor: color }))}
                    title={label}
                    className={`w-10 h-10 rounded-xl border-4 transition ${form.primaryColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Aperçu */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Aperçu</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: form.primaryColor }}>
                  {form.logo ? <img src={form.logo} alt="logo" className="w-full h-full object-cover rounded-xl" /> : '🧺'}
                </div>
                <div>
                  <p className="font-bold" style={{ color: form.primaryColor }}>{form.name || 'Mon Pressing'}</p>
                  <p className="text-xs text-gray-400">{form.slogan || 'Gestion professionnelle'}</p>
                </div>
              </div>
              <button className="px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{ backgroundColor: form.primaryColor }}>
                Exemple de bouton
              </button>
            </div>

            <Button className="w-full" icon={<Save size={16} />} onClick={handleSave}>
              Sauvegarder l'apparence
            </Button>
          </div>
        </Card>
      )}

      {/* ONGLET COMPTE */}
      {activeTab === 'account' && (
        <Card>
          <h2 className="text-base font-bold mb-5">Mon compte</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-bold text-lg">{user?.full_name || 'Admin'}</p>
                <p className="text-gray-500">{user?.email}</p>
                <Badge label={user?.role || 'admin'} color="purple" />
              </div>
            </div>
            <Field label="Email">
              <Input value={user?.email || ''} disabled className="bg-gray-50" />
            </Field>
            <Field label="Rôle">
              <Input value={user?.role || 'admin'} disabled className="bg-gray-50 capitalize" />
            </Field>
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm font-bold text-yellow-800 mb-1">🔐 Mot de passe</p>
              <p className="text-xs text-yellow-600">Pour changer votre mot de passe, utilisez l'option "Mot de passe oublié" sur la page de connexion.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ONGLET SYSTÈME */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-base font-bold mb-4">🔒 Sécurité</h2>
            <div className="space-y-3">
              {[
                { label: 'Sauvegarde automatique', status: 'Activée', color: 'green' },
                { label: 'Chiffrement données', status: 'Activé (Supabase)', color: 'green' },
                { label: 'Authentification 2FA', status: 'Bientôt disponible', color: 'yellow' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge label={item.status} color={item.color} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold mb-4">💾 Données</h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const data = JSON.stringify({ timestamp: new Date().toISOString(), config: form })
                  const blob = new Blob([data], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`; a.click()
                }}
                className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition">
                📥 Exporter les données (JSON)
              </button>
              <button
                onClick={() => { if (confirm('⚠️ Réinitialiser TOUTES les données ? Irréversible !')) { localStorage.clear(); window.location.reload() } }}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition">
                🗑️ Réinitialiser toutes les données
              </button>
            </div>
          </Card>
        </div>
      )}

      <button onClick={handleLogout} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition">
        🔓 Se déconnecter
      </button>
    </div>
  )
}
