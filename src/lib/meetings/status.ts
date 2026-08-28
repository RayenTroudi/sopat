/**
 * Machine à états de l'assistant de réunion IA.
 *
 * Les webhooks Recall n'arrivent pas nécessairement dans l'ordre : la livraison
 * est réessayée pendant 24 h et rien ne garantit qu'un `bot.in_call_recording`
 * retardé n'atterrisse pas après `bot.done`. Le rang ci-dessous rend l'ordre
 * explicite : un statut ne peut que progresser. Sans cela, un événement en
 * retard ferait régresser une réunion terminée vers « en réunion », et le
 * compte rendu déjà produit paraîtrait perdu.
 *
 * Fichier volontairement sans dépendance serveur : il est importé par l'UI pour
 * afficher les libellés.
 */

export const MEETING_AI_STATUSES = [
  'scheduled',
  'bot_created',
  'joining',
  'in_meeting',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const

export type MeetingAiStatus = (typeof MEETING_AI_STATUSES)[number]

/** Rang de progression. Les états terminaux partagent le rang le plus élevé. */
const RANK: Record<MeetingAiStatus, number> = {
  scheduled:   0,
  bot_created: 1,
  joining:     2,
  in_meeting:  3,
  processing:  4,
  completed:   5,
  failed:      5,
  cancelled:   5,
}

const TERMINAL: MeetingAiStatus[] = ['completed', 'cancelled']

export function isTerminal(status: MeetingAiStatus | null | undefined): boolean {
  return status != null && TERMINAL.includes(status)
}

/**
 * Décide si `next` doit remplacer `current`.
 * - Un état terminal ne bouge plus (sauf 'failed' → relance explicite, traitée
 *   par le service, pas par un webhook).
 * - On ne redescend jamais le rang.
 */
export function canTransition(
  current: MeetingAiStatus | null | undefined,
  next: MeetingAiStatus,
): boolean {
  if (current == null) return true
  if (current === next) return false
  if (isTerminal(current)) return false
  // 'failed' est rattrapable par un événement plus avancé (une transcription
  // qui finit par arriver après un échec de bot, par exemple).
  return RANK[next] > RANK[current] || (current === 'failed' && next === 'processing')
}

export const AI_STATUS_LABELS: Record<MeetingAiStatus, string> = {
  scheduled:   'Programmée',
  bot_created: 'Bot créé',
  joining:     'Connexion en cours',
  in_meeting:  'En réunion',
  processing:  'Analyse en cours',
  completed:   'Terminée',
  failed:      'Échec',
  cancelled:   'Annulée',
}

/** Couleurs du système de design admin (variables CSS existantes). */
export const AI_STATUS_COLORS: Record<MeetingAiStatus, { fg: string; bg: string }> = {
  scheduled:   { fg: 'var(--admin-text-muted)', bg: 'var(--admin-bg)' },
  bot_created: { fg: 'var(--admin-accent)',     bg: 'var(--admin-accent-dim)' },
  joining:     { fg: 'var(--admin-accent)',     bg: 'var(--admin-accent-dim)' },
  in_meeting:  { fg: 'var(--admin-emerald)',    bg: 'var(--admin-emerald-dim)' },
  processing:  { fg: 'var(--admin-amber)',      bg: 'var(--admin-amber-dim)' },
  completed:   { fg: 'var(--admin-emerald)',    bg: 'var(--admin-emerald-dim)' },
  failed:      { fg: 'var(--admin-red)',        bg: 'var(--admin-red-dim)' },
  cancelled:   { fg: 'var(--admin-text-muted)', bg: 'var(--admin-bg)' },
}

/** Correspondance événement Recall → statut SOPAT. */
export function statusForEvent(event: string): MeetingAiStatus | null {
  switch (event) {
    case 'bot.joining_call':
    case 'bot.in_waiting_room':
      return 'joining'
    case 'bot.in_call_not_recording':
    case 'bot.in_call_recording':
      return 'in_meeting'
    case 'bot.call_ended':
    case 'bot.done':
    case 'recording.done':
      return 'processing'
    case 'bot.fatal':
    case 'bot.recording_permission_denied':
    case 'transcript.failed':
      return 'failed'
    default:
      return null
  }
}
