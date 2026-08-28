'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { meetingMinutes, meetingActionItems, users } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { authorizeMeetingAccess, canMutateMeeting } from '@/lib/meetings/authorization'
import { createAiMeetingSchema } from '@/lib/meetings/validation'
import { cancelAiMeeting, createAiMeeting, runAnalysis, scheduleBot } from '@/lib/meetings/service'
import { sendMeetingReportEmail } from '@/lib/meetings/report-email'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import type { LegacySession } from '@/lib/auth'
import { isRecallConfigured } from '@/lib/recall/client'
import { isOpenAiConfigured } from '@/lib/ai/openai'

/**
 * Server actions du module réunions IA.
 *
 * Le module PV existant pilote déjà ses mutations par server actions
 * (src/lib/actions/meetings.ts) ; on suit la même convention plutôt que
 * d'ajouter un second chemin d'écriture par routes API, qui obligerait à
 * maintenir deux fois les mêmes contrôles d'autorisation. Le seul point
 * d'entrée HTTP du module est le webhook, qui vient d'un tiers et ne peut pas
 * être une server action.
 *
 * Chaque action refait la vérification de session et de droits côté serveur :
 * l'identifiant reçu du navigateur ne désigne qu'une ligne à charger, jamais
 * une autorisation.
 */

type ActionResult<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string; code?: string }

function toActor(session: LegacySession): AuditActor {
  return {
    userId: session.user.userId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  }
}

/** Charge la réunion et vérifie que l'acteur a le droit de la modifier. */
async function loadForMutation(meetingId: string) {
  const authorized = await authorizeMeetingAccess()
  if (!authorized.ok) return { ok: false as const, error: authorized.error }

  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, meetingId), isNull(meetingMinutes.deletedAt)))
    .limit(1)

  if (!meeting) return { ok: false as const, error: 'Réunion introuvable' }
  if (!canMutateMeeting(authorized.session, meeting)) {
    return { ok: false as const, error: 'Accès refusé' }
  }
  return { ok: true as const, meeting, session: authorized.session }
}

function revalidateMeeting(id: string) {
  revalidatePath('/admin/meetings')
  revalidatePath('/admin/meetings/ai')
  revalidatePath(`/admin/meetings/${id}`)
}

// ── Création ──────────────────────────────────────────────────────────────────

export async function createAiMeetingAction(
  input: unknown,
): Promise<ActionResult<{ id: string; reference: string }>> {
  const authorized = await authorizeMeetingAccess()
  if (!authorized.ok) return { success: false, error: authorized.error }

  if (!isRecallConfigured()) {
    return {
      success: false,
      error: "L'assistant de réunion n'est pas configuré (RECALL_API_KEY manquante).",
      code: 'recall_not_configured',
    }
  }

  const parsed = createAiMeetingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' }
  }

  const result = await createAiMeeting(parsed.data, toActor(authorized.session))
  if (!result.success) return result

  revalidateMeeting(result.id)
  return { success: true, id: result.id, reference: result.reference }
}

// ── Annulation ────────────────────────────────────────────────────────────────

export async function cancelAiMeetingAction(meetingId: string): Promise<ActionResult> {
  const loaded = await loadForMutation(meetingId)
  if (!loaded.ok) return { success: false, error: loaded.error }

  const result = await cancelAiMeeting(meetingId, toActor(loaded.session))
  if (!result.success) return result

  revalidateMeeting(meetingId)
  return { success: true }
}

// ── Relance du bot ────────────────────────────────────────────────────────────

/** Recrée le bot après un échec de création. N'en crée jamais un second. */
export async function retryBotAction(meetingId: string): Promise<ActionResult> {
  const loaded = await loadForMutation(meetingId)
  if (!loaded.ok) return { success: false, error: loaded.error }

  const { meeting } = loaded
  if (!meeting.meetingUrl || !meeting.scheduledAt) {
    return { success: false, error: 'Réunion sans URL ni date planifiée.' }
  }
  if (meeting.recallBotId) {
    return { success: false, error: 'Un bot est déjà associé à cette réunion.' }
  }

  const result = await scheduleBot(
    meetingId,
    meeting.meetingUrl,
    meeting.scheduledAt,
    toActor(loaded.session),
  )
  if (!result.success) return result

  revalidateMeeting(meetingId)
  return { success: true }
}

// ── Analyse ───────────────────────────────────────────────────────────────────

/**
 * Relance ou régénère l'analyse À PARTIR DE LA TRANSCRIPTION STOCKÉE.
 * Ne recrée jamais de bot et ne redemande jamais la transcription à Recall.
 */
export async function retryAnalysisAction(
  meetingId: string,
  options?: { regenerate?: boolean },
): Promise<ActionResult<{ createdActions: number }>> {
  const loaded = await loadForMutation(meetingId)
  if (!loaded.ok) return { success: false, error: loaded.error }

  if (!isOpenAiConfigured()) {
    return {
      success: false,
      error: "L'analyse IA n'est pas configurée (OPENAI_API_KEY / OPENAI_MODEL).",
      code: 'openai_not_configured',
    }
  }

  const result = await runAnalysis(meetingId, toActor(loaded.session), {
    regenerate: options?.regenerate ?? false,
  })
  if (!result.success) return result

  revalidateMeeting(meetingId)
  return { success: true, createdActions: result.createdActions }
}

// ── E-mail ────────────────────────────────────────────────────────────────────

/** Renvoie le compte rendu déjà stocké — aucun appel OpenAI. */
export async function retryReportEmailAction(meetingId: string): Promise<ActionResult> {
  const loaded = await loadForMutation(meetingId)
  if (!loaded.ok) return { success: false, error: loaded.error }

  const result = await sendMeetingReportEmail(meetingId, toActor(loaded.session), { force: true })
  if (!result.success) return { success: false, error: result.error, code: result.code }

  revalidateMeeting(meetingId)
  return { success: true }
}

// ── Affectation manuelle d'une action ─────────────────────────────────────────

/**
 * L'IA laisse volontairement non affectées les actions dont le responsable est
 * ambigu. C'est ici qu'un humain tranche — et la décision est tracée.
 */
export async function assignActionItemAction(
  meetingId: string,
  actionId: string,
  assigneeId: string | null,
): Promise<ActionResult> {
  const loaded = await loadForMutation(meetingId)
  if (!loaded.ok) return { success: false, error: loaded.error }

  const [action] = await db
    .select()
    .from(meetingActionItems)
    .where(and(eq(meetingActionItems.id, actionId), eq(meetingActionItems.meetingId, meetingId)))
    .limit(1)
  if (!action) return { success: false, error: 'Action introuvable' }

  if (assigneeId) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assigneeId), eq(users.isActive, true), isNull(users.deletedAt)))
      .limit(1)
    if (!user) return { success: false, error: 'Utilisateur introuvable' }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(meetingActionItems)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(meetingActionItems.id, actionId))

    await recordAudit(tx, {
      entityType: 'meeting_action_item',
      entityId: actionId,
      action: 'updated',
      actor: toActor(loaded.session),
      previousState: { assigneeId: action.assigneeId },
      newState: { assigneeId },
    })
  })

  revalidateMeeting(meetingId)
  return { success: true }
}
