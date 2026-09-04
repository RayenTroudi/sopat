'use server'

import { db } from '@/db'
import { meetingMinutes, meetingActionItems } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit'
import {
  getNextMeetingReference,
  updateMeetingMinute,
  type UpdateMeetingInput,
} from '@/lib/db/meetings'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

/** L'acteur du journal, tel que la session le décrit. */
function actorOf(session: { user: { userId: string; name: string | null; email: string | null; role: string } }): AuditActor {
  return {
    userId: session.user.userId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as AuditActor['role'],
  }
}

export async function createMeeting(data: {
  meetingDate: string
  meetingType?: string
  location?: string
  projectId?: string
  participants?: string
  absentees?: string
  agenda?: string
  discussions?: string
  decisions?: string
  nextMeetingDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }

  const reference = await getNextMeetingReference()

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(meetingMinutes).values({
      reference,
      meetingDate: data.meetingDate,
      meetingType: data.meetingType,
      location: data.location,
      projectId: data.projectId || null,
      participants: data.participants,
      absentees: data.absentees,
      agenda: data.agenda,
      discussions: data.discussions,
      decisions: data.decisions,
      nextMeetingDate: data.nextMeetingDate || null,
      createdBy: session.user.userId,
    }).returning({ id: meetingMinutes.id })

    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: row.id,
      action: 'created',
      actor: actorOf(session),
      newState: { reference, meetingDate: data.meetingDate, meetingType: data.meetingType ?? null },
      metadata: { reference },
    })

    return row.id
  })

  revalidatePath('/admin/meetings')
  return { success: true, id }
}

/**
 * Édition d'un PV depuis l'interface.
 *
 * Délègue au même service que la route PATCH : la règle « un PV validé ne se
 * modifie qu'avec un motif, et cela crée une révision » ne doit exister qu'à
 * un seul endroit, sinon l'un des deux chemins finira par la perdre.
 */
export async function saveMeeting(id: string, input: UpdateMeetingInput) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const result = await updateMeetingMinute(id, input, actorOf(session))
  if (!result.ok) return { success: false, error: result.error }

  revalidatePath('/admin/meetings')
  revalidatePath(`/admin/meetings/${id}`)
  return { success: true, revisionNumber: result.revisionNumber, revised: result.revised }
}

/**
 * Conservée pour les appels existants qui ne touchent que l'en-tête libre.
 * Passe désormais par le service : même transaction, même journal, même règle
 * de révision qu'un enregistrement complet.
 */
export async function updateMeeting(
  id: string,
  data: Partial<{
    meetingDate: string
    meetingType: string
    location: string
    projectId: string
    status: 'planned' | 'in_progress' | 'completed'
    recommendations: string
    nextMeetingDate: string
    nextMeetingTime: string
    changeReason: string
  }>,
) {
  return saveMeeting(id, data as UpdateMeetingInput)
}

/** Suppression logique — « Never delete records ». */
export async function deleteMeeting(id: string, reason: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }
  if (!reason.trim()) return { success: false, error: 'Motif obligatoire' }

  await db.transaction(async (tx) => {
    await tx
      .update(meetingMinutes)
      .set({ deletedAt: new Date(), updatedBy: session.user.userId, updatedAt: new Date() })
      .where(eq(meetingMinutes.id, id))

    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: id,
      action: 'deleted',
      actor: actorOf(session),
      metadata: { changeReason: reason.trim() },
    })
  })

  revalidatePath('/admin/meetings')
  return { success: true }
}

export async function addMeetingAction(data: {
  meetingId: string
  description: string
  responsible?: string
  targetDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }

  await db.transaction(async (tx) => {
    const [created] = await tx.insert(meetingActionItems).values({
      meetingId: data.meetingId,
      description: data.description,
      responsible: data.responsible,
      targetDate: data.targetDate,
      createdBy: session.user.userId,
    }).returning({ id: meetingActionItems.id })

    await recordAudit(tx, {
      entityType: 'meeting_action_item',
      entityId: created.id,
      action: 'created',
      actor: actorOf(session),
      newState: {
        description: data.description,
        responsible: data.responsible ?? null,
        targetDate: data.targetDate ?? null,
      },
      metadata: { meetingId: data.meetingId },
    })
  })

  revalidatePath(`/admin/meetings/${data.meetingId}`)
  return { success: true }
}

export async function completeMeetingAction(actionId: string, meetingId: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }

  await db.transaction(async (tx) => {
    await tx
      .update(meetingActionItems)
      .set({ completedAt: new Date(), updatedBy: session.user.userId, updatedAt: new Date() })
      .where(eq(meetingActionItems.id, actionId))

    await recordAudit(tx, {
      entityType: 'meeting_action_item',
      entityId: actionId,
      action: 'status_changed',
      actor: actorOf(session),
      newState: { completed: true },
      metadata: { meetingId },
    })
  })

  revalidatePath(`/admin/meetings/${meetingId}`)
  return { success: true }
}
