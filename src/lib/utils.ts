// src/lib/utils.ts

/** Fusionne intelligemment des classes Tailwind */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Formate un montant en XOF (ex: 142500 -> "142 500 XOF") */
export function formatXOF(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0 XOF';
  return (
    new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(n) + ' XOF'
  );
}

/** Formate un montant sans devise (ex: 142500 -> "142 500") */
export function formatNumber(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Formate une date en JJ/MM/AAAA */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Formate une date avec heure (ex: "17/09/2026 a 14:32") */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Renvoie les initiales d'un nom (2 lettres max) */
export function initials(name: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Renvoie un pourcentage formate */
export function formatPct(value: number, decimals = 0): string {
  return value.toFixed(decimals) + '%';
}
