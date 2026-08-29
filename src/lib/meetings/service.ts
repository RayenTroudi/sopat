import 'server-only'
import { db } from '@/db'
import {
  meetingMinutes,
  meetingActionItems,
  meetingAiReports,
  meetingTranscripts,
} from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { getNextMeetingReference } from '@/lib/db/meetings'
import { getMatchableUsers, getTranscriptByMeetingId } from '@/lib/db/ai-meetings'
import { analyzeTranscript, type MeetingAnalysis } from '@/lib/ai/meeting-analysis'
import { matchUser } from './user-matching'
import { canTransition, isTerminal, type MeetingAiStatus } from './status'
import { BOT_DISPLAY_NAME, createBot, deleteScheduledBot, leaveCall } from '@/lib/recall/bots'
import { canSchedule } from './schedule-window'
import { actionDedupeKey } from './dedupe'
import { fetchTranscriptContent, type FlattenedTranscript } from '@/lib/recall/transcripts'
import { RecallApiError } from '@/lib/recall/client'
import type { CreateAiMeetingInput } from './validation'
import type { MeetingPlatform } from '@/lib/recall/types'
import { logMeeting } from './logging'

/**
 * Service métier de l'assistant de réunion IA.
 *
 * Toutes les écritures passent par ici : les routes API et les server actions
 * n'écrivent jamais directement. Chaque étape est reprenable séparément —
 * relancer l'analyse ne recrée pas de bot, renvoyer l'e-mail ne rappelle pas
 * le modèle — et chaque étape est idempotente, parce qu'un webhook Recall peut
 * être rejoué pendant 24 h.
 */

export type ServiceResult<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string; code?: string }

function failure(error: string, code?: string): { success: false; error: string; code?: string } {
  return { success: false, error, code }
}

// ── Création ──────────────────────────────────────────────────────────────────

/**
 * Crée le PV puis, si demandé, le bot Recall.
 *
 * L'insertion et sa trace d'audit sont dans une transaction : un enregistrement
 * qualité ne doit jamais exister sans sa ligne de journal. La création du bot
 * est faite APRÈS la transaction, volontairement : c'est un appel réseau à un
 * tiers, et le tenir dans une transaction ouverte immobiliserait une connexion
 * Postgres le temps d'un aller-retour HTTP. Si elle échoue, la réunion existe
 * en statut `failed` avec son motif, et l'utilisateur peut relancer — plutôt
 * qu'une réunion perdue.
 */
export async function createAiMeeting(
  input: CreateAiMeetingInput,
  actor: AuditActor,
): Promise<ServiceResult<{ id: string; reference: string }>> {
  const scheduledAt = new Date(input.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) return failure('Date de réunion invalide')

  const reference = await getNextMeetingReference()
  const meetingDate = scheduledAt.toISOString().slice(0, 10)

  let meetingId: string
  try {
    meetingId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(meetingMinutes)
        .values({
          reference,
          meetingDate,
          meetingType: input.title,
          participants: input.participants ?? null,
          agenda: input.description ?? null,
          createdBy: actor.userId,
          source: 'ai_assistant',
          meetingUrl: input.meetingUrl,
          platform: input.platform as MeetingPlatform,
          scheduledAt,
          aiStatus: 'scheduled',
          autoJoin: input.autoJoin,
          sendEmailReport: input.sendEmailReport,
          botName: BOT_DISPLAY_NAME,
        })
        .returning({ id: meetingMinutes.id })

      await recordAudit(tx, {
        entityType: 'meeting_minute',
        entityId: row.id,
        action: 'created',
        actor,
        newState: {
          reference,
          source: 'ai_assistant',
          platform: input.platform,
          scheduledAt: scheduledAt.toISOString(),
          autoJoin: input.autoJoin,
          sendEmailReport: input.sendEmailReport,
        },
      })

      return row.id
    })
  } catch (err) {
    logMeeting.error('create_meeting_failed', { stage: 'insert' }, err)
    return failure('Création de la réunion impossible.', 'db_error')
  }

  if (input.autoJoin) {
    const botResult = await scheduleBot(meetingId, input.meetingUrl, scheduledAt, actor)
    if (!botResult.success) {
      // La réunion reste créée et consultable : l'utilisateur peut corriger et
      // relancer plutôt que de tout ressaisir.
      return { success: true, id: meetingId, reference }
    }
  }

  return { success: true, id: meetingId, reference }
}

/**
 * Crée le bot Recall pour une réunion existante.
 *
 * Idempotent : si un `recallBotId` est déjà enregistré, on ne recrée rien. Sans
 * ce garde-fou, un double clic ou une relance ferait entrer deux bots dans la
 * même réunion — et doublerait la facturation.
 */
export async function scheduleBot(
  meetingId: string,
  meetingUrl: string,
  scheduledAt: Date,
  actor: AuditActor,
): Promise<ServiceResult<{ botId: string }>> {
  const [existing] = await db
    .select({ recallBotId: meetingMinutes.recallBotId, aiStatus: meetingMinutes.aiStatus })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.id, meetingId))
    .limit(1)

  if (!existing) return failure('Réunion introuvable')
  if (existing.recallBotId) {
    return { success: true, botId: existing.recallBotId }
  }

  try {
    const bot = await createBot({
      meetingUrl,
      botName: BOT_DISPLAY_NAME,
      // Recall garantit la ponctualité à partir de 10 minutes d'avance. En
      // deçà, on ne programme pas : le bot est créé et rejoint tout de suite.
      joinAt: canSchedule(scheduledAt) ? scheduledAt.toISOString() : undefined,
      metadata: { sopat_meeting_id: meetingId },
    })

    await db.transaction(async (tx) => {
      await tx
        .update(meetingMinutes)
        .set({ recallBotId: bot.id, aiStatus: 'bot_created', aiError: null, updatedAt: new Date() })
        .where(eq(meetingMinutes.id, meetingId))
      await recordAudit(tx, {
        entityType: 'meeting_minute',
        entityId: meetingId,
        action: 'status_changed',
        actor,
        previousState: { aiStatus: existing.aiStatus },
        newState: { aiStatus: 'bot_created', recallBotId: bot.id },
      })
    })

    logMeeting.info('bot_created', { meetingId, recallBotId: bot.id })
    return { success: true, botId: bot.id }
  } catch (err) {
    const code = err instanceof RecallApiError ? err.code : 'bot_creation_failed'
    await markFailed(meetingId, code, actor)
    logMeeting.error('bot_creation_failed', { meetingId, errorCode: code }, err)
    return failure("Le bot n'a pas pu être créé.", code)
  }
}

// ── Annulation ────────────────────────────────────────────────────────────────

export async function cancelAiMeeting(
  meetingId: string,
  actor: AuditActor,
): Promise<ServiceResult> {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, meetingId), isNull(meetingMinutes.deletedAt)))
    .limit(1)
  if (!meeting) return failure('Réunion introuvable')
  if (meeting.aiStatus === 'completed') return failure('Réunion déjà terminée.')
  if (meeting.aiStatus === 'cancelled') return { success: true }

  // Deux endpoints distincts chez Recall : un bot programmé se supprime, un bot
  // déjà en appel doit quitter. On choisit selon l'état connu, et l'échec de
  // l'un n'empêche pas l'annulation côté SOPAT — sinon une réunion resterait
  // marquée active alors que plus personne ne l'attend.
  if (meeting.recallBotId) {
    try {
      if (meeting.aiStatus === 'in_meeting' || meeting.aiStatus === 'joining') {
        await leaveCall(meeting.recallBotId)
      } else {
        await deleteScheduledBot(meeting.recallBotId)
      }
    } catch (err) {
      logMeeting.error('bot_cancel_failed', { meetingId, recallBotId: meeting.recallBotId }, err)
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(meetingMinutes)
      .set({ aiStatus: 'cancelled', updatedAt: new Date() })
      .where(eq(meetingMinutes.id, meetingId))
    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: meetingId,
      action: 'status_changed',
      actor,
      previousState: { aiStatus: meeting.aiStatus },
      newState: { aiStatus: 'cancelled' },
    })
  })

  logMeeting.info('meeting_cancelled', { meetingId })
  return { success: true }
}

// ── Statut ────────────────────────────────────────────────────────────────────

/**
 * Applique une transition si elle fait progresser la réunion.
 * Renvoie false quand l'événement est ignoré (arrivé dans le désordre).
 */
export async function applyStatus(
  meetingId: string,
  next: MeetingAiStatus,
  actor: AuditActor,
  extra?: Partial<{
    startedAt: Date
    endedAt: Date
    durationSeconds: number
    recallRecordingId: string
    recallTranscriptId: string
    aiError: string | null
  }>,
): Promise<boolean> {
  const [meeting] = await db
    .select({ aiStatus: meetingMinutes.aiStatus })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.id, meetingId))
    .limit(1)
  if (!meeting) return false

  const allowed = canTransition(meeting.aiStatus, next)
  // Les identifiants Recall sont enregistrés même quand la transition est
  // refusée : ils restent utiles pour reprendre le traitement plus tard.
  if (!allowed && !extra) return false

  await db.transaction(async (tx) => {
    await tx
      .update(meetingMinutes)
      .set({
        ...(allowed ? { aiStatus: next } : {}),
        ...(extra ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, meetingId))

    if (allowed) {
      await recordAudit(tx, {
        entityType: 'meeting_minute',
        entityId: meetingId,
        action: 'status_changed',
        actor,
        previousState: { aiStatus: meeting.aiStatus },
        newState: { aiStatus: next },
      })
    }
  })

  return allowed
}

/**
 * Bascule la réunion en échec, SAUF si elle est déjà dans un état terminal.
 *
 * Le garde-fou n'est pas théorique : une réunion annulée par un utilisateur a
 * malgré tout été traitée à la réception d'un `transcript.done` tardif, et
 * s'est retrouvée affichée « Échec » alors que la décision enregistrée était
 * « Annulée ». Pour un enregistrement qualité, écraser une décision humaine par
 * un statut technique est une perte de traçabilité, pas un détail d'affichage.
 */
async function markFailed(meetingId: string, code: string, actor: AuditActor): Promise<void> {
  const [current] = await db
    .select({ aiStatus: meetingMinutes.aiStatus })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.id, meetingId))
    .limit(1)

  if (isTerminal(current?.aiStatus)) {
    logMeeting.warn('failure_ignored_terminal_state', { meetingId, errorCode: code })
    return
  }

  await db.transaction(async (tx) => {
    await tx
      .update(meetingMinutes)
      .set({ aiStatus: 'failed', aiError: code, updatedAt: new Date() })
      .where(eq(meetingMinutes.id, meetingId))
    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: meetingId,
      action: 'failed',
      actor,
      newState: { aiStatus: 'failed', errorCode: code },
    })
  })
}

// ── Transcription ─────────────────────────────────────────────────────────────

/**
 * Enregistre la transcription. Idempotent : `meeting_id` est unique, une
 * seconde livraison du même événement ne réécrit rien et ne re-télécharge rien.
 */
export async function storeTranscript(
  meetingId: string,
  provider: string,
  content: FlattenedTranscript,
  actor: AuditActor,
): Promise<ServiceResult<{ alreadyStored: boolean }>> {
  const existing = await getTranscriptByMeetingId(meetingId)
  if (existing) return { success: true, alreadyStored: true }

  await db.transaction(async (tx) => {
    await tx.insert(meetingTranscripts).values({
      meetingId,
      provider,
      utterances: content.utterances,
      plainText: content.plainText,
      wordCount: content.wordCount,
    })
    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: meetingId,
      action: 'updated',
      actor,
      newState: { transcript: 'received', wordCount: content.wordCount, provider },
    })
  })

  logMeeting.info('transcript_stored', { meetingId, wordCount: content.wordCount })
  return { success: true, alreadyStored: false }
}

/** Récupère la transcription chez Recall puis la stocke. */
export async function fetchAndStoreTranscript(
  meetingId: string,
  transcriptId: string,
  actor: AuditActor,
): Promise<ServiceResult<{ alreadyStored: boolean }>> {
  const existing = await getTranscriptByMeetingId(meetingId)
  if (existing) return { success: true, alreadyStored: true }

  try {
    const content = await fetchTranscriptContent(transcriptId)
    return await storeTranscript(meetingId, 'recallai', content, actor)
  } catch (err) {
    const code = err instanceof RecallApiError ? err.code : 'transcript_fetch_failed'
    await markFailed(meetingId, code, actor)
    logMeeting.error('transcript_fetch_failed', { meetingId, errorCode: code }, err)
    return failure('Transcription indisponible.', code)
  }
}

// ── Analyse ───────────────────────────────────────────────────────────────────

/**
 * Analyse la transcription STOCKÉE et enregistre le compte rendu.
 *
 * Le modèle n'est appelé qu'ici, et seulement sur trois chemins : première
 * réception d'une transcription, relance explicite, régénération explicite.
 * L'affichage de la fiche réunion ne passe jamais par cette fonction.
 */
export async function runAnalysis(
  meetingId: string,
  actor: AuditActor,
  options?: { regenerate?: boolean },
): Promise<ServiceResult<{ reportId: string; createdActions: number }>> {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, meetingId), isNull(meetingMinutes.deletedAt)))
    .limit(1)
  if (!meeting) return failure('Réunion introuvable')

  const transcript = await getTranscriptByMeetingId(meetingId)
  if (!transcript) return failure('Aucune transcription disponible pour cette réunion.', 'no_transcript')

  if (!options?.regenerate) {
    const [existingReport] = await db
      .select({ id: meetingAiReports.id })
      .from(meetingAiReports)
      .where(eq(meetingAiReports.meetingId, meetingId))
      .limit(1)
    // Rejeu d'un webhook : le compte rendu existe déjà, on ne repaye pas une
    // analyse et on ne recrée pas d'actions.
    if (existingReport) {
      return { success: true, reportId: existingReport.id, createdActions: 0 }
    }
  }

  await applyStatus(meetingId, 'processing', actor)

  let analysis: MeetingAnalysis
  let model: string
  let promptVersion: string
  let inputTokens: number | null
  let outputTokens: number | null

  try {
    const result = await analyzeTranscript(transcript.plainText, {
      title: meeting.meetingType ?? meeting.reference,
      meetingDate: meeting.meetingDate,
      participants: meeting.participants,
      agenda: meeting.agenda,
    })
    analysis = result.analysis
    model = result.model
    promptVersion = result.promptVersion
    inputTokens = result.inputTokens
    outputTokens = result.outputTokens
  } catch (err) {
    const code =
      err instanceof Error && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
        ? (err as { code: string }).code
        : err instanceof Error && err.name === 'MeetingAnalysisValidationError'
          ? 'ai_invalid_response'
          : 'ai_failed'
    await markFailed(meetingId, code, actor)
    logMeeting.error('analysis_failed', { meetingId, errorCode: code }, err)
    return failure("L'analyse IA a échoué.", code)
  }

  const matchable = await getMatchableUsers()

  const reportId = await db.transaction(async (tx) => {
    const [report] = await tx
      .insert(meetingAiReports)
      .values({
        meetingId,
        model,
        promptVersion,
        summary: analysis.summary,
        topics: analysis.topics,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        risks: analysis.risks,
        questions: analysis.questions,
        followUps: analysis.followUps,
        qmsFindings: analysis.qmsFindings,
        inputTokens,
        outputTokens,
        generatedBy: actor.userId,
      })
      .returning({ id: meetingAiReports.id })

    // Le PV lui-même reçoit le résumé et les décisions : le compte rendu ISO
    // reste lisible sans dépendre de l'écran IA.
    await tx
      .update(meetingMinutes)
      .set({
        discussions: analysis.summary,
        decisions: analysis.decisions.map((d) => `• ${d.decision}`).join('\n') || null,
        aiStatus: 'completed',
        aiError: null,
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, meetingId))

    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: meetingId,
      action: 'analyzed',
      actor,
      newState: {
        reportId: report.id,
        model,
        promptVersion,
        actionItems: analysis.actionItems.length,
        qmsFindings: analysis.qmsFindings.length,
      },
    })

    return report.id
  })

  const createdActions = await persistActionItems(meetingId, analysis, matchable, actor)

  logMeeting.info('analysis_completed', { meetingId, reportId, createdActions, model })
  return { success: true, reportId, createdActions }
}

/**
 * Ré-export : l'empreinte d'idempotence vit dans ./dedupe.ts, sans dépendance
 * serveur, pour rester testable hors du bundler Next (même raison que la
 * séparation audit.ts / audit-record.ts).
 */
export { actionDedupeKey }

async function persistActionItems(
  meetingId: string,
  analysis: MeetingAnalysis,
  matchable: { id: string; name: string; email: string }[],
  actor: AuditActor,
): Promise<number> {
  let created = 0

  for (const item of analysis.actionItems) {
    const dedupeKey = actionDedupeKey(item.title, item.responsiblePerson)

    // Rapprochement conservateur : ambigu ou inconnu ⇒ non affecté.
    let assigneeId: string | null = null
    if (item.responsiblePerson) {
      const match = matchUser(item.responsiblePerson, matchable)
      if (match.status === 'matched') assigneeId = match.userId
    }

    const description = item.description
      ? `${item.title} — ${item.description}`
      : item.title

    try {
      const inserted = await db.transaction(async (tx) => {
        const rows = await tx
          .insert(meetingActionItems)
          .values({
            meetingId,
            description,
            // Le nom prononcé est conservé même quand il n'a pas pu être
            // rapproché : c'est la seule trace de ce qui a été dit.
            responsible: item.responsiblePerson,
            assigneeId,
            source: 'ai',
            priority: item.priority
              ? (item.priority.toLowerCase() as 'low' | 'medium' | 'high')
              : null,
            dedupeKey,
            createdBy: actor.userId,
          })
          // Idempotence : un rejeu ne crée pas de seconde action.
          .onConflictDoNothing({
            target: [meetingActionItems.meetingId, meetingActionItems.dedupeKey],
          })
          .returning({ id: meetingActionItems.id })

        if (rows.length === 0) return null

        await recordAudit(tx, {
          entityType: 'meeting_action_item',
          entityId: rows[0].id,
          action: 'created',
          actor,
          newState: {
            meetingId,
            source: 'ai',
            title: item.title,
            responsiblePerson: item.responsiblePerson,
            assigneeId,
            deadline: item.deadline,
            priority: item.priority,
          },
        })
        return rows[0].id
      })

      if (inserted) created += 1
    } catch (err) {
      // Une action qui échoue ne doit pas faire tomber le compte rendu déjà
      // enregistré : on journalise et on continue.
      logMeeting.error('action_item_failed', { meetingId }, err)
    }
  }

  return created
}
