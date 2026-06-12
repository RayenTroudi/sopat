import { db } from '../../../db/index'
import {
  projects,
  purchaseOrders,
  budgetPredictions,
  nonConformances,
  projectPhases,
} from '../../../db/schema'
import { eq, and, isNull, isNotNull, desc, asc, sql } from 'drizzle-orm'

// ─── Budget Variance Report ───────────────────────────────────────────────────

export type BudgetVarianceRow = {
  id:             string
  reference:      string
  name:           string
  clientName:     string
  status:         string
  country:        string
  approvedBudget: number | null
  mlPrediction:   number | null
  actualSpend:    number
  variancePct:    number | null   // (actual - approved) / approved * 100
  mlErrorPct:     number | null   // (actual - ml) / ml * 100 — only for completed
}

export async function getBudgetVarianceReport(): Promise<BudgetVarianceRow[]> {
  const allProjects = await db
    .select({
      id:             projects.id,
      reference:      projects.reference,
      name:           projects.name,
      clientName:     projects.clientName,
      status:         projects.status,
      country:        projects.country,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.createdAt))

  const rows: BudgetVarianceRow[] = []

  for (const p of allProjects) {
    const [spentRow, predRow] = await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.projectId, p.id)),
      db.select({ predictedTotal: budgetPredictions.predictedTotal })
        .from(budgetPredictions)
        .where(and(eq(budgetPredictions.projectId, p.id), sql`${budgetPredictions.status} IN ('accepted','overridden')`))
        .orderBy(desc(budgetPredictions.createdAt))
        .limit(1),
    ])

    const actualSpend    = parseFloat(spentRow[0]?.total ?? '0')
    const approved       = p.approvedBudget ? parseFloat(p.approvedBudget) : null
    const mlPrediction   = predRow[0]?.predictedTotal ? parseFloat(predRow[0].predictedTotal) : null
    const variancePct    = approved && approved > 0 ? Math.round(((actualSpend - approved) / approved) * 1000) / 10 : null
    const mlErrorPct     = mlPrediction && mlPrediction > 0 ? Math.round(((actualSpend - mlPrediction) / mlPrediction) * 1000) / 10 : null

    rows.push({ id: p.id, reference: p.reference, name: p.name, clientName: p.clientName, status: p.status, country: p.country, approvedBudget: approved, mlPrediction, actualSpend, variancePct, mlErrorPct })
  }

  return rows
}

// ─── NC Analysis (monthly counts by status) ───────────────────────────────────

export type NcMonthlyRow = {
  month:      string  // "2026-01"
  open:       number
  in_progress: number
  closed:     number
  verified:   number
  total:      number
}

export async function getNcMonthlyBreakdown(): Promise<NcMonthlyRow[]> {
  const rows = await db
    .select({
      month:  sql<string>`to_char(detected_at, 'YYYY-MM')`,
      status: nonConformances.status,
      count:  sql<number>`count(*)`,
    })
    .from(nonConformances)
    .where(isNull(nonConformances.deletedAt))
    .groupBy(sql`to_char(detected_at, 'YYYY-MM')`, nonConformances.status)
    .orderBy(asc(sql`to_char(detected_at, 'YYYY-MM')`))

  // Pivot into per-month rows
  const byMonth: Record<string, NcMonthlyRow> = {}
  for (const r of rows) {
    if (!byMonth[r.month]) {
      byMonth[r.month] = { month: r.month, open: 0, in_progress: 0, closed: 0, verified: 0, total: 0 }
    }
    const m = byMonth[r.month]
    const count = Number(r.count)
    m.total += count
    if (r.status === 'open')        m.open        += count
    if (r.status === 'in_progress') m.in_progress += count
    if (r.status === 'closed')      m.closed      += count
    if (r.status === 'verified')    m.verified    += count
  }

  return Object.values(byMonth)
}

// ─── Project Timeline (Gantt data) ────────────────────────────────────────────

export type TimelineProject = {
  id:                    string
  reference:             string
  name:                  string
  clientName:            string
  status:                string
  startDate:             Date | null
  estimatedDeliveryDate: Date | null
  actualDeliveryDate:    Date | null
  phases: {
    phase:       string
    status:      string
    startedAt:   Date | null
    completedAt: Date | null
  }[]
}

export async function getProjectTimeline(): Promise<TimelineProject[]> {
  const allProjects = await db
    .select({
      id:                    projects.id,
      reference:             projects.reference,
      name:                  projects.name,
      clientName:            projects.clientName,
      status:                projects.status,
      startDate:             projects.startDate,
      estimatedDeliveryDate: projects.estimatedDeliveryDate,
      actualDeliveryDate:    projects.actualDeliveryDate,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.startDate))

  const phases = await db
    .select({
      projectId:   projectPhases.projectId,
      phase:       projectPhases.phase,
      status:      projectPhases.status,
      startedAt:   projectPhases.startedAt,
      completedAt: projectPhases.completedAt,
    })
    .from(projectPhases)

  const phasesByProject: Record<string, typeof phases> = {}
  for (const ph of phases) {
    if (!phasesByProject[ph.projectId]) phasesByProject[ph.projectId] = []
    phasesByProject[ph.projectId].push(ph)
  }

  return allProjects.map((p) => ({
    ...p,
    phases: (phasesByProject[p.id] ?? []).sort((a, b) => {
      const order = { etudes: 0, realisation: 1, entretien: 2 } as Record<string, number>
      return (order[a.phase] ?? 0) - (order[b.phase] ?? 0)
    }),
  }))
}

// ─── ML Prediction Accuracy ───────────────────────────────────────────────────

export type MlAccuracyRow = {
  projectId:       string
  reference:       string
  name:            string
  predictedTotal:  number
  actualSpend:     number
  errorAbs:        number   // |predicted - actual|
  errorPct:        number   // (predicted - actual) / actual * 100
  isFallback:      boolean
  modelVersion:    string | null
  predictionDate:  Date
}

export type MlAccuracySummary = {
  rows:          MlAccuracyRow[]
  rmse:          number | null
  avgErrorPct:   number | null   // mean absolute % error
  projectCount:  number
}

export async function getMlAccuracyReport(): Promise<MlAccuracySummary> {
  // Only completed projects with an accepted/overridden prediction and real spend
  const completedProjects = await db
    .select({ id: projects.id, reference: projects.reference, name: projects.name })
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.status, 'completed')))

  const rows: MlAccuracyRow[] = []

  for (const p of completedProjects) {
    const [predRow, spentRow] = await Promise.all([
      db.select({
        predictedTotal: budgetPredictions.predictedTotal,
        isFallback:     budgetPredictions.isFallback,
        modelVersion:   budgetPredictions.modelVersion,
        createdAt:      budgetPredictions.createdAt,
      })
        .from(budgetPredictions)
        .where(and(eq(budgetPredictions.projectId, p.id), sql`${budgetPredictions.status} IN ('accepted','overridden')`))
        .orderBy(desc(budgetPredictions.createdAt))
        .limit(1),
      db.select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.projectId, p.id)),
    ])

    if (!predRow[0]) continue
    const predicted = parseFloat(predRow[0].predictedTotal)
    const actual    = parseFloat(spentRow[0]?.total ?? '0')
    if (actual === 0) continue

    rows.push({
      projectId:      p.id,
      reference:      p.reference,
      name:           p.name,
      predictedTotal: predicted,
      actualSpend:    actual,
      errorAbs:       Math.abs(predicted - actual),
      errorPct:       Math.round(((predicted - actual) / actual) * 1000) / 10,
      isFallback:     predRow[0].isFallback,
      modelVersion:   predRow[0].modelVersion,
      predictionDate: predRow[0].createdAt,
    })
  }

  if (rows.length === 0) return { rows, rmse: null, avgErrorPct: null, projectCount: 0 }

  const mse  = rows.reduce((s, r) => s + r.errorAbs ** 2, 0) / rows.length
  const rmse = Math.round(Math.sqrt(mse))
  const avgErrorPct = Math.round(rows.reduce((s, r) => s + Math.abs(r.errorPct), 0) / rows.length * 10) / 10

  return { rows, rmse, avgErrorPct, projectCount: rows.length }
}
