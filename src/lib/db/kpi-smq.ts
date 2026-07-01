import { db } from '@/db'
import {
  nonConformances,
  correctiveActions,
  auditPrograms,
  risksOpportunities,
  wasteRecords,
  hseChecklistSubmissions,
} from '@/db/schema'
import { eq, and, count, isNull, gte, lte, sql } from 'drizzle-orm'

export async function getSmqKpis(year: number) {
  const yearStart = new Date(`${year}-01-01`)
  const yearEnd = new Date(`${year}-12-31`)
  const dateStartStr = `${year}-01-01`
  const dateEndStr = `${year}-12-31`

  const [
    [ncTotal],
    [ncOpen],
    [ncClosed],
    [capaTotal],
    [capaEffective],
    [auditTotal],
    [auditDone],
    [risksHigh],
    wasteResult,
    [hseConformes],
    [hseTotal],
  ] = await Promise.all([
    db.select({ total: count() }).from(nonConformances)
      .where(and(gte(nonConformances.createdAt, yearStart), lte(nonConformances.createdAt, yearEnd), isNull(nonConformances.deletedAt))),
    db.select({ total: count() }).from(nonConformances)
      .where(and(gte(nonConformances.createdAt, yearStart), lte(nonConformances.createdAt, yearEnd), isNull(nonConformances.deletedAt), eq(nonConformances.status, 'open'))),
    db.select({ total: count() }).from(nonConformances)
      .where(and(gte(nonConformances.createdAt, yearStart), lte(nonConformances.createdAt, yearEnd), isNull(nonConformances.deletedAt), eq(nonConformances.status, 'closed'))),
    db.select({ total: count() }).from(correctiveActions)
      .where(and(gte(correctiveActions.createdAt, yearStart), lte(correctiveActions.createdAt, yearEnd))),
    db.select({ total: count() }).from(correctiveActions)
      .where(and(gte(correctiveActions.createdAt, yearStart), lte(correctiveActions.createdAt, yearEnd), eq(correctiveActions.status, 'closed'))),
    db.select({ total: count() }).from(auditPrograms)
      .where(eq(auditPrograms.year, year)),
    db.select({ total: count() }).from(auditPrograms)
      .where(and(eq(auditPrograms.year, year), eq(auditPrograms.status, 'realise'))),
    db.select({ total: count() }).from(risksOpportunities)
      .where(and(isNull(risksOpportunities.deletedAt), eq(risksOpportunities.type, 'risk'), gte(risksOpportunities.criticality, 12))),
    db.select({ total: sql<number>`coalesce(sum(quantity_kg), 0)` }).from(wasteRecords)
      .where(eq(wasteRecords.year, year)),
    db.select({ total: count() }).from(hseChecklistSubmissions)
      .where(and(gte(hseChecklistSubmissions.submittedDate, dateStartStr), lte(hseChecklistSubmissions.submittedDate, dateEndStr), eq(hseChecklistSubmissions.overallStatus, 'conforme'))),
    db.select({ total: count() }).from(hseChecklistSubmissions)
      .where(and(gte(hseChecklistSubmissions.submittedDate, dateStartStr), lte(hseChecklistSubmissions.submittedDate, dateEndStr))),
  ])

  const auditRate = Number(auditTotal.total) > 0
    ? Math.round((Number(auditDone.total) / Number(auditTotal.total)) * 100)
    : 0

  const capaRate = Number(capaTotal.total) > 0
    ? Math.round((Number(capaEffective.total) / Number(capaTotal.total)) * 100)
    : 0

  const hseRate = Number(hseTotal.total) > 0
    ? Math.round((Number(hseConformes.total) / Number(hseTotal.total)) * 100)
    : 0

  const ncRate = Number(ncTotal.total) > 0
    ? Math.round((Number(ncClosed.total) / Number(ncTotal.total)) * 100)
    : 0

  return {
    ncTotal: Number(ncTotal.total),
    ncOpen: Number(ncOpen.total),
    ncClosed: Number(ncClosed.total),
    ncRate,
    capaRate,
    capaTotal: Number(capaTotal.total),
    capaEffective: Number(capaEffective.total),
    auditRate,
    auditTotal: Number(auditTotal.total),
    auditDone: Number(auditDone.total),
    risksHigh: Number(risksHigh.total),
    wasteKg: Number(wasteResult[0]?.total ?? 0),
    hseRate,
    hseTotal: Number(hseTotal.total),
  }
}
