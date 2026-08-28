import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meetingWebhookEvents } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  readWebhookHeaders,
  recallWebhookSchema,
  verifyRecallSignature,
  isHandledEvent,
} from '@/lib/recall/webhooks'
import { getMeetingByBotId } from '@/lib/db/ai-meetings'
import { applyStatus, fetchAndStoreTranscript, runAnalysis } from '@/lib/meetings/service'
import { sendMeetingReportEmail } from '@/lib/meetings/report-email'
import { statusForEvent } from '@/lib/meetings/status'
import { SYSTEM_ACTOR } from '@/lib/meetings/system-actor'
import { logMeeting } from '@/lib/meetings/logging'

/**
 * Webhook Recall.ai — point d'entrée unique du cycle de vie des réunions IA.
 *
 * Trois principes tiennent ce fichier :
 *
 * 1. RIEN n'est écrit avant la vérification de signature. L'endpoint est
 *    forcément public ; sans cette barrière, n'importe qui pourrait piloter
 *    l'état d'une réunion et déclencher des analyses OpenAI facturées.
 * 2. L'idempotence est garantie par la base, pas par du code : l'insertion de
 *    l'événement porte un index unique (provider, event_id). Une seconde
 *    livraison n'insère rien et s'arrête là. Recall réessaie pendant 24 h.
 * 3. On répond 2xx dès que la signature est valide, même si le traitement
 *    échoue : un 500 provoquerait des tentatives en boucle sur un événement
 *    que rejouer ne réparera pas. L'échec est enregistré sur la réunion.
 */

// Node : la vérification HMAC utilise node:crypto et le corps brut.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Le corps BRUT est signé : re-sérialiser un objet JSON invaliderait une
  // signature pourtant légitime.
  const rawBody = await req.text()
  const headers = readWebhookHeaders(req.headers)

  const verification = verifyRecallSignature({
    secret: process.env.RECALL_WEBHOOK_SECRET,
    headers,
    rawBody,
  })

  if (!verification.ok) {
    logMeeting.warn('webhook_rejected', { errorCode: verification.reason })
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Charge utile invalide' }, { status: 400 })
  }

  const parsed = recallWebhookSchema.safeParse(payload)
  if (!parsed.success) {
    logMeeting.warn('webhook_invalid_payload', { errorCode: 'schema_mismatch' })
    return NextResponse.json({ error: 'Charge utile invalide' }, { status: 400 })
  }

  const event = parsed.data
  const botId = event.data.bot?.id ?? null
  const eventId = headers.id as string

  // ── Verrou d'idempotence ────────────────────────────────────────────────────
  const inserted = await db
    .insert(meetingWebhookEvents)
    .values({
      provider: 'recall',
      eventId,
      eventType: event.event,
      botId,
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: [meetingWebhookEvents.provider, meetingWebhookEvents.eventId],
    })
    .returning({ id: meetingWebhookEvents.id })

  if (inserted.length === 0) {
    logMeeting.info('webhook_duplicate', { eventType: event.event })
    return NextResponse.json({ status: 'duplicate' })
  }

  const eventRowId = inserted[0].id

  if (!isHandledEvent(event.event)) {
    await closeEvent(eventRowId, 'ignored')
    return NextResponse.json({ status: 'ignored' })
  }

  if (!botId) {
    await closeEvent(eventRowId, 'ignored', 'missing_bot_id')
    return NextResponse.json({ status: 'ignored' })
  }

  // La réunion est résolue côté serveur par l'identifiant de bot : rien de ce
  // que porte la charge utile ne désigne directement une ligne SOPAT.
  const meeting = await getMeetingByBotId(botId)
  if (!meeting) {
    // Bot inconnu (autre espace de travail, réunion supprimée) : on acquitte,
    // sinon Recall réessaierait 24 h durant un événement sans destinataire.
    logMeeting.warn('webhook_unknown_bot', { eventType: event.event, recallBotId: botId })
    await closeEvent(eventRowId, 'ignored', 'unknown_bot')
    return NextResponse.json({ status: 'unknown_meeting' })
  }

  await db
    .update(meetingWebhookEvents)
    .set({ meetingId: meeting.id })
    .where(eq(meetingWebhookEvents.id, eventRowId))

  try {
    await handleEvent(event.event, meeting.id, event)
    await closeEvent(eventRowId, 'processed')
  } catch (err) {
    logMeeting.error('webhook_processing_failed', {
      meetingId: meeting.id,
      eventType: event.event,
    }, err)
    await closeEvent(eventRowId, 'failed', err instanceof Error ? err.message.slice(0, 300) : 'unknown')
    // 200 volontaire : voir principe 3 en tête de fichier.
  }

  return NextResponse.json({ status: 'ok' })
}

async function closeEvent(id: string, status: string, error?: string): Promise<void> {
  await db
    .update(meetingWebhookEvents)
    .set({ status, error: error ?? null, processedAt: new Date() })
    .where(eq(meetingWebhookEvents.id, id))
}

async function handleEvent(
  eventName: string,
  meetingId: string,
  event: { data: { data?: { updated_at?: string | null; sub_code?: string | null }; recording?: { id?: string }; transcript?: { id?: string } } },
): Promise<void> {
  const occurredAt = event.data.data?.updated_at ? new Date(event.data.data.updated_at) : new Date()

  const nextStatus = statusForEvent(eventName)

  switch (eventName) {
    case 'bot.in_call_recording':
      await applyStatus(meetingId, 'in_meeting', SYSTEM_ACTOR, { startedAt: occurredAt })
      return

    case 'bot.call_ended':
      await applyStatus(meetingId, 'processing', SYSTEM_ACTOR, { endedAt: occurredAt })
      await setDuration(meetingId)
      return

    case 'recording.done':
      await applyStatus(meetingId, 'processing', SYSTEM_ACTOR, {
        ...(event.data.recording?.id ? { recallRecordingId: event.data.recording.id } : {}),
      })
      return

    case 'transcript.done': {
      const transcriptId = event.data.transcript?.id
      if (!transcriptId) throw new Error('transcript id manquant')

      await applyStatus(meetingId, 'processing', SYSTEM_ACTOR, {
        recallTranscriptId: transcriptId,
      })

      // Chaque étape est idempotente indépendamment : transcription déjà
      // stockée ⇒ pas de nouveau téléchargement ; compte rendu déjà produit ⇒
      // pas de nouvel appel OpenAI ; e-mail déjà envoyé ⇒ pas de doublon.
      const stored = await fetchAndStoreTranscript(meetingId, transcriptId, SYSTEM_ACTOR)
      if (!stored.success) return

      const analysis = await runAnalysis(meetingId, SYSTEM_ACTOR)
      if (!analysis.success) return

      // Un échec d'envoi ne remet pas la réunion en échec.
      await sendMeetingReportEmail(meetingId, SYSTEM_ACTOR)
      return
    }

    default:
      if (nextStatus) {
        await applyStatus(meetingId, nextStatus, SYSTEM_ACTOR, {
          ...(nextStatus === 'failed'
            ? { aiError: event.data.data?.sub_code ?? eventName }
            : {}),
        })
      }
  }
}

/** Durée réelle, calculée depuis les horodatages déjà enregistrés. */
async function setDuration(meetingId: string): Promise<void> {
  const { meetingMinutes } = await import('@/db/schema')
  const [row] = await db
    .select({ startedAt: meetingMinutes.startedAt, endedAt: meetingMinutes.endedAt })
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, meetingId)))
    .limit(1)

  if (!row?.startedAt || !row?.endedAt) return
  const seconds = Math.max(0, Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 1000))
  await db.update(meetingMinutes).set({ durationSeconds: seconds }).where(eq(meetingMinutes.id, meetingId))
}
