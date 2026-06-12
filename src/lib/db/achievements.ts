import { db } from '../../../db/index'
import {
  projects,
  rseEvents,
  rseEventResults,
  rsePartnerships,
  nonConformances,
  clientSatisfaction,
  portfolioMetricsSnapshots,
  exchangeRates,
} from '../../../db/schema'
import { sql, eq, and, isNull, desc, lte, inArray } from 'drizzle-orm'

const SOPAT_FOUNDED_YEAR = 2005

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectCountMetrics = {
  parcsUrbains:              number  // espace_public + completed + site_area_m2 > 5000
  espacesVertsPublics:       number  // all completed espace_public
  hotelsResorts:             number  // completed hotelier_touristique
  residencesAppartements:    number  // completed residentiel where subtype in (residence_collective, appartement)
  villasPrivees:             number  // completed residentiel where subtype = villa_privee (or null treated as villa)
  siegesSociaux:             number  // completed siege_social
  projetsInternationaux:     number  // completed where country <> 'TN'
  anneesExperience:          number  // current year - 2005
}

export type RseMetrics = {
  wasteCollectedKg:    number
  treesPlanted:        number
  participants:        number
  activePartnerships:  number
}

export type QualityMetrics = {
  onTimeDeliveryRate:        number | null  // percent or null if no completed projects with both dates
  satisfactionAverage:       number | null  // 0–10 or 0–5 — whatever score scale your DB uses
  ncOnTimeClosureRate:       number | null
}

export type YearlyEvolution = {
  year: number
  byType: Record<string, number>  // projects started per type that year
  revenueTND: number              // sum of actualRevenue (converted to TND) for projects started that year
}

export type GeoRow = {
  country:          string
  continent:        string
  completedCount:   number
  activeCount:      number
  totalValueTND:    number
}

export type SectorSlice = { sector: string; count: number }
export type TopClient   = { clientName: string; totalValueTND: number; projectCount: number }

export type AchievementsPayload = {
  current:          ProjectCountMetrics
  previousYear:     ProjectCountMetrics  // for trend arrows
  rse:              RseMetrics
  quality:          QualityMetrics
  evolution:        YearlyEvolution[]
  geo:              GeoRow[]
  sectors:          SectorSlice[]
  topClients:       TopClient[]
  retentionRate:    number | null
  generatedAt:      string  // ISO
}

// ─── Currency conversion ──────────────────────────────────────────────────────

async function getLatestRatesMap(): Promise<Record<string, number>> {
  // Most recent rate per currency, all converting to TND.
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (from_currency) from_currency, rate
    FROM exchange_rates
    WHERE to_currency = 'TND'
    ORDER BY from_currency, effective_date DESC
  `)
  const map: Record<string, number> = { TND: 1 }
  for (const r of rows as any as { from_currency: string; rate: string }[]) {
    map[r.from_currency] = parseFloat(r.rate)
  }
  return map
}

function toTND(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'TND') return amount
  const r = rates[currency]
  return r ? amount * r : amount  // best-effort fallback
}

// ─── Country → continent map (covers SOPAT geographies) ───────────────────────

const CONTINENT_OF: Record<string, string> = {
  TN: 'Afrique', LY: 'Afrique', SN: 'Afrique', CI: 'Afrique', MA: 'Afrique', DZ: 'Afrique', EG: 'Afrique',
  FR: 'Europe',  IT: 'Europe',  ES: 'Europe',  DE: 'Europe',  BE: 'Europe',  CH: 'Europe',
  QA: 'Moyen-Orient', AE: 'Moyen-Orient', SA: 'Moyen-Orient', OM: 'Moyen-Orient', KW: 'Moyen-Orient', BH: 'Moyen-Orient',
}

export function continentOf(code: string): string {
  return CONTINENT_OF[code] ?? 'Autre'
}

// ─── Project counts ───────────────────────────────────────────────────────────

async function projectCounts(year: number): Promise<ProjectCountMetrics> {
  // "Completed" = status 'completed' AND actual_delivery_date year <= given year (so previous-year trend is meaningful).
  const dateBound = new Date(year + 1, 0, 1)  // exclusive

  const where = and(
    isNull(projects.deletedAt),
    eq(projects.status, 'completed'),
    sql`(${projects.actualDeliveryDate} IS NULL OR ${projects.actualDeliveryDate} < ${dateBound})`,
  )

  const rows = await db
    .select({
      projectType:        projects.projectType,
      country:            projects.country,
      siteAreaM2:         projects.siteAreaM2,
      residentialSubtype: projects.residentialSubtype,
    })
    .from(projects)
    .where(where)

  let parcs = 0, espaces = 0, hotels = 0, residences = 0, villas = 0, sieges = 0, internationaux = 0
  for (const r of rows) {
    const area = r.siteAreaM2 ? parseFloat(r.siteAreaM2) : 0
    if (r.projectType === 'espace_public') {
      espaces += 1
      if (area > 5000) parcs += 1
    }
    if (r.projectType === 'hotelier_touristique') hotels += 1
    if (r.projectType === 'siege_social')         sieges += 1
    if (r.projectType === 'residentiel') {
      if (r.residentialSubtype === 'residence_collective' || r.residentialSubtype === 'appartement') {
        residences += 1
      } else {
        // null subtype is treated as villa (the historical default)
        villas += 1
      }
    }
    if (r.country && r.country !== 'TN') internationaux += 1
  }

  return {
    parcsUrbains:           parcs,
    espacesVertsPublics:    espaces,
    hotelsResorts:          hotels,
    residencesAppartements: residences,
    villasPrivees:          villas,
    siegesSociaux:          sieges,
    projetsInternationaux:  internationaux,
    anneesExperience:       Math.max(0, year - SOPAT_FOUNDED_YEAR),
  }
}

// ─── RSE metrics ──────────────────────────────────────────────────────────────

async function rseMetrics(): Promise<RseMetrics> {
  const [results] = await db
    .select({
      waste:        sql<number>`COALESCE(SUM(${rseEventResults.wasteCollectedKg}), 0)::float`,
      trees:        sql<number>`COALESCE(SUM(${rseEventResults.treesPlanted}), 0)::int`,
      participants: sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)::int`,
    })
    .from(rseEventResults)

  const [{ active }] = await db
    .select({ active: sql<number>`COUNT(*)::int` })
    .from(rsePartnerships)
    .where(eq(rsePartnerships.status, 'actif'))

  return {
    wasteCollectedKg:    Number(results?.waste ?? 0),
    treesPlanted:        Number(results?.trees ?? 0),
    participants:        Number(results?.participants ?? 0),
    activePartnerships:  Number(active ?? 0),
  }
}

// ─── Quality metrics ──────────────────────────────────────────────────────────

async function qualityMetrics(): Promise<QualityMetrics> {
  // On-time delivery: among completed projects with both dates, fraction where actual <= estimated.
  const [delivery] = await db
    .select({
      total:  sql<number>`COUNT(*)::int`,
      onTime: sql<number>`COUNT(*) FILTER (WHERE ${projects.actualDeliveryDate} <= ${projects.estimatedDeliveryDate})::int`,
    })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      eq(projects.status, 'completed'),
      sql`${projects.actualDeliveryDate} IS NOT NULL AND ${projects.estimatedDeliveryDate} IS NOT NULL`,
    ))

  // Satisfaction: simple average over all recorded scores.
  const [sat] = await db
    .select({
      avg: sql<number>`AVG(${clientSatisfaction.score})::float`,
      n:   sql<number>`COUNT(*)::int`,
    })
    .from(clientSatisfaction)

  // NC closure: among NCs with a deadline that are closed, fraction closed on or before deadline.
  const [nc] = await db
    .select({
      total:  sql<number>`COUNT(*)::int`,
      onTime: sql<number>`COUNT(*) FILTER (WHERE ${nonConformances.closedAt} <= ${nonConformances.deadline})::int`,
    })
    .from(nonConformances)
    .where(and(
      sql`${nonConformances.deadline} IS NOT NULL`,
      sql`${nonConformances.closedAt} IS NOT NULL`,
    ))

  return {
    onTimeDeliveryRate:   Number(delivery?.total ?? 0) > 0 ? (Number(delivery!.onTime) / Number(delivery!.total)) * 100 : null,
    satisfactionAverage:  Number(sat?.n ?? 0) > 0 ? Number(sat!.avg) : null,
    ncOnTimeClosureRate:  Number(nc?.total ?? 0) > 0 ? (Number(nc!.onTime) / Number(nc!.total)) * 100 : null,
  }
}

// ─── Evolution per year ───────────────────────────────────────────────────────

async function evolution(yearFrom: number, yearTo: number, rates: Record<string, number>): Promise<YearlyEvolution[]> {
  const rows = await db
    .select({
      year:           sql<number>`EXTRACT(YEAR FROM COALESCE(${projects.startDate}, ${projects.createdAt}))::int`,
      projectType:    projects.projectType,
      currency:       projects.currency,
      actualRevenue:  projects.actualRevenue,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      sql`EXTRACT(YEAR FROM COALESCE(${projects.startDate}, ${projects.createdAt})) BETWEEN ${yearFrom} AND ${yearTo}`,
    ))

  const buckets = new Map<number, YearlyEvolution>()
  for (let y = yearFrom; y <= yearTo; y++) {
    buckets.set(y, { year: y, byType: {}, revenueTND: 0 })
  }
  for (const r of rows) {
    const y = Number(r.year)
    const b = buckets.get(y)
    if (!b) continue
    b.byType[r.projectType] = (b.byType[r.projectType] ?? 0) + 1
    const amt = parseFloat(r.actualRevenue ?? r.approvedBudget ?? '0')
    if (!isNaN(amt) && isFinite(amt)) {
      b.revenueTND += toTND(amt, r.currency ?? 'TND', rates)
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.year - b.year)
}

// ─── Geographic presence ──────────────────────────────────────────────────────

async function geo(rates: Record<string, number>): Promise<GeoRow[]> {
  const rows = await db
    .select({
      country:        projects.country,
      status:         projects.status,
      currency:       projects.currency,
      actualRevenue:  projects.actualRevenue,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))

  const map = new Map<string, GeoRow>()
  for (const r of rows) {
    const code = r.country ?? '??'
    const entry = map.get(code) ?? {
      country: code,
      continent: continentOf(code),
      completedCount: 0,
      activeCount: 0,
      totalValueTND: 0,
    }
    if (r.status === 'completed') entry.completedCount += 1
    else if (r.status === 'etudes' || r.status === 'realisation' || r.status === 'entretien') entry.activeCount += 1
    const amt = parseFloat(r.actualRevenue ?? r.approvedBudget ?? '0')
    if (!isNaN(amt) && isFinite(amt)) {
      entry.totalValueTND += toTND(amt, r.currency ?? 'TND', rates)
    }
    map.set(code, entry)
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.continent !== b.continent) return a.continent.localeCompare(b.continent)
    return b.completedCount - a.completedCount
  })
}

// ─── Sectors + top clients + retention ────────────────────────────────────────

async function sectorsAndClients(rates: Record<string, number>) {
  const rows = await db
    .select({
      clientName:     projects.clientName,
      clientSector:   projects.clientSector,
      currency:       projects.currency,
      actualRevenue:  projects.actualRevenue,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))

  const sectorMap = new Map<string, number>()
  const clientMap = new Map<string, { count: number; valueTND: number }>()

  for (const r of rows) {
    const sector = r.clientSector ?? 'autre'
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1)

    const name = (r.clientName ?? '').trim() || '(client inconnu)'
    const entry = clientMap.get(name) ?? { count: 0, valueTND: 0 }
    entry.count += 1
    const amt = parseFloat(r.actualRevenue ?? r.approvedBudget ?? '0')
    if (!isNaN(amt) && isFinite(amt)) {
      entry.valueTND += toTND(amt, r.currency ?? 'TND', rates)
    }
    clientMap.set(name, entry)
  }

  const sectors: SectorSlice[] = Array.from(sectorMap.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)

  const topClients: TopClient[] = Array.from(clientMap.entries())
    .map(([clientName, v]) => ({ clientName, totalValueTND: v.valueTND, projectCount: v.count }))
    .sort((a, b) => b.totalValueTND - a.totalValueTND)
    .slice(0, 10)

  const totalClients = clientMap.size
  const repeatClients = Array.from(clientMap.values()).filter((v) => v.count >= 2).length
  const retentionRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : null

  return { sectors, topClients, retentionRate }
}

// ─── Public aggregator ────────────────────────────────────────────────────────

export async function getAchievements(opts?: { yearFrom?: number; yearTo?: number }): Promise<AchievementsPayload> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearTo = opts?.yearTo ?? currentYear
  const yearFrom = opts?.yearFrom ?? 2021

  const rates = await getLatestRatesMap()
  const [current, previousYear, rse, quality, evo, geoRows, sc] = await Promise.all([
    projectCounts(currentYear),
    projectCounts(currentYear - 1),
    rseMetrics(),
    qualityMetrics(),
    evolution(yearFrom, yearTo, rates),
    geo(rates),
    sectorsAndClients(rates),
  ])

  return {
    current,
    previousYear,
    rse,
    quality,
    evolution: evo,
    geo: geoRows,
    sectors: sc.sectors,
    topClients: sc.topClients,
    retentionRate: sc.retentionRate,
    generatedAt: now.toISOString(),
  }
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export async function saveMetricsSnapshot(input: {
  metrics: AchievementsPayload
  createdBy: string
}): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const [row] = await db
    .insert(portfolioMetricsSnapshots)
    .values({
      snapshotDate: today,
      metrics:      input.metrics as unknown as object,
      createdBy:    input.createdBy,
    })
    .returning({ id: portfolioMetricsSnapshots.id })
  return row.id
}

export async function listMetricsSnapshots(limit = 24): Promise<{ id: string; snapshotDate: string; createdAt: Date }[]> {
  const rows = await db
    .select({
      id:           portfolioMetricsSnapshots.id,
      snapshotDate: portfolioMetricsSnapshots.snapshotDate,
      createdAt:    portfolioMetricsSnapshots.createdAt,
    })
    .from(portfolioMetricsSnapshots)
    .orderBy(desc(portfolioMetricsSnapshots.snapshotDate))
    .limit(limit)
  return rows.map((r) => ({ ...r, snapshotDate: String(r.snapshotDate) }))
}

// ─── RSE report data ──────────────────────────────────────────────────────────
// Lighter payload tailored for the annual PDF.

export type RseReportData = {
  year:        number
  events:      {
    id:                  string
    title:               string
    eventType:           string
    date:                Date
    location:            string
    participantsActual:  number | null
    wasteCollectedKg:    number | null
    treesPlanted:        number | null
  }[]
  partnerships: {
    id:             string
    partnerName:    string
    partnerType:    string
    status:         string
    signedDate:     Date | null
    endDate:        Date | null
  }[]
  impact:       RseMetrics
}

export async function getRseReportData(year: number): Promise<RseReportData> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const events = await db
    .select({
      id:                 rseEvents.id,
      title:              rseEvents.title,
      eventType:          rseEvents.eventType,
      date:               rseEvents.date,
      location:           rseEvents.location,
      participantsActual: rseEventResults.participantsActual,
      wasteCollectedKg:   rseEventResults.wasteCollectedKg,
      treesPlanted:       rseEventResults.treesPlanted,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .where(and(
      sql`${rseEvents.date} >= ${yearStart}`,
      sql`${rseEvents.date} < ${yearEnd}`,
    ))
    .orderBy(rseEvents.date)

  const partnerships = await db
    .select({
      id:          rsePartnerships.id,
      partnerName: rsePartnerships.partnerName,
      partnerType: rsePartnerships.partnerType,
      status:      rsePartnerships.status,
      signedDate:  rsePartnerships.signedDate,
      endDate:     rsePartnerships.endDate,
    })
    .from(rsePartnerships)
    .where(eq(rsePartnerships.status, 'actif'))
    .orderBy(rsePartnerships.partnerName)

  const impact = await rseMetrics()

  return {
    year,
    events: events.map((e) => ({
      ...e,
      participantsActual: e.participantsActual ?? null,
      wasteCollectedKg:   e.wasteCollectedKg ? parseFloat(e.wasteCollectedKg) : null,
      treesPlanted:       e.treesPlanted ?? null,
    })),
    partnerships,
    impact,
  }
}
