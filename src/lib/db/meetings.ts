import { db } from '@/db'
import {
  meetingMinutes,
  meetingParticipants,
  meetingAgendaItems,
  meetingActionItems,
  projects,
  users,
} from '@/db/schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { diffFields } from '@/lib/audit-diff'

export type MeetingMinute = typeof meetingMinutes.$inferSelect
export type MeetingParticipant = typeof meetingParticipants.$inferSelect
export type MeetingAgendaItem = typeof meetingAgendaItems.$inferSelect
export type MeetingActionItem = typeof meetingActionItems.$inferSelect

export const MEETING_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  in_progress: 'En rédaction',
  completed: 'Validé',
}

/** Statuts au-delà desquels une modification est une révision, pas une saisie. */
const LOCKED_STATUSES = new Set(['completed'])

export async function getMeetings(filters?: { type?: string }) {
  return db
    .select({
      meeting: meetingMinutes,
      creatorName: users.name,
      projectName: projects.name,
    })
    .from(meetingMinutes)
    .leftJoin(users, eq(meetingMinutes.createdBy, users.id))
    .leftJoin(projects, eq(meetingMinutes.projectId, projects.id))
    .where(
      and(
        isNull(meetingMinutes.deletedAt),
        filters?.type ? eq(meetingMinutes.meetingType, filters.type) : undefined,
      )
    )
    .orderBy(desc(meetingMinutes.meetingDate))
}

/**
 * Un PV et ses trois relations, tels que le formulaire d'édition doit les
 * afficher.
 *
 * Les lignes remontent dans l'ordre du formulaire papier : `sortOrder` d'abord,
 * puis la date de création, pour que deux lignes ajoutées à la suite ne
 * changent pas de place d'un affichage à l'autre.
 */
export async function getMeetingById(id: string) {
  const [meeting] = await db
    .select()
    .from(meetingMinutes)
    .where(and(eq(meetingMinutes.id, id), isNull(meetingMinutes.deletedAt)))
  if (!meeting) return null

  const [participants, agenda, actions] = await Promise.all([
    db
      .select()
      .from(meetingParticipants)
      .where(and(eq(meetingParticipants.meetingId, id), isNull(meetingParticipants.deletedAt)))
      .orderBy(asc(meetingParticipants.sortOrder), asc(meetingParticipants.createdAt)),
    db
      .select()
      .from(meetingAgendaItems)
      .where(and(eq(meetingAgendaItems.meetingId, id), isNull(meetingAgendaItems.deletedAt)))
      .orderBy(asc(meetingAgendaItems.sortOrder), asc(meetingAgendaItems.createdAt)),
    db
      .select()
      .from(meetingActionItems)
      .where(and(eq(meetingActionItems.meetingId, id), isNull(meetingActionItems.deletedAt)))
      .orderBy(asc(meetingActionItems.sortOrder), asc(meetingActionItems.createdAt)),
  ])

  return { meeting, participants, agenda, actions }
}

export async function getNextMeetingReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(meetingMinutes)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `PV-${year}-${seq}`
}

/**
 * Toutes les lignes du plan d'action, à plat, pour l'export.
 *
 * Le formulaire officiel EST cette grille : sans cette feuille, le classeur
 * exporté ne serait pas le même document que celui que l'auditeur a en main.
 */
export async function getMeetingActionsForExport() {
  return db
    .select({
      meetingReference: meetingMinutes.reference,
      meetingDate:      meetingMinutes.meetingDate,
      description:      meetingActionItems.description,
      responsible:      meetingActionItems.responsible,
      targetDate:       meetingActionItems.targetDate,
      actualDate:       meetingActionItems.actualDate,
      followUp:         meetingActionItems.followUp,
      comments:         meetingActionItems.comments,
      sortOrder:        meetingActionItems.sortOrder,
    })
    .from(meetingActionItems)
    .innerJoin(meetingMinutes, eq(meetingActionItems.meetingId, meetingMinutes.id))
    .where(and(isNull(meetingActionItems.deletedAt), isNull(meetingMinutes.deletedAt)))
    .orderBy(desc(meetingMinutes.meetingDate), asc(meetingActionItems.sortOrder))
}

/** L'ordre du jour de tous les PV, à plat, pour l'export. */
export async function getMeetingAgendaForExport() {
  return db
    .select({
      meetingReference: meetingMinutes.reference,
      meetingDate:      meetingMinutes.meetingDate,
      plannedItem:      meetingAgendaItems.plannedItem,
      discussedPoints:  meetingAgendaItems.discussedPoints,
      sortOrder:        meetingAgendaItems.sortOrder,
    })
    .from(meetingAgendaItems)
    .innerJoin(meetingMinutes, eq(meetingAgendaItems.meetingId, meetingMinutes.id))
    .where(and(isNull(meetingAgendaItems.deletedAt), isNull(meetingMinutes.deletedAt)))
    .orderBy(desc(meetingMinutes.meetingDate), asc(meetingAgendaItems.sortOrder))
}

// ─── FOR-MI-04 : édition contrôlée ───────────────────────────────────────────

export type MeetingParticipantInput = {
  /** Présent = ligne existante à mettre à jour ; absent = nouvelle ligne. */
  id?: string
  fullName: string
  position?: string | null
  userId?: string | null
  present?: boolean
  sortOrder?: number
}

export type MeetingAgendaInput = {
  id?: string
  plannedItem?: string | null
  discussedPoints?: string | null
  sortOrder?: number
}

export type MeetingActionInput = {
  id?: string
  description: string
  responsible?: string | null
  /** « Délai Prévu » du formulaire. */
  targetDate?: string | null
  /** « Délai Réalisé » du formulaire. */
  actualDate?: string | null
  followUp?: string | null
  comments?: string | null
  sortOrder?: number
}

export type UpdateMeetingInput = {
  meetingDate?: string
  meetingType?: string | null
  location?: string | null
  projectId?: string | null
  status?: 'planned' | 'in_progress' | 'completed'
  recommendations?: string | null
  nextMeetingDate?: string | null
  nextMeetingTime?: string | null
  /** Listes complètes : les lignes absentes du tableau sont supprimées (soft). */
  participants?: MeetingParticipantInput[]
  agenda?: MeetingAgendaInput[]
  actions?: MeetingActionInput[]
  /**
   * Motif de la modification. Obligatoire dès que le PV est validé : c'est la
   * condition qui empêche l'écrasement silencieux d'un engagement pris.
   */
  changeReason?: string
}

export type UpdateMeetingResult =
  | { ok: true; revisionNumber: number; revised: boolean }
  | { ok: false; status: 404 | 422; error: string }

function participantValues(incoming: MeetingParticipantInput, index: number) {
  return {
    fullName:  incoming.fullName,
    position:  incoming.position ?? null,
    userId:    incoming.userId || null,
    present:   incoming.present ?? true,
    sortOrder: incoming.sortOrder ?? index,
  }
}

function agendaValues(incoming: MeetingAgendaInput, index: number) {
  return {
    plannedItem:     incoming.plannedItem ?? null,
    discussedPoints: incoming.discussedPoints ?? null,
    sortOrder:       incoming.sortOrder ?? index,
  }
}

function actionValues(incoming: MeetingActionInput, index: number) {
  return {
    description: incoming.description,
    responsible: incoming.responsible ?? null,
    targetDate:  incoming.targetDate || null,
    actualDate:  incoming.actualDate || null,
    followUp:    incoming.followUp ?? null,
    comments:    incoming.comments ?? null,
    sortOrder:   incoming.sortOrder ?? index,
  }
}

/**
 * Les champs d'une action qui engagent quelqu'un : QUI fait QUOI POUR QUAND.
 *
 * Ils sont résumés en clair dans le journal, en plus de l'avant/après brut.
 * Sans cela, « le délai est passé du 12/03 au 30/04 » ne se lirait qu'en
 * comparant deux blobs JSON — or c'est exactement la modification qu'un audit
 * cherche, et celle qu'un responsable a intérêt à ce que personne ne remarque.
 */
const COMMITMENT_FIELDS: Record<string, string> = {
  responsible: 'Responsable',
  targetDate:  'Délai prévu',
  actualDate:  'Délai réalisé',
}

function describeCommitmentChange(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): string | null {
  const parts = Object.entries(COMMITMENT_FIELDS)
    .filter(([key]) => key in next)
    .map(([key, label]) => `${label} : ${previous[key] ?? '—'} → ${next[key] ?? '—'}`)
  return parts.length ? parts.join(' ; ') : null
}

/**
 * Modifie un PV de réunion FOR-MI-04, en-tête et trois relations comprises.
 *
 * Tant que le PV est planifié ou en rédaction, c'est de la saisie : on écrit,
 * on journalise, la révision ne bouge pas. Dès qu'il est validé, la même
 * opération devient la révision d'un enregistrement qualité clos : le motif
 * devient obligatoire, `revisionNumber` passe de 1 à 2, et le journal conserve
 * l'avant/après avec ce motif. Sans cette bascule, repousser un délai après
 * diffusion du PV ne laisserait aucune trace distinguable de la saisie
 * initiale (ISO 9001:2015 §7.5.3.2 c).
 *
 * L'en-tête, les participants, l'ordre du jour et le plan d'action partent
 * dans UNE transaction avec leurs lignes de journal : un PV ne doit pas
 * pouvoir changer à moitié, ni changer sans que la trace parte avec lui.
 *
 * Hors périmètre volontaire : les colonnes de l'assistant de réunion IA
 * (source, aiStatus, recall*, etc.) ne sont jamais écrites ici.
 */
export async function updateMeetingMinute(
  id: string,
  input: UpdateMeetingInput,
  actor: AuditActor,
): Promise<UpdateMeetingResult> {
  const existing = await getMeetingById(id)
  if (!existing) return { ok: false, status: 404, error: 'PV de réunion introuvable' }

  const wasLocked = LOCKED_STATUSES.has(existing.meeting.status)
  const reason = input.changeReason?.trim() ?? ''

  if (wasLocked && reason.length === 0) {
    return {
      ok: false,
      status: 422,
      error:
        'Ce PV est validé : un motif de modification est obligatoire (ISO 9001:2015 §7.5.3.2).',
    }
  }

  const nextRevision = wasLocked ? existing.meeting.revisionNumber + 1 : existing.meeting.revisionNumber

  const header = {
    meetingDate:     input.meetingDate,
    meetingType:     input.meetingType,
    location:        input.location,
    projectId:       input.projectId,
    status:          input.status,
    recommendations: input.recommendations,
    nextMeetingDate: input.nextMeetingDate,
    nextMeetingTime: input.nextMeetingTime,
  }
  const headerDiff = diffFields(
    existing.meeting as unknown as Record<string, unknown>,
    header as Record<string, unknown>,
  )

  await db.transaction(async (tx) => {
    const setClause = Object.fromEntries(
      Object.entries(header).filter(([, v]) => v !== undefined),
    ) as Partial<typeof meetingMinutes.$inferInsert>

    await tx
      .update(meetingMinutes)
      .set({
        ...setClause,
        // La validation porte la signature du pilote : écrite au moment où le
        // statut bascule, jamais réécrite ensuite.
        ...(input.status === 'completed' && existing.meeting.status !== 'completed'
          ? { completedAt: new Date(), completedBy: actor.userId }
          : {}),
        revisionNumber: nextRevision,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, id))

    const auditMeta = { meetingId: id, revisionNumber: nextRevision, changeReason: reason || null }

    // ── Participants ────────────────────────────────────────────────────────
    if (input.participants !== undefined) {
      const byId = new Map(existing.participants.map((p) => [p.id, p]))
      const keptIds = new Set<string>()

      for (const [index, incoming] of input.participants.entries()) {
        const values = participantValues(incoming, index)
        const current = incoming.id ? byId.get(incoming.id) : undefined

        if (current) {
          keptIds.add(current.id)
          const lineDiff = diffFields(current as unknown as Record<string, unknown>, values)
          if (!lineDiff) continue
          await tx
            .update(meetingParticipants)
            .set({ ...values, updatedBy: actor.userId, updatedAt: new Date() })
            .where(eq(meetingParticipants.id, current.id))
          await recordAudit(tx, {
            entityType: 'meeting_participant',
            entityId: current.id,
            action: 'updated',
            actor,
            previousState: lineDiff.previous,
            newState: lineDiff.next,
            metadata: auditMeta,
          })
        } else {
          const [created] = await tx
            .insert(meetingParticipants)
            .values({ meetingId: id, ...values, createdBy: actor.userId })
            .returning({ id: meetingParticipants.id })
          keptIds.add(created.id)
          await recordAudit(tx, {
            entityType: 'meeting_participant',
            entityId: created.id,
            action: 'created',
            actor,
            newState: values,
            metadata: auditMeta,
          })
        }
      }

      for (const stale of existing.participants) {
        if (keptIds.has(stale.id)) continue
        await tx
          .update(meetingParticipants)
          .set({ deletedAt: new Date(), updatedBy: actor.userId, updatedAt: new Date() })
          .where(eq(meetingParticipants.id, stale.id))
        await recordAudit(tx, {
          entityType: 'meeting_participant',
          entityId: stale.id,
          action: 'deleted',
          actor,
          previousState: { fullName: stale.fullName, position: stale.position },
          metadata: auditMeta,
        })
      }
    }

    // ── Ordre du jour ───────────────────────────────────────────────────────
    if (input.agenda !== undefined) {
      const byId = new Map(existing.agenda.map((a) => [a.id, a]))
      const keptIds = new Set<string>()

      for (const [index, incoming] of input.agenda.entries()) {
        const values = agendaValues(incoming, index)
        const current = incoming.id ? byId.get(incoming.id) : undefined

        if (current) {
          keptIds.add(current.id)
          const lineDiff = diffFields(current as unknown as Record<string, unknown>, values)
          if (!lineDiff) continue
          await tx
            .update(meetingAgendaItems)
            .set({ ...values, updatedBy: actor.userId, updatedAt: new Date() })
            .where(eq(meetingAgendaItems.id, current.id))
          await recordAudit(tx, {
            entityType: 'meeting_agenda_item',
            entityId: current.id,
            action: 'updated',
            actor,
            previousState: lineDiff.previous,
            newState: lineDiff.next,
            metadata: auditMeta,
          })
        } else {
          const [created] = await tx
            .insert(meetingAgendaItems)
            .values({ meetingId: id, ...values, createdBy: actor.userId })
            .returning({ id: meetingAgendaItems.id })
          keptIds.add(created.id)
          await recordAudit(tx, {
            entityType: 'meeting_agenda_item',
            entityId: created.id,
            action: 'created',
            actor,
            newState: values,
            metadata: auditMeta,
          })
        }
      }

      for (const stale of existing.agenda) {
        if (keptIds.has(stale.id)) continue
        await tx
          .update(meetingAgendaItems)
          .set({ deletedAt: new Date(), updatedBy: actor.userId, updatedAt: new Date() })
          .where(eq(meetingAgendaItems.id, stale.id))
        await recordAudit(tx, {
          entityType: 'meeting_agenda_item',
          entityId: stale.id,
          action: 'deleted',
          actor,
          previousState: { plannedItem: stale.plannedItem, discussedPoints: stale.discussedPoints },
          metadata: auditMeta,
        })
      }
    }

    // ── Plan d'action ───────────────────────────────────────────────────────
    if (input.actions !== undefined) {
      const byId = new Map(existing.actions.map((a) => [a.id, a]))
      const keptIds = new Set<string>()

      for (const [index, incoming] of input.actions.entries()) {
        const values = actionValues(incoming, index)
        const current = incoming.id ? byId.get(incoming.id) : undefined

        if (current) {
          keptIds.add(current.id)
          const lineDiff = diffFields(current as unknown as Record<string, unknown>, values)
          if (!lineDiff) continue
          await tx
            .update(meetingActionItems)
            .set({ ...values, updatedBy: actor.userId, updatedAt: new Date() })
            .where(eq(meetingActionItems.id, current.id))

          // Un changement de responsable ou de délai est résumé en clair : ce
          // sont les modifications que l'audit cherche en premier.
          const commitment = describeCommitmentChange(lineDiff.previous, lineDiff.next)
          await recordAudit(tx, {
            entityType: 'meeting_action_item',
            entityId: current.id,
            action: 'updated',
            actor,
            previousState: lineDiff.previous,
            newState: lineDiff.next,
            metadata: {
              ...auditMeta,
              ...(commitment ? { commitmentChange: commitment } : {}),
            },
          })
        } else {
          const [created] = await tx
            .insert(meetingActionItems)
            .values({ meetingId: id, ...values, createdBy: actor.userId })
            .returning({ id: meetingActionItems.id })
          keptIds.add(created.id)
          await recordAudit(tx, {
            entityType: 'meeting_action_item',
            entityId: created.id,
            action: 'created',
            actor,
            newState: values,
            metadata: auditMeta,
          })
        }
      }

      for (const stale of existing.actions) {
        if (keptIds.has(stale.id)) continue
        await tx
          .update(meetingActionItems)
          .set({ deletedAt: new Date(), updatedBy: actor.userId, updatedAt: new Date() })
          .where(eq(meetingActionItems.id, stale.id))
        await recordAudit(tx, {
          entityType: 'meeting_action_item',
          entityId: stale.id,
          action: 'deleted',
          actor,
          previousState: {
            description: stale.description,
            responsible: stale.responsible,
            targetDate: stale.targetDate,
          },
          metadata: auditMeta,
        })
      }
    }

    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: id,
      action: wasLocked ? 'revised' : 'updated',
      actor,
      previousState: { ...(headerDiff?.previous ?? {}), revisionNumber: existing.meeting.revisionNumber },
      newState:      { ...(headerDiff?.next ?? {}),     revisionNumber: nextRevision },
      metadata: {
        reference: existing.meeting.reference,
        changeReason: reason || null,
        participantCount: input.participants?.length ?? existing.participants.length,
        agendaCount:      input.agenda?.length ?? existing.agenda.length,
        actionCount:      input.actions?.length ?? existing.actions.length,
      },
    })
  })

  return { ok: true, revisionNumber: nextRevision, revised: wasLocked }
}
