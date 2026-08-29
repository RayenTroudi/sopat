import crypto from 'node:crypto'
import { z } from 'zod'

/**
 * Vérification et validation des webhooks Recall.ai.
 *
 * L'algorithme suit la documentation « Verifying requests from Recall.ai » :
 * HMAC-SHA256 sur `{webhook-id}.{webhook-timestamp}.{corps brut}`, clé = partie
 * base64 du secret après le préfixe `whsec_`, en-tête `webhook-signature` de la
 * forme `v1,<signature base64>` (plusieurs signatures possibles, séparées par
 * des espaces, pendant une rotation de secret). Les alias `svix-*` sont
 * acceptés : Recall livre via Svix et certains espaces de travail reçoivent
 * encore ces en-têtes.
 *
 * Ce module ne détient aucun secret : il reçoit le secret en argument. Il n'a
 * donc pas besoin de `server-only`, et reste importable par les scripts de
 * vérification — ce qui permet d'éprouver la vérification de signature sans
 * lancer l'application.
 *
 * Le corps DOIT être la chaîne brute reçue : re-sérialiser un objet JSON change
 * les octets signés et invaliderait toute signature pourtant légitime.
 */

/** Tolérance d'horloge — au-delà, l'événement est considéré comme rejoué. */
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60

export type WebhookHeaders = {
  id: string | null
  timestamp: string | null
  signature: string | null
}

export function readWebhookHeaders(headers: Headers): WebhookHeaders {
  return {
    id:        headers.get('webhook-id')        ?? headers.get('svix-id'),
    timestamp: headers.get('webhook-timestamp') ?? headers.get('svix-timestamp'),
    signature: headers.get('webhook-signature') ?? headers.get('svix-signature'),
  }
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'missing_headers' | 'stale_timestamp' | 'bad_signature' }

export function verifyRecallSignature(args: {
  secret: string | undefined
  headers: WebhookHeaders
  rawBody: string
  now?: Date
}): VerifyResult {
  const { secret, headers, rawBody, now = new Date() } = args

  // Pas de secret configuré ⇒ refus. Accepter un webhook non vérifié
  // laisserait n'importe qui piloter l'état d'une réunion et déclencher des
  // appels facturés au modèle.
  if (!secret) return { ok: false, reason: 'not_configured' }
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return { ok: false, reason: 'missing_headers' }
  }

  const timestamp = Number(headers.timestamp)
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'missing_headers' }
  const skew = Math.abs(Math.floor(now.getTime() / 1000) - timestamp)
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) return { ok: false, reason: 'stale_timestamp' }

  const base64Secret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const key = Buffer.from(base64Secret, 'base64')
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest()

  for (const versioned of headers.signature.split(' ')) {
    const [version, signature] = versioned.split(',')
    if (version !== 'v1' || !signature) continue
    let provided: Buffer
    try {
      provided = Buffer.from(signature, 'base64')
    } catch {
      continue
    }
    if (provided.length !== expected.length) continue
    if (crypto.timingSafeEqual(provided, expected)) return { ok: true }
  }

  return { ok: false, reason: 'bad_signature' }
}

// ── Validation du corps ───────────────────────────────────────────────────────

/**
 * Forme commune des webhooks bot / recording / transcript :
 * `{ event, data: { data: { code, sub_code, updated_at }, bot, recording, transcript } }`.
 * Les champs non utilisés sont tolérés (`passthrough` implicite de Zod objets).
 */
const entityRef = z.object({
  id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
})

export const recallWebhookSchema = z.object({
  event: z.string().min(1),
  data: z.object({
    data: z
      .object({
        code: z.string().optional(),
        sub_code: z.string().nullish(),
        updated_at: z.string().nullish(),
      })
      .optional(),
    bot: entityRef.optional(),
    recording: entityRef.optional(),
    transcript: entityRef.optional(),
  }),
})

export type RecallWebhookPayload = z.infer<typeof recallWebhookSchema>

/** Événements de cycle de vie que SOPAT traite. Les autres sont ignorés (200). */
export const HANDLED_EVENTS = [
  'bot.joining_call',
  'bot.in_waiting_room',
  'bot.in_call_not_recording',
  'bot.recording_permission_denied',
  'bot.in_call_recording',
  'bot.call_ended',
  'bot.done',
  'bot.fatal',
  'recording.done',
  'transcript.done',
  'transcript.failed',
] as const

export type HandledEvent = (typeof HANDLED_EVENTS)[number]

export function isHandledEvent(event: string): event is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(event)
}
