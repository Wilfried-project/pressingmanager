export interface TemplateData {
  clientName?: string
  orderNumber?: string
  total?: number
  shopName?: string
  shopPhone?: string
  shopAddress?: string
  customMessage?: string
}

export interface WhatsAppTemplate {
  id: string
  label: string
  icon: string
  category: 'client' | 'order'
  build: (data: TemplateData) => string
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'client_bienvenue',
    label: 'Bienvenue',
    icon: '👋',
    category: 'client',
    build: (d) => `Bonjour ${d.clientName || ''} 👋

Bienvenue chez ${d.shopName || 'notre pressing'} ! Nous sommes ravis de vous compter parmi nos clients.

📍 ${d.shopAddress || ''}
📞 ${d.shopPhone || ''}

À très bientôt pour prendre soin de votre linge !`
  },
  {
    id: 'client_relance',
    label: 'Relance douce',
    icon: '💬',
    category: 'client',
    build: (d) => `Bonjour ${d.clientName || ''},

Nous espérons que vous allez bien ! Cela fait un moment que nous ne vous avons pas vu chez ${d.shopName || 'nous'}.

Une petite commande à nous confier ? 😊

📍 ${d.shopAddress || ''}
📞 ${d.shopPhone || ''}`
  },
  {
    id: 'client_promo',
    label: 'Promotion',
    icon: '🎉',
    category: 'client',
    build: (d) => `Bonjour ${d.clientName || ''} 🎉

Offre spéciale chez ${d.shopName || 'notre pressing'} !

${d.customMessage || '-20% sur le nettoyage des couvertures cette semaine'}

Profitez-en vite, l'offre est limitée !

📞 ${d.shopPhone || ''}`
  },
  {
    id: 'client_remerciement',
    label: 'Remerciement',
    icon: '🙏',
    category: 'client',
    build: (d) => `Bonjour ${d.clientName || ''},

Merci beaucoup pour votre confiance et votre fidélité 🙏

C'est toujours un plaisir de prendre soin de votre linge chez ${d.shopName || 'nous'}.

À très bientôt !`
  },
  {
    id: 'client_libre',
    label: 'Message libre',
    icon: '✏️',
    category: 'client',
    build: (d) => d.customMessage || ''
  },
]

export const getTemplateById = (id: string): WhatsAppTemplate | undefined =>
  WHATSAPP_TEMPLATES.find(t => t.id === id)

export const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export const buildWhatsAppUrl = (phone: string, message: string): string => {
  const cleanPhone = cleanPhoneNumber(phone)
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}