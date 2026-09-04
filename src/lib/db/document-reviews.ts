import { db } from '@/db'
import {
  documentReviews,
  documentReviewLines,
  dmsDocuments,
  users,
} from '@/db/schema'
import { eq, and, isNull, desc, asc, count, inArray } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { diffFields } from '@/lib/audit-diff'

export type DocumentReview = typeof documentReviews.$inferSelect
export type DocumentReviewLine = typeof documentReviewLines.$inferSelect

export const DOC_REVIEW_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
}

/** Statuts au-delà desquels une modification est une révision, pas une saisie. */
const LOCKED_STATUSES = new Set(['completed'])

export async function getDocumentReviews(filters?: { status?: string }) {
  return db
    .select({
      review: documentReviews,
      creatorName: users.name,
    })
    .from(documentReviews)
    .leftJoin(users, eq(documentReviews.createdBy, users.id))
    .where(
      and(
        isNull(documentReviews.deletedAt),
        filters?.status
          ? eq(documentReviews.status, filters.status as 'planned' | 'in_progress' | 'completed')
          : undefined,
      )
    )
    .orderBy(desc(documentReviews.reviewDate))
}

/**
 * Une revue et sa grille, telles que le formulaire d'édition doit les afficher.
 *
 * Les lignes remontent avec le titre du document DMS rattaché quand il y en a
 * un : sur le formulaire papier ce titre est recopié à la main, ici il vient du
 * registre — c'est précisément l'intérêt du rattachement.
 */
export async function getDocumentReviewById(id: string) {
  const [row] = await db
    .select({ review: documentReviews, creatorName: users.name })
    .from(documentReviews)
    .leftJoin(users, eq(documentReviews.createdBy, users.id))
    .where(and(eq(documentReviews.id, id), isNull(documentReviews.deletedAt)))
    .limit(1)

  if (!row) return null

  const lines = await db
    .select({
      line: documentReviewLines,
      dmsTitle: dmsDocuments.title,
      dmsCode: dmsDocuments.documentNumber,
    })
    .from(documentReviewLines)
    .leftJoin(dmsDocuments, eq(documentReviewLines.documentId, dmsDocuments.id))
    .where(
      and(
        eq(documentReviewLines.reviewId, id),
        isNull(documentReviewLines.deletedAt),
      )
    )
    .orderBy(asc(documentReviewLines.sortOrder), asc(documentReviewLines.createdAt))

  return {
    ...row.review,
    creatorName: row.creatorName,
    lines: lines.map(({ line, dmsTitle, dmsCode }) => ({ ...line, dmsTitle, dmsCode })),
  }
}

/**
 * Toutes les lignes de revue, à plat, pour l'export FOR-MI-01.
 *
 * L'export ne montrait que l'en-tête des revues ; le formulaire officiel, lui,
 * EST la grille. Sans cette feuille, le classeur exporté ne serait pas le même
 * document que celui que l'auditeur a en main.
 */
export async function getDocumentReviewLinesForExport() {
  return db
    .select({
      reference:             documentReviews.reference,
      reviewDate:            documentReviews.reviewDate,
      processCode:           documentReviews.processCode,
      documentCode:          documentReviewLines.documentCode,
      title:                 documentReviewLines.title,
      dmsTitle:              dmsDocuments.title,
      changeNeeded:          documentReviewLines.changeNeeded,
      changeDescription:     documentReviewLines.changeDescription,
      riskReviewNeeded:      documentReviewLines.riskReviewNeeded,
      riskReviewDescription: documentReviewLines.riskReviewDescription,
      comments:              documentReviewLines.comments,
      sortOrder:             documentReviewLines.sortOrder,
    })
    .from(documentReviewLines)
    .innerJoin(documentReviews, eq(documentReviewLines.reviewId, documentReviews.id))
    .leftJoin(dmsDocuments, eq(documentReviewLines.documentId, dmsDocuments.id))
    .where(and(isNull(documentReviewLines.deletedAt), isNull(documentReviews.deletedAt)))
    .orderBy(desc(documentReviews.reviewDate), asc(documentReviewLines.sortOrder))
}

export async function getNextDocReviewReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(documentReviews)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `RDOC-${year}-${seq}`
}

export type DocumentReviewLineInput = {
  /** Présent = ligne existante à mettre à jour ; absent = nouvelle ligne. */
  id?: string
  documentCode?: string | null
  documentId?: string | null
  title?: string | null
  changeNeeded?: boolean | null
  changeDescription?: string | null
  riskReviewNeeded?: boolean | null
  riskReviewDescription?: string | null
  comments?: string | null
  sortOrder?: number
}

export type UpdateDocumentReviewInput = {
  reviewDate?: string
  processCode?: string | null
  scope?: string | null
  documentsCount?: number | null
  findings?: string | null
  decisions?: string | null
  nextReviewDate?: string | null
  status?: 'planned' | 'in_progress' | 'completed'
  /** Grille complète : les lignes absentes du tableau sont supprimées (soft). */
  lines?: DocumentReviewLineInput[]
  /**
   * Motif de la modification. Obligatoire dès que la revue est terminée : c'est
   * la condition qui empêche l'écrasement silencieux d'un rapport clos.
   */
  changeReason?: string
}

export type UpdateDocumentReviewResult =
  | { ok: true; revisionNumber: number; revised: boolean }
  | { ok: false; status: 404 | 422; error: string }

/**
 * Modifie une revue documentaire.
 *
 * Tant que la revue est planifiée ou en cours, c'est de la saisie : on écrit,
 * on journalise, la révision ne bouge pas. Dès qu'elle est terminée, la même
 * opération devient la révision d'un enregistrement qualité clos : le motif
 * devient obligatoire, `revisionNumber` passe de 1 à 2, et le journal conserve
 * l'avant/après avec ce motif. Sans cette bascule, corriger un constat après
 * signature ne laisserait aucune trace distinguable d'une saisie initiale.
 *
 * Tout part dans une seule transaction avec sa ligne de journal : un rapport ne
 * doit pas pouvoir changer sans que la trace parte avec lui.
 */
export async function updateDocumentReview(
  id: string,
  input: UpdateDocumentReviewInput,
  actor: AuditActor,
): Promise<UpdateDocumentReviewResult> {
  const existing = await getDocumentReviewById(id)
  if (!existing) return { ok: false, status: 404, error: 'Revue introuvable' }

  const wasLocked = LOCKED_STATUSES.has(existing.status)
  const reason = input.changeReason?.trim() ?? ''

  if (wasLocked && reason.length === 0) {
    return {
      ok: false,
      status: 422,
      error:
        'Cette revue est terminée : un motif de modification est obligatoire (ISO 9001:2015 §7.5.3.2).',
    }
  }

  // Les rattachements DMS sont vérifiés avant toute écriture : une ligne ne doit
  // pas pouvoir pointer vers un document absent du registre.
  const documentIds = [
    ...new Set((input.lines ?? []).map((l) => l.documentId).filter((v): v is string => !!v)),
  ]
  if (documentIds.length > 0) {
    const found = await db
      .select({ id: dmsDocuments.id })
      .from(dmsDocuments)
      .where(inArray(dmsDocuments.id, documentIds))
    if (found.length !== documentIds.length)
      return { ok: false, status: 422, error: 'Une ligne référence un document DMS inconnu.' }
  }

  const nextRevision = wasLocked ? existing.revisionNumber + 1 : existing.revisionNumber

  const header = {
    reviewDate:     input.reviewDate,
    processCode:    input.processCode,
    scope:          input.scope,
    documentsCount: input.documentsCount,
    findings:       input.findings,
    decisions:      input.decisions,
    nextReviewDate: input.nextReviewDate,
    status:         input.status,
  }
  const headerDiff = diffFields(existing as unknown as Record<string, unknown>, header)

  await db.transaction(async (tx) => {
    const setClause = Object.fromEntries(
      Object.entries(header).filter(([, v]) => v !== undefined),
    ) as Partial<typeof documentReviews.$inferInsert>

    await tx
      .update(documentReviews)
      .set({
        ...setClause,
        // La clôture porte la signature du pilote : écrite au moment où le
        // statut bascule, jamais réécrite ensuite.
        ...(input.status === 'completed' && existing.status !== 'completed'
          ? { completedAt: new Date(), completedBy: actor.userId }
          : {}),
        revisionNumber: nextRevision,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(documentReviews.id, id))

    if (input.lines !== undefined) {
      const byId = new Map(existing.lines.map((l) => [l.id, l]))
      const keptIds = new Set<string>()

      for (const [index, incoming] of input.lines.entries()) {
        const values = {
          documentCode:          incoming.documentCode ?? null,
          documentId:            incoming.documentId ?? null,
          title:                 incoming.title ?? null,
          changeNeeded:          incoming.changeNeeded ?? null,
          changeDescription:     incoming.changeDescription ?? null,
          riskReviewNeeded:      incoming.riskReviewNeeded ?? null,
          riskReviewDescription: incoming.riskReviewDescription ?? null,
          comments:              incoming.comments ?? null,
          sortOrder:             incoming.sortOrder ?? index,
        }

        const current = incoming.id ? byId.get(incoming.id) : undefined
        if (current) {
          keptIds.add(current.id)
          const lineDiff = diffFields(current as unknown as Record<string, unknown>, values)
          if (!lineDiff) continue
          await tx
            .update(documentReviewLines)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(documentReviewLines.id, current.id))
          await recordAudit(tx, {
            entityType: 'document_review_line',
            entityId: current.id,
            action: 'updated',
            actor,
            previousState: lineDiff.previous,
            newState: lineDiff.next,
            metadata: { reviewId: id, revisionNumber: nextRevision, changeReason: reason || null },
          })
        } else {
          const [created] = await tx
            .insert(documentReviewLines)
            .values({ reviewId: id, ...values })
            .returning({ id: documentReviewLines.id })
          keptIds.add(created.id)
          await recordAudit(tx, {
            entityType: 'document_review_line',
            entityId: created.id,
            action: 'created',
            actor,
            newState: values,
            metadata: { reviewId: id, revisionNumber: nextRevision, changeReason: reason || null },
          })
        }
      }

      // Suppression logique seulement — « Never delete records ».
      for (const stale of existing.lines) {
        if (keptIds.has(stale.id)) continue
        await tx
          .update(documentReviewLines)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(documentReviewLines.id, stale.id))
        await recordAudit(tx, {
          entityType: 'document_review_line',
          entityId: stale.id,
          action: 'deleted',
          actor,
          previousState: {
            documentCode: stale.documentCode,
            title: stale.title,
            comments: stale.comments,
          },
          metadata: { reviewId: id, revisionNumber: nextRevision, changeReason: reason || null },
        })
      }
    }

    await recordAudit(tx, {
      entityType: 'document_review',
      entityId: id,
      action: wasLocked ? 'revised' : 'updated',
      actor,
      previousState: { ...(headerDiff?.previous ?? {}), revisionNumber: existing.revisionNumber },
      newState:      { ...(headerDiff?.next ?? {}),     revisionNumber: nextRevision },
      metadata: {
        reference: existing.reference,
        changeReason: reason || null,
        lineCount: input.lines?.length ?? existing.lines.length,
      },
    })
  })

  return { ok: true, revisionNumber: nextRevision, revised: wasLocked }
}
