/**
 * Journalisation structurée du module réunions.
 *
 * Un seul point de passage, pour deux raisons : les lignes restent
 * exploitables (préfixe constant, contexte en JSON) et surtout aucun secret ne
 * peut s'y glisser. On ne journalise que des identifiants et des codes
 * d'erreur — jamais une clé d'API, jamais l'URL de la réunion (elle vaut droit
 * d'entrée), jamais le contenu d'une transcription.
 */

export type MeetingLogContext = {
  meetingId?: string
  recallBotId?: string
  eventType?: string
  stage?: string
  errorCode?: string
  reportId?: string
  wordCount?: number
  createdActions?: number
  model?: string
}

const PREFIX = '[ai-meetings]'

function format(event: string, context: MeetingLogContext): string {
  const entries = Object.entries(context).filter(([, v]) => v !== undefined && v !== null)
  const suffix = entries.length ? ` ${JSON.stringify(Object.fromEntries(entries))}` : ''
  return `${PREFIX} ${event}${suffix}`
}

/** Détail d'erreur borné : un message de fournisseur peut être très verbeux. */
function errorDetail(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 300)
  return String(err).slice(0, 300)
}

export const logMeeting = {
  info(event: string, context: MeetingLogContext = {}) {
    console.log(format(event, context))
  },
  warn(event: string, context: MeetingLogContext = {}) {
    console.warn(format(event, context))
  },
  error(event: string, context: MeetingLogContext = {}, err?: unknown) {
    console.error(format(event, context), err === undefined ? '' : errorDetail(err))
  },
}
