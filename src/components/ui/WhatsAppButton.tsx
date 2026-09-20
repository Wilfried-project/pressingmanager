import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, Check, Eye, EyeOff } from 'lucide-react'
import { buildWhatsAppUrl } from '../../lib/whatsappTemplates'
import { toast } from '../../lib/toast'

interface WhatsAppButtonProps {
  phone: string
  clientName?: string
  defaultMessage: string
  label?: string
  variant?: 'icon' | 'button' | 'compact'
  className?: string
  onSent?: () => void
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  clientName,
  defaultMessage,
  label = 'WhatsApp',
  variant = 'compact',
  className = '',
  onSent,
}) => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(defaultMessage)
  const [editMode, setEditMode] = useState(false)
  const [sent, setSent] = useState(false)

  const handleOpen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (open) return
    setMessage(defaultMessage)
    setEditMode(false)
    setSent(false)
    setOpen(true)
  }

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setOpen(false)
  }

  const handleSend = () => {
    if (!phone) {
      toast.error('Aucun numéro de téléphone pour ce client')
      return
    }
    if (!message.trim()) {
      toast.error('Le message est vide')
      return
    }
    window.open(buildWhatsAppUrl(phone, message), '_blank')
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      onSent?.()
    }, 1500)
  }

  return (
    <>
      {/* Variante ICÔNE — pour les tableaux compacts */}
      {variant === 'icon' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`w-8 h-8 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center shadow-sm ${className}`}
          title="Envoyer un message WhatsApp"
        >
          <MessageCircle size={15} />
        </button>
      )}

      {/* Variante BOUTON — pour les modals */}
      {variant === 'button' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all shadow-sm ${className}`}
        >
          <MessageCircle size={16} />
          {label}
        </button>
      )}

      {/* Variante COMPACTE — pour les colonnes Actions */}
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all font-bold text-xs shadow-sm ${className}`}
          title="Envoyer un message WhatsApp"
        >
          <MessageCircle size={14} />
          <span>{label}</span>
        </button>
      )}

      {/* Modal */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Message WhatsApp</h3>
                  <p className="text-xs text-green-50 truncate">À : {clientName || phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenu */}
            {!sent ? (
              <>
                <div className="p-4 flex-1">
                  {!editMode ? (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1.5">APERÇU DU MESSAGE</p>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {message}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        MODIFIER LE MESSAGE
                      </label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={10}
                        autoFocus
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
                      />
                    </div>
                  )}
                </div>

                <div className="px-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs text-slate-500 hover:text-green-600 font-semibold flex items-center gap-1"
                  >
                    {editMode ? <EyeOff size={12} /> : <Eye size={12} />}
                    {editMode ? 'Voir l\'aperçu' : 'Modifier le message'}
                  </button>
                </div>

                <div className="p-4 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() || !phone}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition shadow-sm"
                  >
                    <Send size={18} />
                    ENVOYER SUR WHATSAPP
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check size={32} className="text-green-600" strokeWidth={3} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">Message envoyé !</h3>
                <p className="text-sm text-slate-500">
                  WhatsApp va s'ouvrir pour finaliser l'envoi à {clientName || phone}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}