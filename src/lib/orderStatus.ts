// ============================================================
// Statut canonique UNIQUE — source de vérité partagée.
// Dashboard, Commandes, Atelier : TOUT doit passer par ici.
// Règle : tout ce qui n'est ni 'pret', ni 'livre', ni 'annule'
// (recu, en_attente, tri, lavage, ...) est considéré 'en_cours'.
// ============================================================
export const canonOrderStatus = (s: string): string => {
  if (s === 'pret' || s === 'livre' || s === 'annule') return s
  return 'en_cours'
}

export const CANON_STATUS_LABEL: Record<string, string> = {
  en_cours: 'En cours',
  pret: 'Prêt',
  livre: 'Livré',
  annule: 'Annulé',
}

// Définition UNIQUE d'une commande en retard : date prévue passée
// (jour calendaire local) ET commande ni livrée ni annulée.
export const isLateOrder = (o: { expected_at?: string; status: string }, todayStart: Date): boolean => {
  if (!o.expected_at) return false
  const st = canonOrderStatus(o.status)
  if (st === 'livre' || st === 'annule') return false
  return new Date(o.expected_at).getTime() < todayStart.getTime()
}

// Jour calendaire local YYYY-MM-DD (évite les décalages UTC de toISOString).
export const toLocalDay = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
