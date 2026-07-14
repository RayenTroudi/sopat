import { db } from '../../../db/index'
import {
  projects,
  purchaseOrders,
  extraExpenses,
  clientAccountEntries,
  commercialOffers,
  projectPhases,
  plantListItems,
  maintenanceVisits,
} from '../../../db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

// ─── Vue générale (plateforme) ───────────────────────────────────────────────

export type PlatformOverview = {
  projects: {
    total: number; active: number; completed: number; cancelled: number
    byStatus: { status: string; count: number }[]
    byType:   { projectType: string; count: number }[]
  }
  money: {
    contracted: number; invoiced: number; collected: number
    offersWon: number; winRatePct: number | null
    spent: number; margin: number | null; marginPct: number | null
  }
  monthlySpend: { month: string; total: number }[]
  offersByStatus: { status: string; count: number; amount: number }[]
}

const ACTIVE_STATUSES = new Set(['etudes', 'realisation', 'entretien'])

export async function getPlatformOverview(year: number): Promise<PlatformOverview> {
  const [
    statusRows,
    typeRows,
    contractedRow,
    clientEntryRows,
    offerRows,
    poTotalRow,
    exTotalRow,
    poMonthly,
    exMonthly,
  ] = await Promise.all([
    db.select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects).where(isNull(projects.deletedAt)).groupBy(projects.status),

    db.select({ projectType: projects.projectType, count: sql<number>`count(*)::int` })
      .from(projects).where(isNull(projects.deletedAt)).groupBy(projects.projectType),

    db.select({ total: sql<string>`coalesce(sum(${projects.approvedBudget}::numeric), 0)::text` })
      .from(projects).where(isNull(projects.deletedAt)),

    db.select({
      entryType: clientAccountEntries.entryType,
      total: sql<string>`coalesce(sum(${clientAccountEntries.amount}::numeric), 0)::text`,
    })
      .from(clientAccountEntries)
      .where(isNull(clientAccountEntries.deletedAt))
      .groupBy(clientAccountEntries.entryType),

    db.select({
      status: commercialOffers.status,
      count:  sql<number>`count(*)::int`,
      amount: sql<string>`coalesce(sum(${commercialOffers.amount}::numeric), 0)::text`,
    })
      .from(commercialOffers)
      .where(isNull(commercialOffers.deletedAt))
      .groupBy(commercialOffers.status),

    db.select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
      .from(purchaseOrders),

    db.select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
      .from(extraExpenses)
      .where(and(eq(extraExpenses.status, 'approved'), isNull(extraExpenses.deletedAt))),

    db.select({
      month: sql<string>`to_char(${purchaseOrders.purchaseDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text`,
    })
      .from(purchaseOrders)
      .where(sql`extract(year from ${purchaseOrders.purchaseDate}) = ${year}`)
      .groupBy(sql`to_char(${purchaseOrders.purchaseDate}, 'YYYY-MM')`),

    db.select({
      month: sql<string>`to_char(${extraExpenses.expenseDate}::date, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text`,
    })
      .from(extraExpenses)
      .where(and(
        eq(extraExpenses.status, 'approved'),
        isNull(extraExpenses.deletedAt),
        sql`extract(year from ${extraExpenses.expenseDate}::date) = ${year}`,
      ))
      .groupBy(sql`to_char(${extraExpenses.expenseDate}::date, 'YYYY-MM')`),
  ])

  // Projets
  const byStatus = statusRows.map((r) => ({ status: String(r.status), count: Number(r.count) }))
  const total     = byStatus.reduce((s, r) => s + r.count, 0)
  const active    = byStatus.filter((r) => ACTIVE_STATUSES.has(r.status)).reduce((s, r) => s + r.count, 0)
  const completed = byStatus.find((r) => r.status === 'completed')?.count ?? 0
  const cancelled = byStatus.find((r) => r.status === 'cancelled')?.count ?? 0

  // Argent — trois lectures distinctes, jamais additionnées
  const entryMap: Record<string, number> = {}
  for (const r of clientEntryRows) entryMap[String(r.entryType)] = parseFloat(r.total)
  const invoiced  = (entryMap.facture ?? 0) - (entryMap.avoir ?? 0)
  const collected = entryMap.encaissement ?? 0

  const offersByStatus = offerRows.map((r) => ({
    status: String(r.status), count: Number(r.count), amount: parseFloat(r.amount),
  }))
  const won  = offersByStatus.find((r) => r.status === 'gagnee')
  const lost = offersByStatus.find((r) => r.status === 'perdue')
  const decided = (won?.count ?? 0) + (lost?.count ?? 0)
  const winRatePct = decided > 0 ? Math.round(((won?.count ?? 0) / decided) * 100) : null

  const contracted = parseFloat(contractedRow[0]?.total ?? '0')
  const spent = parseFloat(poTotalRow[0]?.total ?? '0') + parseFloat(exTotalRow[0]?.total ?? '0')
  const margin = contracted > 0 ? contracted - spent : null
  const marginPct = contracted > 0 ? Math.round(((contracted - spent) / contracted) * 100) : null

  // Dépenses mensuelles de l'année sélectionnée (12 mois, mois vides à 0)
  const monthMap: Record<string, number> = {}
  for (const r of [...poMonthly, ...exMonthly]) {
    monthMap[r.month] = (monthMap[r.month] ?? 0) + parseFloat(r.total)
  }
  const monthlySpend = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    return { month, total: Math.round((monthMap[month] ?? 0) * 1000) / 1000 }
  })

  return {
    projects: {
      total, active, completed, cancelled,
      byStatus,
      byType: typeRows.map((r) => ({ projectType: String(r.projectType), count: Number(r.count) })),
    },
    money: {
      contracted, invoiced, collected,
      offersWon: won?.amount ?? 0, winRatePct,
      spent, margin, marginPct,
    },
    monthlySpend,
    offersByStatus,
  }
}

// ─── Rapports par projet / par phase ─────────────────────────────────────────

export type PhaseReport = {
  phase: 'etudes' | 'realisation' | 'entretien'
  status: string
  startedAt: string | null
  completedAt: string | null
  durationDays: number | null
  spend: number
  poCount: number
  plantItemCount: number | null
  predictionTotal: number | null
  predictionVersion: string | null
  maintenanceVisitCount: number | null
}

export type ProjectPhaseReport = {
  id: string; reference: string; name: string; clientName: string
  status: string; currency: string
  approvedBudget: number | null
  totalSpend: number
  variancePct: number | null
  offPhaseSpend: number
  phases: PhaseReport[]
}

const PHASE_ORDER: PhaseReport['phase'][] = ['etudes', 'realisation', 'entretien']

type DatedAmount = { projectId: string; date: Date | null; amount: number; isPo: boolean }

export async function getProjectPhaseReports(): Promise<ProjectPhaseReport[]> {
  const [projectRows, phaseRows, poRows, exRows, plantCounts, visitCounts, predictionResult] = await Promise.all([
    db.select({
      id: projects.id, reference: projects.reference, name: projects.name,
      clientName: projects.clientName, status: projects.status,
      currency: projects.currency, approvedBudget: projects.approvedBudget,
    })
      .from(projects).where(isNull(projects.deletedAt)).orderBy(desc(projects.createdAt)),

    db.select({
      projectId: projectPhases.projectId, phase: projectPhases.phase,
      status: projectPhases.status, startedAt: projectPhases.startedAt,
      completedAt: projectPhases.completedAt,
    }).from(projectPhases),

    db.select({
      projectId: purchaseOrders.projectId,
      purchaseDate: purchaseOrders.purchaseDate,
      totalCost: purchaseOrders.totalCost,
    }).from(purchaseOrders),

    db.select({
      projectId: extraExpenses.projectId,
      expenseDate: extraExpenses.expenseDate,
      amount: extraExpenses.amount,
    })
      .from(extraExpenses)
      .where(and(eq(extraExpenses.status, 'approved'), isNull(extraExpenses.deletedAt))),

    db.select({ projectId: plantListItems.projectId, count: sql<number>`count(*)::int` })
      .from(plantListItems).groupBy(plantListItems.projectId),

    db.select({ projectId: maintenanceVisits.projectId, count: sql<number>`count(*)::int` })
      .from(maintenanceVisits).groupBy(maintenanceVisits.projectId),

    // Dernière prédiction acceptée/modifiée par projet (DISTINCT ON)
    db.execute(sql`
      SELECT DISTINCT ON (project_id)
        project_id AS "projectId",
        predicted_total AS "predictedTotal",
        model_version AS "modelVersion"
      FROM budget_predictions
      WHERE status IN ('accepted', 'overridden')
      ORDER BY project_id, created_at DESC
    `),
  ])

  const phasesByProject: Record<string, typeof phaseRows> = {}
  for (const ph of phaseRows) (phasesByProject[ph.projectId] ??= []).push(ph)

  const spendByProject: Record<string, DatedAmount[]> = {}
  for (const po of poRows) {
    (spendByProject[po.projectId] ??= []).push({
      projectId: po.projectId, date: po.purchaseDate,
      amount: parseFloat(po.totalCost), isPo: true,
    })
  }
  for (const ex of exRows) {
    if (!ex.projectId) continue
    (spendByProject[ex.projectId] ??= []).push({
      projectId: ex.projectId, date: ex.expenseDate ? new Date(ex.expenseDate) : null,
      amount: parseFloat(ex.amount), isPo: false,
    })
  }

  const plantCountMap: Record<string, number> = {}
  for (const r of plantCounts) plantCountMap[r.projectId] = Number(r.count)
  const visitCountMap: Record<string, number> = {}
  for (const r of visitCounts) visitCountMap[r.projectId] = Number(r.count)

  const predictionMap: Record<string, { total: number; version: string | null }> = {}
  for (const r of predictionResult.rows as { projectId: string; predictedTotal: string; modelVersion: string | null }[]) {
    predictionMap[r.projectId] = { total: parseFloat(r.predictedTotal), version: r.modelVersion }
  }

  const now = Date.now()

  return projectRows.map((p) => {
    const phases = (phasesByProject[p.id] ?? [])
      .slice()
      .sort((a, b) => PHASE_ORDER.indexOf(a.phase as PhaseReport['phase']) - PHASE_ORDER.indexOf(b.phase as PhaseReport['phase']))

    const spendRows = spendByProject[p.id] ?? []
    const phaseSpend: Record<string, { spend: number; poCount: number }> = {}
    let offPhaseSpend = 0

    for (const row of spendRows) {
      // Attribution par fenêtre de dates : [startedAt, completedAt], borne
      // supérieure ouverte pour la phase en cours. Non attribuable → hors phase.
      let assigned = false
      if (row.date) {
        const t = row.date.getTime()
        for (const ph of phases) {
          if (!ph.startedAt) continue
          const start = ph.startedAt.getTime()
          const end = ph.completedAt ? ph.completedAt.getTime() : Infinity
          if (t >= start && t <= end) {
            const bucket = (phaseSpend[ph.phase] ??= { spend: 0, poCount: 0 })
            bucket.spend += row.amount
            if (row.isPo) bucket.poCount += 1
            assigned = true
            break
          }
        }
      }
      if (!assigned) offPhaseSpend += row.amount
    }

    const totalSpend = spendRows.reduce((s, r) => s + r.amount, 0)
    const approved = p.approvedBudget ? parseFloat(p.approvedBudget) : null
    const variancePct = approved && approved > 0
      ? Math.round(((totalSpend - approved) / approved) * 1000) / 10
      : null

    const phaseReports: PhaseReport[] = PHASE_ORDER.map((phaseName) => {
      const ph = phases.find((x) => x.phase === phaseName)
      const bucket = phaseSpend[phaseName]
      const startedAt = ph?.startedAt ?? null
      const completedAt = ph?.completedAt ?? null
      const durationDays = startedAt
        ? Math.max(0, Math.round(((completedAt ? completedAt.getTime() : now) - startedAt.getTime()) / 86400000))
        : null
      return {
        phase: phaseName,
        status: ph?.status ?? 'pending',
        startedAt: startedAt ? startedAt.toISOString() : null,
        completedAt: completedAt ? completedAt.toISOString() : null,
        durationDays,
        spend: Math.round((bucket?.spend ?? 0) * 1000) / 1000,
        poCount: bucket?.poCount ?? 0,
        plantItemCount:        phaseName === 'etudes' ? (plantCountMap[p.id] ?? 0) : null,
        predictionTotal:       phaseName === 'etudes' ? (predictionMap[p.id]?.total ?? null) : null,
        predictionVersion:     phaseName === 'etudes' ? (predictionMap[p.id]?.version ?? null) : null,
        maintenanceVisitCount: phaseName === 'entretien' ? (visitCountMap[p.id] ?? 0) : null,
      }
    })

    return {
      id: p.id, reference: p.reference, name: p.name, clientName: p.clientName,
      status: p.status, currency: p.currency ?? 'TND',
      approvedBudget: approved,
      totalSpend: Math.round(totalSpend * 1000) / 1000,
      variancePct,
      offPhaseSpend: Math.round(offPhaseSpend * 1000) / 1000,
      phases: phaseReports,
    }
  })
}
