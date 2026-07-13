import { db } from '@/db'
import {
  nonConformances,
  correctiveActions,
  managementReviewActions,
  managementReviews,
  commercialOffers,
  dmsDocuments,
} from '@/db/schema'
import { and, eq, isNull, lt, lte, gte, inArray, sql } from 'drizzle-orm'

export type DeadlineAlert = {
  kind: 'nc' | 'capa' | 'review_action' | 'offer' | 'document'
  label: string
  detail: string
  dueDate: Date | null
  href: string
  overdue: boolean
}

/**
 * Alertes d'échéances SMQ : NC en retard, CAPA en retard, actions de revue
 * de direction en retard, offres expirant sous 14 jours, documents DMS à
 * revoir sous 30 jours.
 */
export async function getDeadlineAlerts(): Promise<DeadlineAlert[]> {
  const now = new Date()
  const in14d = new Date(now.getTime() + 14 * 86400000)
  const in30d = new Date(now.getTime() + 30 * 86400000)
  const todayStr = now.toISOString().slice(0, 10)
  const in14dStr = in14d.toISOString().slice(0, 10)

  const [overdueNcs, overdueCapas, overdueActions, expiringOffers, docsDue] = await Promise.all([
    db
      .select({
        reference: nonConformances.reference,
        description: nonConformances.description,
        deadline: nonConformances.deadline,
        id: nonConformances.id,
      })
      .from(nonConformances)
      .where(
        and(
          isNull(nonConformances.deletedAt),
          inArray(nonConformances.status, ['open', 'in_progress']),
          lt(nonConformances.deadline, now),
        )
      )
      .limit(10),
    db
      .select({
        id: correctiveActions.id,
        ncId: correctiveActions.ncId,
        description: correctiveActions.actionDescription,
        deadline: correctiveActions.deadlinePlanned,
      })
      .from(correctiveActions)
      .where(
        and(
          inArray(correctiveActions.status, ['open', 'in_progress']),
          lt(correctiveActions.deadlinePlanned, now),
        )
      )
      .limit(10),
    db
      .select({
        id: managementReviewActions.id,
        reviewId: managementReviewActions.reviewId,
        reviewRef: managementReviews.reference,
        description: managementReviewActions.description,
        targetDate: managementReviewActions.targetDate,
      })
      .from(managementReviewActions)
      .leftJoin(managementReviews, eq(managementReviewActions.reviewId, managementReviews.id))
      .where(
        and(
          isNull(managementReviewActions.completedAt),
          lt(managementReviewActions.targetDate, todayStr),
        )
      )
      .limit(10),
    db
      .select({
        id: commercialOffers.id,
        reference: commercialOffers.reference,
        projectTitle: commercialOffers.projectTitle,
        validityDate: commercialOffers.validityDate,
      })
      .from(commercialOffers)
      .where(
        and(
          isNull(commercialOffers.deletedAt),
          inArray(commercialOffers.status, ['envoyee', 'en_negociation']),
          lte(commercialOffers.validityDate, in14dStr),
        )
      )
      .limit(10),
    db
      .select({
        id: dmsDocuments.id,
        documentNumber: dmsDocuments.documentNumber,
        title: dmsDocuments.title,
        nextReviewDate: dmsDocuments.nextReviewDate,
      })
      .from(dmsDocuments)
      .where(
        and(
          isNull(dmsDocuments.deletedAt),
          eq(dmsDocuments.status, 'effective'),
          lte(dmsDocuments.nextReviewDate, in30d),
          sql`${dmsDocuments.nextReviewDate} IS NOT NULL`,
        )
      )
      .limit(10),
  ])

  const alerts: DeadlineAlert[] = [
    ...overdueNcs.map((nc): DeadlineAlert => ({
      kind: 'nc',
      label: `NC ${nc.reference} en retard`,
      detail: nc.description.slice(0, 90),
      dueDate: nc.deadline,
      href: `/admin/nc/${nc.id}`,
      overdue: true,
    })),
    ...overdueCapas.map((c): DeadlineAlert => ({
      kind: 'capa',
      label: 'Action corrective en retard',
      detail: c.description.slice(0, 90),
      dueDate: c.deadline,
      href: `/admin/nc/${c.ncId}`,
      overdue: true,
    })),
    ...overdueActions.map((a): DeadlineAlert => ({
      kind: 'review_action',
      label: `Action revue ${a.reviewRef ?? ''} en retard`,
      detail: a.description.slice(0, 90),
      dueDate: a.targetDate ? new Date(a.targetDate) : null,
      href: `/admin/management-reviews/${a.reviewId}`,
      overdue: true,
    })),
    ...expiringOffers.map((o): DeadlineAlert => {
      const overdue = o.validityDate != null && o.validityDate < todayStr
      return {
        kind: 'offer',
        label: `Offre ${o.reference} ${overdue ? 'expirée' : 'expire bientôt'}`,
        detail: o.projectTitle,
        dueDate: o.validityDate ? new Date(o.validityDate) : null,
        href: `/admin/commercial/offers/${o.id}`,
        overdue,
      }
    }),
    ...docsDue.map((d): DeadlineAlert => {
      const overdue = d.nextReviewDate != null && d.nextReviewDate < now
      return {
        kind: 'document',
        label: `Document ${d.documentNumber} à revoir`,
        detail: d.title,
        dueDate: d.nextReviewDate,
        href: '/admin/documents',
        overdue,
      }
    }),
  ]

  return alerts.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)
  })
}
