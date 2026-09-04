import { db } from '@/db'
import { regulatoryWatch, regulatoryWatchReports, users } from '@/db/schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { diffFields } from '@/lib/audit-diff'

export type RegulatoryWatchEntry = typeof regulatoryWatch.$inferSelect
export type RegulatoryWatchReport = typeof regulatoryWatchReports.$inferSelect

export const REG_WATCH_REPORT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
}

/** Statuts au-delà desquels une modification est une révision, pas une saisie. */
const LOCKED_STATUSES = new Set(['completed'])

export async function getRegulatoryWatchEntries(status?: string) {
  return db
    .select({ entry: regulatoryWatch, creatorName: users.name })
    .from(regulatoryWatch)
    .leftJoin(users, eq(regulatoryWatch.createdBy, users.id))
    .where(
      and(
        isNull(regulatoryWatch.deletedAt),
        status ? eq(regulatoryWatch.status, status as 'applicable' | 'non_applicable' | 'en_veille') : undefined,
      )
    )
    .orderBy(asc(regulatoryWatch.domain), desc(regulatoryWatch.effectiveDate))
}

export async function getRegulatoryWatchById(id: string) {
  const [entry] = await db
    .select()
    .from(regulatoryWatch)
    .where(and(eq(regulatoryWatch.id, id), isNull(regulatoryWatch.deletedAt)))
  return entry ?? null
}

// ─── FOR-MI-02 : rapports annuels de veille ──────────────────────────────────

export async function getRegulatoryWatchReports() {
  return db
    .select({ report: regulatoryWatchReports, creatorName: users.name })
    .from(regulatoryWatchReports)
    .leftJoin(users, eq(regulatoryWatchReports.createdBy, users.id))
    .where(isNull(regulatoryWatchReports.deletedAt))
    .orderBy(desc(regulatoryWatchReports.year), desc(regulatoryWatchReports.createdAt))
}

/**
 * Un rapport et sa grille, tels que le formulaire d'édition doit les afficher.
 *
 * Les lignes remontent dans l'ordre du formulaire papier : `sortOrder` d'abord,
 * puis la date de création, pour que deux lignes ajoutées à la suite ne
 * changent pas de place d'un affichage à l'autre.
 */
export async function getRegulatoryWatchReportById(id: string) {
  const [row] = await db
    .select({ report: regulatoryWatchReports, creatorName: users.name })
    .from(regulatoryWatchReports)
    .leftJoin(users, eq(regulatoryWatchReports.createdBy, users.id))
    .where(and(eq(regulatoryWatchReports.id, id), isNull(regulatoryWatchReports.deletedAt)))
    .limit(1)

  if (!row) return null

  const lines = await db
    .select()
    .from(regulatoryWatch)
    .where(and(eq(regulatoryWatch.reportId, id), isNull(regulatoryWatch.deletedAt)))
    .orderBy(asc(regulatoryWatch.sortOrder), asc(regulatoryWatch.createdAt))

  return { ...row.report, creatorName: row.creatorName, lines }
}

/**
 * Toutes les lignes de veille rattachées à un rapport, à plat, pour l'export.
 *
 * Le formulaire officiel EST la grille : sans cette feuille, le classeur
 * exporté ne serait pas le même document que celui que l'auditeur a en main.
 */
export async function getRegulatoryWatchLinesForExport() {
  return db
    .select({
      reportReference:       regulatoryWatchReports.reference,
      year:                  regulatoryWatchReports.year,
      watchDate:             regulatoryWatch.watchDate,
      watchType:             regulatoryWatch.watchType,
      axis:                  regulatoryWatch.axis,
      reference:             regulatoryWatch.reference,
      content:               regulatoryWatch.content,
      version:               regulatoryWatch.version,
      consultationSource:    regulatoryWatch.consultationSource,
      results:               regulatoryWatch.results,
      applicationLevel:      regulatoryWatch.applicationLevel,
      conformityAssessment:  regulatoryWatch.conformityAssessment,
      associatedRisk:        regulatoryWatch.associatedRisk,
      processCode:           regulatoryWatch.processCode,
      comments:              regulatoryWatch.comments,
      sortOrder:             regulatoryWatch.sortOrder,
    })
    .from(regulatoryWatch)
    .innerJoin(regulatoryWatchReports, eq(regulatoryWatch.reportId, regulatoryWatchReports.id))
    .where(and(isNull(regulatoryWatch.deletedAt), isNull(regulatoryWatchReports.deletedAt)))
    .orderBy(desc(regulatoryWatchReports.year), asc(regulatoryWatch.sortOrder))
}

export async function getNextRegWatchReportReference(year: number) {
  const [{ total }] = await db.select({ total: count() }).from(regulatoryWatchReports)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `RVN-${year}-${seq}`
}

export type RegulatoryWatchLineInput = {
  /** Présent = ligne existante à mettre à jour ; absent = nouvelle ligne. */
  id?: string
  watchDate?: string | null
  watchType?: string | null
  axis?: string | null
  reference?: string | null
  content?: string | null
  version?: string | null
  consultationSource?: string | null
  results?: string | null
  applicationLevel?: string | null
  conformityAssessment?: string | null
  associatedRisk?: string | null
  processCode?: string | null
  comments?: string | null
  sortOrder?: number
}

export type UpdateRegulatoryWatchReportInput = {
  year?: number
  status?: 'planned' | 'in_progress' | 'completed'
  /** Grille complète : les lignes absentes du tableau sont supprimées (soft). */
  lines?: RegulatoryWatchLineInput[]
  /**
   * Motif de la modification. Obligatoire dès que le rapport est terminé :
   * c'est la condition qui empêche l'écrasement silencieux d'un rapport clos.
   */
  changeReason?: string
}

export type UpdateRegulatoryWatchReportResult =
  | { ok: true; revisionNumber: number; revised: boolean }
  | { ok: false; status: 404 | 422; error: string }

/** Les champs de ligne écrits par le formulaire, dans l'ordre des colonnes. */
function lineValues(incoming: RegulatoryWatchLineInput, index: number) {
  return {
    watchDate:            incoming.watchDate ?? null,
    watchType:            incoming.watchType ?? null,
    axis:                 incoming.axis ?? null,
    reference:            incoming.reference ?? null,
    content:              incoming.content ?? null,
    version:              incoming.version ?? null,
    consultationSource:   incoming.consultationSource ?? null,
    results:              incoming.results ?? null,
    applicationLevel:     incoming.applicationLevel ?? null,
    conformityAssessment: incoming.conformityAssessment ?? null,
    associatedRisk:       incoming.associatedRisk ?? null,
    processCode:          (incoming.processCode || null) as typeof regulatoryWatch.$inferInsert.processCode,
    comments:             incoming.comments ?? null,
    sortOrder:            incoming.sortOrder ?? index,
  }
}

/**
 * Modifie un rapport de veille FOR-MI-02.
 *
 * Tant que le rapport est planifié ou en cours, c'est de la saisie : on écrit,
 * on journalise, la révision ne bouge pas. Dès qu'il est terminé, la même
 * opération devient la révision d'un enregistrement qualité clos : le motif
 * devient obligatoire, `revisionNumber` passe de 1 à 2, et le journal conserve
 * l'avant/après avec ce motif. Sans cette bascule, corriger une évaluation de
 * conformité après signature ne laisserait aucune trace distinguable d'une
 * saisie initiale.
 *
 * Tout part dans une seule transaction avec ses lignes de journal : un rapport
 * ne doit pas pouvoir changer sans que la trace parte avec lui.
 */
export async function updateRegulatoryWatchReport(
  id: string,
  input: UpdateRegulatoryWatchReportInput,
  actor: AuditActor,
): Promise<UpdateRegulatoryWatchReportResult> {
  const existing = await getRegulatoryWatchReportById(id)
  if (!existing) return { ok: false, status: 404, error: 'Rapport de veille introuvable' }

  const wasLocked = LOCKED_STATUSES.has(existing.status)
  const reason = input.changeReason?.trim() ?? ''

  if (wasLocked && reason.length === 0) {
    return {
      ok: false,
      status: 422,
      error:
        'Ce rapport de veille est terminé : un motif de modification est obligatoire (ISO 9001:2015 §7.5.3.2).',
    }
  }

  const nextRevision = wasLocked ? existing.revisionNumber + 1 : existing.revisionNumber

  const header = { year: input.year, status: input.status }
  const headerDiff = diffFields(existing as unknown as Record<string, unknown>, header)

  await db.transaction(async (tx) => {
    const setClause = Object.fromEntries(
      Object.entries(header).filter(([, v]) => v !== undefined),
    ) as Partial<typeof regulatoryWatchReports.$inferInsert>

    await tx
      .update(regulatoryWatchReports)
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
      .where(eq(regulatoryWatchReports.id, id))

    if (input.lines !== undefined) {
      const byId = new Map(existing.lines.map((l) => [l.id, l]))
      const keptIds = new Set<string>()

      for (const [index, incoming] of input.lines.entries()) {
        const values = lineValues(incoming, index)

        const current = incoming.id ? byId.get(incoming.id) : undefined
        if (current) {
          keptIds.add(current.id)
          const lineDiff = diffFields(current as unknown as Record<string, unknown>, values)
          if (!lineDiff) continue
          await tx
            .update(regulatoryWatch)
            .set({ ...values, updatedBy: actor.userId, updatedAt: new Date() })
            .where(eq(regulatoryWatch.id, current.id))
          await recordAudit(tx, {
            entityType: 'regulatory_watch_line',
            entityId: current.id,
            action: 'updated',
            actor,
            previousState: lineDiff.previous,
            newState: lineDiff.next,
            metadata: { reportId: id, revisionNumber: nextRevision, changeReason: reason || null },
          })
        } else {
          const [created] = await tx
            .insert(regulatoryWatch)
            .values({ reportId: id, ...values, createdBy: actor.userId })
            .returning({ id: regulatoryWatch.id })
          keptIds.add(created.id)
          await recordAudit(tx, {
            entityType: 'regulatory_watch_line',
            entityId: created.id,
            action: 'created',
            actor,
            newState: values,
            metadata: { reportId: id, revisionNumber: nextRevision, changeReason: reason || null },
          })
        }
      }

      // Suppression logique seulement — « Never delete records ».
      for (const stale of existing.lines) {
        if (keptIds.has(stale.id)) continue
        await tx
          .update(regulatoryWatch)
          .set({ deletedAt: new Date(), updatedBy: actor.userId, updatedAt: new Date() })
          .where(eq(regulatoryWatch.id, stale.id))
        await recordAudit(tx, {
          entityType: 'regulatory_watch_line',
          entityId: stale.id,
          action: 'deleted',
          actor,
          previousState: {
            reference: stale.reference,
            content: stale.content,
            conformityAssessment: stale.conformityAssessment,
          },
          metadata: { reportId: id, revisionNumber: nextRevision, changeReason: reason || null },
        })
      }
    }

    await recordAudit(tx, {
      entityType: 'regulatory_watch_report',
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
