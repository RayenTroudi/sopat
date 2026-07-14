import { db } from '../../../db/index'
import {
  rseEvents,
  rseEventResults,
  rsePartnerships,
  rsePartnershipCommitments,
  rseEventLogistics,
  wasteRecords,
  hseChecklistSubmissions,
  hseChecklistAnswers,
  trainingSessions,
  trainingParticipants,
  leaveRequests,
  nonConformances,
  users,
  plantListItems,
  portfolioSettings,
} from '../../../db/schema'
import { eq, and, gte, lt, lte, sql, count, isNull, isNotNull, inArray, desc } from 'drizzle-orm'

// ─── Return types ──────────────────────────────────────────────────────────────

export type RseDashboardData = {
  meta: {
    rseLabelLevel: string | null
    rseLabelExpiry: string | null
    isoCertNumber: string | null
    isoCertExpiry: string | null
    reportYear: number
  }

  // Environmental pillar
  environmental: {
    // RSE event results (all-time totals)
    totalWasteKg: number
    totalTrees: number
    totalParticipants: number
    totalBeachCleanedM: number
    totalZonesTreated: number
    totalSocialMediaReach: number
    totalPressArticles: number
    mediaCoverageCount: number
    avgSatisfaction: number | null

    // Event summary
    totalEvents: number
    completedEvents: number
    eventsByType: Array<{ eventType: string; count: number }>

    // Yearly trends (last 5 years)
    yearlyTrends: Array<{
      year: number
      wasteKg: number
      trees: number
      participants: number
      eventCount: number
      beachCleanedM: number
    }>

    // Internal waste tracking
    wasteByType: Array<{ wasteType: string; totalKg: number; cost: number }>
    wasteMonthlyCurrent: Array<{ month: number; totalKg: number }>

    // Plant counts (green infrastructure)
    totalTreesInProjects: number
    totalPlantsInProjects: number

    // RSE investment
    totalEventInvestment: number
  }

  // Social pillar
  social: {
    totalActiveEmployees: number
    internalAuditorsCount: number

    // Training
    trainingSessions: number
    trainingParticipants: number
    trainingCompletion: number // %
    avgHotEvalScore: number | null

    // Training by year (last 3 years)
    trainingByYear: Array<{ year: number; sessions: number; participants: number }>

    // Leave
    totalLeaveDays: number
    leaveByType: Array<{ leaveType: string; totalDays: number; count: number }>

    // NCs closed
    ncsClosedRate: number // %
    totalNcs: number
    closedNcs: number

    // HSE compliance rate
    hseComplianceRate: number | null
    hseSubmissionsCount: number

    // Staff engagement
    totalSuggestions: number
    respondedSuggestions: number
  }

  // Partnership / community pillar
  partnerships: {
    activePartnerships: number
    totalPartnerships: number
    partnersByType: Array<{ partnerType: string; count: number }>
    totalCommitments: number
    fulfilledCommitments: number
    overdueCommitments: number
    fulfillmentRate: number // %
    topPartners: Array<{ partnerName: string; partnerType: string; status: string }>
  }

  // Locations breakdown
  locations: Array<{
    location: string
    eventCount: number
    totalParticipants: number
    totalWasteKg: number
  }>

  // Recent events
  recentEvents: Array<{
    id: string
    title: string
    date: Date | string
    eventType: string
    participants: number | null
    wasteKg: number | null
    trees: number | null
  }>
}

// ─── Main query ────────────────────────────────────────────────────────────────

export async function getRseDashboardData(year?: number): Promise<RseDashboardData> {
  const reportYear = year ?? new Date().getFullYear()

  const [
    portfolio,
    eventTotals,
    eventCounts,
    eventsByType,
    yearlyTrends,
    wasteByType,
    wasteMonthlyCurrent,
    logisticsCost,
    plantCounts,
    partnershipStats,
    partnersByType,
    commitmentStats,
    topPartners,
    locations,
    recentEvents,
    employeeStats,
    trainingStats,
    trainingByYear,
    leaveStats,
    leaveByType,
    ncStats,
    hseStats,
  ] = await Promise.all([
    // Portfolio settings (RSE label)
    db.select({
      rseLabelLevel: portfolioSettings.rseLabelLevel,
      rseLabelExpiry: portfolioSettings.rseLabelExpiry,
      isoCertNumber: portfolioSettings.isoCertNumber,
      isoCertExpiry: portfolioSettings.isoCertExpiry,
    }).from(portfolioSettings).limit(1),

    // RSE event results totals (all-time)
    db.select({
      totalWasteKg:        sql<number>`COALESCE(SUM(${rseEventResults.wasteCollectedKg}), 0)`,
      totalTrees:          sql<number>`COALESCE(SUM(${rseEventResults.treesPlanted}), 0)`,
      totalParticipants:   sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)`,
      totalBeachM:         sql<number>`COALESCE(SUM(${rseEventResults.beachLengthCleanedM}), 0)`,
      totalZones:          sql<number>`COALESCE(SUM(${rseEventResults.zonesTreated}), 0)`,
      totalSocialReach:    sql<number>`COALESCE(SUM(${rseEventResults.socialMediaReach}), 0)`,
      totalPressArticles:  sql<number>`COALESCE(SUM(${rseEventResults.pressArticlesCount}), 0)`,
      mediaCoverage:       sql<number>`COUNT(*) FILTER (WHERE ${rseEventResults.mediaCoverage} = true)`,
      avgSatisfaction:     sql<number | null>`ROUND(AVG(${rseEventResults.satisfactionScore}), 1)`,
    }).from(rseEventResults),

    // Event counts (all statuses)
    db.select({
      total:     sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE status = 'termine')`,
    }).from(rseEvents),

    // Events by type
    db.select({
      eventType: rseEvents.eventType,
      count: sql<number>`COUNT(*)`,
    }).from(rseEvents).groupBy(rseEvents.eventType),

    // Yearly trends (last 5 years)
    db.select({
      year:        sql<number>`EXTRACT(YEAR FROM ${rseEvents.date})::int`,
      wasteKg:     sql<number>`COALESCE(SUM(${rseEventResults.wasteCollectedKg}), 0)`,
      trees:       sql<number>`COALESCE(SUM(${rseEventResults.treesPlanted}), 0)`,
      participants: sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)`,
      eventCount:  sql<number>`COUNT(${rseEvents.id})`,
      beachCleanedM: sql<number>`COALESCE(SUM(${rseEventResults.beachLengthCleanedM}), 0)`,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .where(and(
      gte(rseEvents.date, new Date(reportYear - 4, 0, 1)),
      lte(rseEvents.date, new Date(reportYear, 11, 31)),
    ))
    .groupBy(sql`EXTRACT(YEAR FROM ${rseEvents.date})::int`)
    .orderBy(sql`EXTRACT(YEAR FROM ${rseEvents.date})::int`),

    // Internal waste by type (all records)
    db.select({
      wasteType: wasteRecords.wasteType,
      totalKg:   sql<number>`COALESCE(SUM(${wasteRecords.quantityKg}), 0)`,
      cost:      sql<number>`COALESCE(SUM(CAST(${wasteRecords.cost} AS numeric)), 0)`,
    }).from(wasteRecords).groupBy(wasteRecords.wasteType).orderBy(sql`SUM(${wasteRecords.quantityKg}) DESC`),

    // Waste monthly current year
    db.select({
      month:   wasteRecords.month,
      totalKg: sql<number>`COALESCE(SUM(${wasteRecords.quantityKg}), 0)`,
    })
    .from(wasteRecords)
    .where(eq(wasteRecords.year, reportYear))
    .groupBy(wasteRecords.month)
    .orderBy(wasteRecords.month),

    // Event logistics total cost
    db.select({
      total: sql<number>`COALESCE(SUM(CAST(${rseEventLogistics.cost} AS numeric)), 0)`,
    }).from(rseEventLogistics),

    // Plant counts from projects
    db.select({
      trees:  sql<number>`COALESCE(SUM(CASE WHEN category IN ('tree', 'palm') THEN quantity ELSE 0 END), 0)`,
      plants: sql<number>`COALESCE(SUM(quantity), 0)`,
    }).from(plantListItems),

    // Partnership totals
    db.select({
      total:  sql<number>`COUNT(*)`,
      active: sql<number>`COUNT(*) FILTER (WHERE status = 'actif')`,
    }).from(rsePartnerships),

    // Partners by type
    db.select({
      partnerType: rsePartnerships.partnerType,
      count: sql<number>`COUNT(*)`,
    }).from(rsePartnerships).groupBy(rsePartnerships.partnerType),

    // Commitment stats
    db.select({
      total:    sql<number>`COUNT(*)`,
      fulfilled: sql<number>`COUNT(*) FILTER (WHERE status = 'respecte')`,
      overdue:  sql<number>`COUNT(*) FILTER (WHERE status = 'en_retard')`,
    }).from(rsePartnershipCommitments),

    // Top 5 active partners
    db.select({
      partnerName: rsePartnerships.partnerName,
      partnerType: rsePartnerships.partnerType,
      status:      rsePartnerships.status,
    }).from(rsePartnerships).where(eq(rsePartnerships.status, 'actif')).limit(5),

    // Locations breakdown
    db.select({
      location:         rseEvents.location,
      eventCount:       sql<number>`COUNT(${rseEvents.id})`,
      totalParticipants: sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)`,
      totalWasteKg:     sql<number>`COALESCE(SUM(${rseEventResults.wasteCollectedKg}), 0)`,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .groupBy(rseEvents.location)
    .orderBy(desc(sql`COUNT(${rseEvents.id})`))
    .limit(10),

    // Recent 12 completed events
    db.select({
      id:           rseEvents.id,
      title:        rseEvents.title,
      date:         rseEvents.date,
      eventType:    rseEvents.eventType,
      participants: rseEventResults.participantsActual,
      wasteKg:      rseEventResults.wasteCollectedKg,
      trees:        rseEventResults.treesPlanted,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .where(eq(rseEvents.status, 'termine' as never))
    .orderBy(desc(rseEvents.date))
    .limit(12),

    // Employee stats
    db.select({
      total:    sql<number>`COUNT(*) FILTER (WHERE ${users.isActive} = true AND deleted_at IS NULL)`,
      auditors: sql<number>`COUNT(*) FILTER (WHERE ${users.isInternalAuditor} = true AND ${users.isActive} = true)`,
    }).from(users),

    // Training stats
    db.select({
      sessions:    sql<number>`COUNT(DISTINCT ${trainingSessions.id})`,
      participants: sql<number>`COUNT(${trainingParticipants.id})`,
      attended:    sql<number>`COUNT(*) FILTER (WHERE ${trainingParticipants.attended} = true)`,
      avgHotScore: sql<number | null>`ROUND(AVG(CAST(${trainingParticipants.hotEvalScore} AS numeric)), 1)`,
    })
    .from(trainingSessions)
    .leftJoin(trainingParticipants, eq(trainingParticipants.trainingSessionId, trainingSessions.id))
    .where(eq(trainingSessions.status, 'realise' as never)),

    // Training by year (last 3 years)
    db.select({
      year:        trainingSessions.year,
      sessions:    sql<number>`COUNT(DISTINCT ${trainingSessions.id})`,
      participants: sql<number>`COUNT(${trainingParticipants.id})`,
    })
    .from(trainingSessions)
    .leftJoin(trainingParticipants, eq(trainingParticipants.trainingSessionId, trainingSessions.id))
    .where(and(
      eq(trainingSessions.status, 'realise' as never),
      gte(trainingSessions.year, reportYear - 2),
    ))
    .groupBy(trainingSessions.year)
    .orderBy(trainingSessions.year),

    // Leave stats (approved this year)
    // start_date est une colonne `date` — elle exige un littéral YYYY-MM-DD,
    // pas une simple année ('2026' est rejeté par Postgres : "invalid input
    // syntax for type date").
    db.select({
      totalDays: sql<number>`COALESCE(SUM(CAST(${leaveRequests.durationDays} AS numeric)), 0)`,
    })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.status, 'approuve' as never),
      gte(leaveRequests.startDate, `${reportYear}-01-01`),
      lt(leaveRequests.startDate, `${reportYear + 1}-01-01`),
    )),

    // Leave by type (approved, current year)
    db.select({
      leaveType:  leaveRequests.leaveType,
      totalDays:  sql<number>`COALESCE(SUM(CAST(${leaveRequests.durationDays} AS numeric)), 0)`,
      count:      sql<number>`COUNT(*)`,
    })
    .from(leaveRequests)
    .where(eq(leaveRequests.status, 'approuve' as never))
    .groupBy(leaveRequests.leaveType)
    .orderBy(desc(sql`SUM(CAST(${leaveRequests.durationDays} AS numeric))`)),

    // NC stats (all time)
    db.select({
      total:  sql<number>`COUNT(*)`,
      closed: sql<number>`COUNT(*) FILTER (WHERE status IN ('closed', 'verified'))`,
    }).from(nonConformances),

    // HSE compliance rate
    db.select({
      total:    sql<number>`COUNT(*)`,
      compliant: sql<number>`COUNT(*) FILTER (WHERE overall_status = 'conforme')`,
    }).from(hseChecklistSubmissions),
  ])

  const p0 = portfolio[0]
  const et = eventTotals[0]
  const ec = eventCounts[0]
  const emp = employeeStats[0]
  const tr = trainingStats[0]
  const lv = leaveStats[0]
  const nc = ncStats[0]
  const hse = hseStats[0]
  const ls = logisticsCost[0]
  const pc = plantCounts[0]
  const pp = partnershipStats[0]
  const cm = commitmentStats[0]

  const totalNcs = Number(nc?.total ?? 0)
  const closedNcs = Number(nc?.closed ?? 0)
  const totalHse = Number(hse?.total ?? 0)
  const compliantHse = Number(hse?.compliant ?? 0)
  const trTotal = Number(tr?.participants ?? 0)
  const trAttended = Number(tr?.attended ?? 0)
  const totalCommitments = Number(cm?.total ?? 0)
  const fulfilledCommitments = Number(cm?.fulfilled ?? 0)
  const overdueCommitments = Number(cm?.overdue ?? 0)

  return {
    meta: {
      rseLabelLevel:  p0?.rseLabelLevel ?? null,
      rseLabelExpiry: p0?.rseLabelExpiry ? String(p0.rseLabelExpiry) : null,
      isoCertNumber:  p0?.isoCertNumber ?? null,
      isoCertExpiry:  p0?.isoCertExpiry ? String(p0.isoCertExpiry) : null,
      reportYear,
    },

    environmental: {
      totalWasteKg:        Number(et?.totalWasteKg ?? 0),
      totalTrees:          Number(et?.totalTrees ?? 0),
      totalParticipants:   Number(et?.totalParticipants ?? 0),
      totalBeachCleanedM:  Number(et?.totalBeachM ?? 0),
      totalZonesTreated:   Number(et?.totalZones ?? 0),
      totalSocialMediaReach: Number(et?.totalSocialReach ?? 0),
      totalPressArticles:  Number(et?.totalPressArticles ?? 0),
      mediaCoverageCount:  Number(et?.mediaCoverage ?? 0),
      avgSatisfaction:     et?.avgSatisfaction != null ? Number(et.avgSatisfaction) : null,
      totalEvents:         Number(ec?.total ?? 0),
      completedEvents:     Number(ec?.completed ?? 0),
      eventsByType: eventsByType.map((r) => ({
        eventType: String(r.eventType),
        count: Number(r.count),
      })),
      yearlyTrends: yearlyTrends.map((r) => ({
        year:          Number(r.year),
        wasteKg:       Number(r.wasteKg),
        trees:         Number(r.trees),
        participants:  Number(r.participants),
        eventCount:    Number(r.eventCount),
        beachCleanedM: Number(r.beachCleanedM),
      })),
      wasteByType: wasteByType.map((r) => ({
        wasteType: String(r.wasteType),
        totalKg:   Number(r.totalKg),
        cost:      Number(r.cost),
      })),
      wasteMonthlyCurrent: wasteMonthlyCurrent.map((r) => ({
        month:   Number(r.month),
        totalKg: Number(r.totalKg),
      })),
      totalTreesInProjects:  Number(pc?.trees ?? 0),
      totalPlantsInProjects: Number(pc?.plants ?? 0),
      totalEventInvestment:  Number(ls?.total ?? 0),
    },

    social: {
      totalActiveEmployees:  Number(emp?.total ?? 0),
      internalAuditorsCount: Number(emp?.auditors ?? 0),
      trainingSessions:      Number(tr?.sessions ?? 0),
      trainingParticipants:  trTotal,
      trainingCompletion:    trTotal > 0 ? Math.round((trAttended / trTotal) * 100) : 0,
      avgHotEvalScore:       tr?.avgHotScore != null ? Number(tr.avgHotScore) : null,
      trainingByYear: trainingByYear.map((r) => ({
        year:         Number(r.year),
        sessions:     Number(r.sessions),
        participants: Number(r.participants),
      })),
      totalLeaveDays: Number(lv?.totalDays ?? 0),
      leaveByType: leaveByType.map((r) => ({
        leaveType:  String(r.leaveType),
        totalDays:  Number(r.totalDays),
        count:      Number(r.count),
      })),
      ncsClosedRate:      totalNcs > 0 ? Math.round((closedNcs / totalNcs) * 100) : 0,
      totalNcs,
      closedNcs,
      hseComplianceRate:  totalHse > 0 ? Math.round((compliantHse / totalHse) * 100) : null,
      hseSubmissionsCount: totalHse,
      totalSuggestions:   0,
      respondedSuggestions: 0,
    },

    partnerships: {
      activePartnerships: Number(pp?.active ?? 0),
      totalPartnerships:  Number(pp?.total ?? 0),
      partnersByType: partnersByType.map((r) => ({
        partnerType: String(r.partnerType),
        count: Number(r.count),
      })),
      totalCommitments,
      fulfilledCommitments,
      overdueCommitments,
      fulfillmentRate: totalCommitments > 0
        ? Math.round((fulfilledCommitments / totalCommitments) * 100)
        : 0,
      topPartners: topPartners.map((r) => ({
        partnerName: String(r.partnerName),
        partnerType: String(r.partnerType),
        status:      String(r.status),
      })),
    },

    locations: locations.map((r) => ({
      location:         String(r.location),
      eventCount:       Number(r.eventCount),
      totalParticipants: Number(r.totalParticipants),
      totalWasteKg:     Number(r.totalWasteKg),
    })),

    recentEvents: recentEvents.map((r) => ({
      id:           String(r.id),
      title:        String(r.title),
      date:         r.date,
      eventType:    String(r.eventType),
      participants: r.participants != null ? Number(r.participants) : null,
      wasteKg:      r.wasteKg != null ? Number(r.wasteKg) : null,
      trees:        r.trees != null ? Number(r.trees) : null,
    })),
  }
}
