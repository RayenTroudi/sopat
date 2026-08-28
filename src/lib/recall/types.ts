/**
 * Types de l'API Recall.ai (v1) utilisés par SOPAT.
 *
 * Volontairement partiels : seules les formes réellement consommées par le
 * module sont décrites, pour qu'un changement de champ non utilisé chez Recall
 * ne casse pas la compilation. Aucun champ n'est inventé — chaque forme suit la
 * documentation Create Bot / Retrieve Bot / Async transcription.
 */

/** Plateformes réellement prises en charge par le bot Recall.ai. */
export type MeetingPlatform = 'google_meet' | 'zoom' | 'microsoft_teams' | 'webex'

export const MEETING_PLATFORMS: readonly MeetingPlatform[] = [
  'google_meet',
  'zoom',
  'microsoft_teams',
  'webex',
] as const

export const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  google_meet:     'Google Meet',
  zoom:            'Zoom',
  microsoft_teams: 'Microsoft Teams',
  webex:           'Webex',
}

// ── Create Bot ────────────────────────────────────────────────────────────────

export type CreateBotInput = {
  meetingUrl: string
  botName: string
  /**
   * Horodatage ISO 8601. La documentation Recall demande au moins 10 minutes
   * dans le futur pour garantir la présence du bot à l'heure ; en deçà, on crée
   * le bot immédiatement (il rejoint tout de suite) plutôt que de programmer un
   * créneau que Recall ne garantit pas.
   */
  joinAt?: string
  /** Valeurs chaînes uniquement — contrainte de l'API. */
  metadata?: Record<string, string>
}

export type RecallBot = {
  id: string
  bot_name?: string | null
  meeting_url?: unknown
  join_at?: string | null
  status_changes?: Array<{
    code: string
    sub_code?: string | null
    created_at?: string | null
  }>
  recordings?: Array<{
    id: string
    started_at?: string | null
    completed_at?: string | null
    media_shortcuts?: {
      transcript?: {
        id?: string
        status?: { code?: string } | null
        data?: { download_url?: string | null } | null
      } | null
    } | null
  }>
  metadata?: Record<string, string> | null
}

// ── Transcription asynchrone ──────────────────────────────────────────────────

export type RecallTranscript = {
  id: string
  status?: { code?: string } | null
  data?: { download_url?: string | null } | null
}

/** Une prise de parole telle que livrée par le download_url de la transcription. */
export type RecallUtterance = {
  participant?: {
    id?: number
    name?: string | null
    is_host?: boolean
    email?: string | null
  } | null
  language_code?: string | null
  words?: Array<{
    text?: string
    start_timestamp?: { absolute?: string; relative?: number } | null
    end_timestamp?: { absolute?: string; relative?: number } | null
  }>
}
