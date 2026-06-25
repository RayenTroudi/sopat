import { unstable_cache } from 'next/cache'
import { db } from '../../../db/index'
import {
  projects,
  nonConformances,
  maintenanceVisits,
  maintenanceSchedules,
  clientSatisfaction,
  projectActivityLog,
  purchaseOrders,
  budgetPredictions,
  users,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql, lt, gte, lte, isNotNull, inArray } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiData = {
  activeProjects:        ActiveProjectsKpi
  onTimeDeliveryRate:    number            // % completed on or before estimated date
  avgBudgetVariance:     number | null     // avg % variance on completed projects
  openNcs:               OpenNcsKpi
  ncSlaClosureRate:      number            // % NCs closed before deadline
  maintenanceThisMonth:  MaintenanceKpi
  satisfactionScore:     number | null     // rolling 12-month avg
}

export type ActiveProjectsKpi = {
  total: number
  byPhase: { etudes: number; realisation: number; entretien: number }
  trendVsLastMonth: number   // +/- count
}

export type OpenNcsKpi = {
  count: number
  overdue: number
  trendVsLastMonth: number
}

export type MaintenanceKpi = {
  completed: number
  scheduled: number
}

export type ActivityEntry = {
  id: string
  projectId: string
  projectName: string | null
  projectRef:  string | null
  actorName:   string
  action:      string
  occurredAt:  Date
  metadata:    unknown
}

export type AtRiskProject = {
  id: string
  reference: string
  name: string
  clientName: string
  status: string
  approvedBudget: string | null
  totalSpent: string | null
  spendPct: number | null
  estimatedDeliveryDate: Date | null
  daysUntilDeadline: number | null
  openNcCount: number
  riskReasons: string[]
}

export type UpcomingVisit = {
  id: string
  projectId: string
  projectName: string | null
  visitDate: Date
  visitType: string
  teamMemberName: string | null
  durationHours: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthStart(monthsAgo = 0) {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() - monthsAgo)
  return d
}

// ─── KPI: Active Projects ────────────────────────────────────────────────────

async function getActiveProjectsKpi(): Promise<ActiveProjectsKpi> {
  const now = monthStart()
  const lastMonth = monthStart(1)

  const [currentRows, lastMonthRows] = await Promise.all([
    db.select({ status: projects.status })
      .from(projects)
      .where(and(isNull(projects.deletedAt), sql`${projects.status} IN ('etudes','realisation','entretien')`)),
    db.select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(isNull(projects.deletedAt), sql`${projects.status} IN ('etudes','realisation','entretien')`, lt(projects.createdAt, now), gte(projects.createdAt, lastMonth))),
  ])

  const byPhase = { etudes: 0, realisation: 0, entretien: 0 }
  for (const r of currentRows) {
    if (r.status === 'etudes' || r.status === 'realisation' || r.status === 'entretien') {
      byPhase[r.status]++
    }
  }

  const prevTotal = Number(lastMonthRows[0]?.count ?? 0)
  const total = currentRows.length

  return { total, byPhase, trendVsLastMonth: total - prevTotal }
}

// ─── KPI: On-Time Delivery Rate ───────────────────────────────────────────────

async function getOnTimeDeliveryRate(): Promise<number> {
  const completed = await db
    .select({
      estimatedDeliveryDate: projects.estimatedDeliveryDate,
      actualDeliveryDate:    projects.actualDeliveryDate,
    })
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.status, 'completed'), isNotNull(projects.actualDeliveryDate), isNotNull(projects.estimatedDeliveryDate)))

  if (completed.length === 0) return 100
  const onTime = completed.filter((p) => {
    if (!p.actualDeliveryDate || !p.estimatedDeliveryDate) return false
    return p.actualDeliveryDate <= p.estimatedDeliveryDate
  }).length
  return Math.round((onTime / completed.length) * 100)
}

// ─── KPI: Average Budget Variance ────────────────────────────────────────────

async function getAvgBudgetVariance(): Promise<number | null> {
  const completedWithBudget = await db
    .select({
      id:             projects.id,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.status, 'completed'), isNotNull(projects.approvedBudget)))

  if (completedWithBudget.length === 0) return null

  const ids = completedWithBudget.map((p) => p.id)
  const spentByProject = await db
    .select({
      projectId: purchaseOrders.projectId,
      total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text`,
    })
    .from(purchaseOrders)
    .where(inArray(purchaseOrders.projectId, ids))
    .groupBy(purchaseOrders.projectId)

  const spentMap = new Map(spentByProject.map((r) => [r.projectId, r.total]))

  const spentRows = completedWithBudget.map((p) => ({
    approvedBudget: parseFloat(p.approvedBudget!),
    totalSpent:     parseFloat(spentMap.get(p.id) ?? '0'),
  }))

  const variances = spentRows
    .filter((r) => r.approvedBudget > 0)
    .map((r) => ((r.totalSpent - r.approvedBudget) / r.approvedBudget) * 100)

  if (variances.length === 0) return null
  return Math.round(variances.reduce((s, v) => s + v, 0) / variances.length * 10) / 10
}

// ─── KPI: Open NCs ───────────────────────────────────────────────────────────

async function getOpenNcsKpi(): Promise<OpenNcsKpi> {
  const now = new Date()
  const lastMonth = monthStart(1)

  const [open, lastMonthOpen] = await Promise.all([
    db.select({ deadline: nonConformances.deadline })
      .from(nonConformances)
      .where(and(isNull(nonConformances.deletedAt), sql`${nonConformances.status} IN ('open','in_progress')`)),
    db.select({ count: sql<number>`count(*)` })
      .from(nonConformances)
      .where(and(isNull(nonConformances.deletedAt), sql`${nonConformances.status} IN ('open','in_progress')`, lt(nonConformances.createdAt, now), gte(nonConformances.createdAt, lastMonth))),
  ])

  const count   = open.length
  const overdue = open.filter((nc) => nc.deadline && nc.deadline < now).length
  const prevCount = Number(lastMonthOpen[0]?.count ?? 0)

  return { count, overdue, trendVsLastMonth: count - prevCount }
}

// ─── KPI: NC SLA Closure Rate ─────────────────────────────────────────────────

async function getNcSlaClosureRate(): Promise<number> {
  const closed = await db
    .select({ deadline: nonConformances.deadline, closedAt: nonConformances.closedAt })
    .from(nonConformances)
    .where(and(isNull(nonConformances.deletedAt), sql`${nonConformances.status} IN ('closed','verified')`, isNotNull(nonConformances.closedAt), isNotNull(nonConformances.deadline)))

  if (closed.length === 0) return 100
  const withinSla = closed.filter((nc) => nc.closedAt! <= nc.deadline!).length
  return Math.round((withinSla / closed.length) * 100)
}

// ─── KPI: Maintenance This Month ─────────────────────────────────────────────

async function getMaintenanceKpi(): Promise<MaintenanceKpi> {
  const from = monthStart()
  const to   = new Date(from)
  to.setMonth(to.getMonth() + 1)

  const visits = await db
    .select({ workDone: maintenanceVisits.workDone })
    .from(maintenanceVisits)
    .where(and(gte(maintenanceVisits.visitDate, from), lt(maintenanceVisits.visitDate, to)))

  return {
    completed: visits.filter((v) => v.workDone !== null).length,
    scheduled: visits.length,
  }
}

// ─── KPI: Satisfaction Score ─────────────────────────────────────────────────

async function getSatisfactionScore(): Promise<number | null> {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  const [result] = await db
    .select({ avg: sql<string>`avg(score)::text` })
    .from(clientSatisfaction)
    .where(gte(clientSatisfaction.recordedAt, twelveMonthsAgo))

  const avg = parseFloat(result?.avg ?? '')
  return isNaN(avg) ? null : Math.round(avg * 10) / 10
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

export async function getRecentActivity(limit = 20): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id:          projectActivityLog.id,
      projectId:   projectActivityLog.projectId,
      projectName: projects.name,
      projectRef:  projects.reference,
      actorName:   projectActivityLog.actorName,
      action:      projectActivityLog.action,
      occurredAt:  projectActivityLog.occurredAt,
      metadata:    projectActivityLog.metadata,
    })
    .from(projectActivityLog)
    .leftJoin(projects, eq(projectActivityLog.projectId, projects.id))
    .orderBy(desc(projectActivityLog.occurredAt))
    .limit(limit)

  return rows as ActivityEntry[]
}

// ─── Projects at Risk ─────────────────────────────────────────────────────────

export async function getAtRiskProjects(): Promise<AtRiskProject[]> {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const activeProjects = await db
    .select({
      id:                    projects.id,
      reference:             projects.reference,
      name:                  projects.name,
      clientName:            projects.clientName,
      status:                projects.status,
      approvedBudget:        projects.approvedBudget,
      estimatedDeliveryDate: projects.estimatedDeliveryDate,
    })
    .from(projects)
    .where(and(isNull(projects.deletedAt), sql`${projects.status} IN ('etudes','realisation','entretien')`))

  if (activeProjects.length === 0) return []

  const projectIds = activeProjects.map((p) => p.id)

  // Batch both lookups — 2 queries total instead of 2N
  const [spentRows, ncRows] = await Promise.all([
    db.select({
        projectId: purchaseOrders.projectId,
        total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text`,
      })
      .from(purchaseOrders)
      .where(inArray(purchaseOrders.projectId, projectIds))
      .groupBy(purchaseOrders.projectId),
    db.select({
        projectId: nonConformances.projectId,
        count: sql<number>`count(*)`,
      })
      .from(nonConformances)
      .where(and(
        inArray(nonConformances.projectId, projectIds),
        isNull(nonConformances.deletedAt),
        sql`${nonConformances.status} IN ('open','in_progress')`,
      ))
      .groupBy(nonConformances.projectId),
  ])

  const spentByProject = new Map(spentRows.map((r) => [r.projectId, r.total]))
  const ncByProject    = new Map(ncRows.map((r) => [r.projectId, Number(r.count)]))

  const results: AtRiskProject[] = []

  for (const p of activeProjects) {
    const riskReasons: string[] = []

    const totalSpent = spentByProject.get(p.id) ?? '0'
    const spent      = parseFloat(totalSpent)
    const approved   = p.approvedBudget ? parseFloat(p.approvedBudget) : null
    const spendPct   = approved && approved > 0 ? (spent / approved) * 100 : null

    if (spendPct !== null && spendPct >= 90) {
      riskReasons.push(spendPct >= 100 ? `Budget dépassé (${spendPct.toFixed(0)}%)` : `Budget à 90% (${spendPct.toFixed(0)}%)`)
    }

    const daysUntilDeadline = p.estimatedDeliveryDate
      ? Math.ceil((p.estimatedDeliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (daysUntilDeadline !== null && daysUntilDeadline <= 7) {
      riskReasons.push(daysUntilDeadline <= 0 ? 'Délai dépassé' : `Délai dans ${daysUntilDeadline}j`)
    }

    const openNcCount = ncByProject.get(p.id) ?? 0
    if (openNcCount > 0) riskReasons.push(`${openNcCount} NC ouverte${openNcCount > 1 ? 's' : ''}`)

    if (riskReasons.length > 0) {
      results.push({
        id:                    p.id,
        reference:             p.reference,
        name:                  p.name,
        clientName:            p.clientName,
        status:                p.status,
        approvedBudget:        p.approvedBudget,
        totalSpent,
        spendPct,
        estimatedDeliveryDate: p.estimatedDeliveryDate,
        daysUntilDeadline,
        openNcCount,
        riskReasons,
      })
    }
  }

  return results.sort((a, b) => b.riskReasons.length - a.riskReasons.length)
}

// ─── Upcoming Maintenance Visits ─────────────────────────────────────────────

export async function getUpcomingVisits(days = 7): Promise<UpcomingVisit[]> {
  const now  = new Date()
  const end  = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id:             maintenanceVisits.id,
      projectId:      maintenanceVisits.projectId,
      projectName:    projects.name,
      visitDate:      maintenanceVisits.visitDate,
      visitType:      maintenanceVisits.visitType,
      teamMemberName: users.name,
      durationHours:  maintenanceVisits.durationHours,
    })
    .from(maintenanceVisits)
    .leftJoin(projects, eq(maintenanceVisits.projectId, projects.id))
    .leftJoin(users,    eq(maintenanceVisits.teamMemberId, users.id))
    .where(and(gte(maintenanceVisits.visitDate, now), lte(maintenanceVisits.visitDate, end), sql`${maintenanceVisits.workDone} IS NULL`))
    .orderBy(asc(maintenanceVisits.visitDate))
    .limit(10)

  return rows as UpcomingVisit[]
}

// ─── Master KPI loader ────────────────────────────────────────────────────────

async function _getDashboardKpis(): Promise<KpiData> {
  const [
    activeProjects,
    onTimeDeliveryRate,
    avgBudgetVariance,
    openNcs,
    ncSlaClosureRate,
    maintenanceThisMonth,
    satisfactionScore,
  ] = await Promise.all([
    getActiveProjectsKpi(),
    getOnTimeDeliveryRate(),
    getAvgBudgetVariance(),
    getOpenNcsKpi(),
    getNcSlaClosureRate(),
    getMaintenanceKpi(),
    getSatisfactionScore(),
  ])

  return {
    activeProjects,
    onTimeDeliveryRate,
    avgBudgetVariance,
    openNcs,
    ncSlaClosureRate,
    maintenanceThisMonth,
    satisfactionScore,
  }
}

export const getDashboardKpis = unstable_cache(_getDashboardKpis, ['dashboard-kpis'], { revalidate: 60, tags: ['dashboard-kpis'] })

async function _getRecentActivityCached(limit: number) { return getRecentActivity(limit) }
export const getCachedRecentActivity = unstable_cache(_getRecentActivityCached, ['dashboard-activity'], { revalidate: 30, tags: ['dashboard-activity'] })

async function _getAtRiskProjectsCached() { return getAtRiskProjects() }
export const getCachedAtRiskProjects = unstable_cache(_getAtRiskProjectsCached, ['dashboard-at-risk'], { revalidate: 60, tags: ['dashboard-at-risk'] })
