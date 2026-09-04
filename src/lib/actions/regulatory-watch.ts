'use server'

import { db } from '@/db'
import { regulatoryWatch, regulatoryWatchReports } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { recordAudit } from '@/lib/audit'
import {
  getNextRegWatchReportReference,
  updateRegulatoryWatchReport,
  type UpdateRegulatoryWatchReportInput,
} from '@/lib/db/regulatory-watch'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

export async function createRegulatoryEntry(data: {
  reference?: string
  title: string
  domain?: string
  issuingBody?: string
  publicationDate?: string
  effectiveDate?: string
  status: string
  complianceNotes?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(regulatoryWatch)
      .values({
        reference: data.reference,
        title: data.title,
        domain: data.domain,
        issuingBody: data.issuingBody,
        publicationDate: data.publicationDate,
        effectiveDate: data.effectiveDate,
        status: data.status as 'applicable' | 'non_applicable' | 'en_veille',
        complianceNotes: data.complianceNotes,
        nextReviewDate: data.nextReviewDate,
        createdBy: session.user.userId,
      })
      .returning({ id: regulatoryWatch.id })

    await recordAudit(tx, {
      entityType: 'regulatory_watch_line',
      entityId: created.id,
      action: 'created',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      newState: { reference: data.reference ?? null, title: data.title, status: data.status },
    })

    return created.id
  })

  revalidatePath('/admin/regulatory-watch')
  return { success: true, id }
}

export async function updateRegulatoryEntry(id: string, data: {
  title?: string
  status?: string
  complianceNotes?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  // Champs explicites : `...data as any` écrivait toute colonne fournie, le cast
  // neutralisant jusqu'au contrôle de type. reference/createdBy/deletedAt protégés.
  const STATUSES = ['applicable', 'non_applicable', 'en_veille'] as const
  if (data.status !== undefined && !STATUSES.includes(data.status as typeof STATUSES[number])) {
    return { success: false, error: 'Statut invalide' }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(regulatoryWatch)
      .set({
        ...(data.title            !== undefined && { title: data.title }),
        ...(data.status           !== undefined && { status: data.status as typeof STATUSES[number] }),
        ...(data.complianceNotes  !== undefined && { complianceNotes: data.complianceNotes }),
        ...(data.nextReviewDate   !== undefined && { nextReviewDate: data.nextReviewDate }),
        updatedBy: session.user.userId,
        updatedAt: new Date(),
      })
      .where(eq(regulatoryWatch.id, id))

    await recordAudit(tx, {
      entityType: 'regulatory_watch_line',
      entityId: id,
      action: 'updated',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      newState: data as Record<string, unknown>,
    })
  })

  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}

export async function deleteRegulatoryEntry(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  await db.transaction(async (tx) => {
    await tx
      .update(regulatoryWatch)
      .set({ deletedAt: new Date(), updatedBy: session.user.userId, updatedAt: new Date() })
      .where(eq(regulatoryWatch.id, id))

    await recordAudit(tx, {
      entityType: 'regulatory_watch_line',
      entityId: id,
      action: 'deleted',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    })
  })

  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}

// ─── FOR-MI-02 : rapports annuels ────────────────────────────────────────────

/**
 * Ouvre le rapport de veille d'une année.
 *
 * Aucun formulaire de création : l'en-tête du FOR-MI-02 ne porte qu'une année,
 * et la référence se déduit du registre. Rien à saisir à la main pour démarrer
 * — tout le contenu se remplit ensuite dans la grille.
 */
export async function createRegulatoryWatchReport(year: number) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const reference = await getNextRegWatchReportReference(year)

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(regulatoryWatchReports)
      .values({ reference, year, createdBy: session.user.userId })
      .returning({ id: regulatoryWatchReports.id })

    await recordAudit(tx, {
      entityType: 'regulatory_watch_report',
      entityId: created.id,
      action: 'created',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      newState: { reference, year },
      metadata: { reference },
    })

    return created.id
  })

  revalidatePath('/admin/regulatory-watch')
  return { success: true, id }
}

/**
 * Édition d'un rapport de veille existant depuis l'interface.
 *
 * Délègue au même service que la route PATCH : la règle « un rapport terminé ne
 * se modifie qu'avec un motif, et cela crée une révision » ne doit exister
 * qu'à un seul endroit, sinon l'un des deux chemins finira par la perdre.
 */
export async function saveRegulatoryWatchReport(
  id: string,
  input: UpdateRegulatoryWatchReportInput,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const result = await updateRegulatoryWatchReport(id, input, {
    userId: session.user.userId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  })

  if (!result.ok) return { success: false, error: result.error }

  revalidatePath('/admin/regulatory-watch')
  revalidatePath(`/admin/regulatory-watch/reports/${id}`)
  return { success: true, revisionNumber: result.revisionNumber, revised: result.revised }
}

/** Suppression logique — « Never delete records ». */
export async function softDeleteRegulatoryWatchReport(id: string, reason: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }
  if (!reason.trim()) return { success: false, error: 'Motif obligatoire' }

  await db.transaction(async (tx) => {
    await tx
      .update(regulatoryWatchReports)
      .set({ deletedAt: new Date(), updatedBy: session.user.userId, updatedAt: new Date() })
      .where(eq(regulatoryWatchReports.id, id))

    await recordAudit(tx, {
      entityType: 'regulatory_watch_report',
      entityId: id,
      action: 'deleted',
      actor: {
        userId: session.user.userId,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      metadata: { changeReason: reason.trim() },
    })
  })

  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}
