import { db } from '../../../db/index'
import {
  maintenanceSchedules,
  maintenanceVisits,
  plantHealthRecords,
  clientSatisfaction,
  cloudinaryAssets,
  users,
  projects,
} from '../../../db/schema'
import { eq, and, desc, asc, sql, isNull } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VisitType =
  | 'taille'
  | 'arrosage'
  | 'traitement_phytosanitaire'
  | 'fertilisation'
  | 'controle_general'
  | 'other'

export type HealthStatus = 'healthy' | 'attention' | 'critical'

export type ScheduledVisitRow = {
  id: string
  projectId: string
  visitDate: Date
  visitType: string
  durationHours: string | null
  teamMemberId: string
  teamMemberName: string | null
  notes: string | null
  hasReport: boolean
  createdAt: Date
}

export type VisitReportRow = {
  id: string
  projectId: string
  visitDate: Date
  visitType: string
  durationHours: string | null
  teamMemberId: string
  teamMemberName: string | null
  workDone: string | null
  workChecklist: Record<string, boolean> | null
  productsUsed: ProductUsed[] | null
  issuesFound: string | null
  nextVisitRecommendation: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  ncId: string | null
  healthRecords: PlantHealthRow[]
  createdAt: Date
}

export type ProductUsed = {
  name: string
  quantity: number
  unit: string
  supplierId?: string
}

export type PlantHealthRow = {
  id: string
  visitId: string
  projectId: string
  zoneName: string
  healthStatus: string
  healthScore: number | null
  observations: string | null
  createdAt: Date
}

export type PlantHealthSummary = {
  zoneName: string
  currentStatus: string
  currentScore: number | null
  lastScores: { score: number | null; visitDate: Date; status: string }[]
  criticalConsecutive: number
}

export type VisitFrequencyType = 'journaliere' | 'hebdomadaire' | 'quinzaine'

export type ContractRow = {
  id: string
  projectId: string
  contractStartDate: Date | null
  contractEndDate: Date | null
  visitFrequency: string | null
  visitFrequencyType: VisitFrequencyType | null
  visitFrequencyDays: number | null
  monthlyCost: string | null
  contractAssetId: string | null
  contractAssetUrl: string | null
  isActive: boolean
  notes: string | null
  createdAt: Date
}

export type SatisfactionRow = {
  id: string
  projectId: string
  score: number
  comments: string | null
  recordedAt: Date
  recordedByName: string | null
}

// ─── Schedule queries ─────────────────────────────────────────────────────────

export async function getOrCreateDefaultSchedule(projectId: string, createdBy: string) {
  const [existing] = await db
    .select()
    .from(maintenanceSchedules)
    .where(and(eq(maintenanceSchedules.projectId, projectId), eq(maintenanceSchedules.isActive, true)))
    .orderBy(asc(maintenanceSchedules.createdAt))
    .limit(1)

  if (existing) return existing

  const [schedule] = await db
    .insert(maintenanceSchedules)
    .values({ projectId, isActive: true, createdBy })
    .returning()

  return schedule
}

export async function getContract(projectId: string): Promise<ContractRow | null> {
  const [row] = await db
    .select({
      id:                  maintenanceSchedules.id,
      projectId:           maintenanceSchedules.projectId,
      contractStartDate:   maintenanceSchedules.contractStartDate,
      contractEndDate:     maintenanceSchedules.contractEndDate,
      visitFrequency:      maintenanceSchedules.visitFrequency,
      visitFrequencyType:  maintenanceSchedules.visitFrequencyType,
      visitFrequencyDays:  maintenanceSchedules.visitFrequencyDays,
      monthlyCost:         maintenanceSchedules.monthlyCost,
      contractAssetId:     maintenanceSchedules.contractAssetId,
      contractAssetUrl:    cloudinaryAssets.secureUrl,
      isActive:            maintenanceSchedules.isActive,
      notes:               maintenanceSchedules.notes,
      createdAt:           maintenanceSchedules.createdAt,
    })
    .from(maintenanceSchedules)
    .leftJoin(cloudinaryAssets, eq(maintenanceSchedules.contractAssetId, cloudinaryAssets.id))
    .where(and(eq(maintenanceSchedules.projectId, projectId), eq(maintenanceSchedules.isActive, true)))
    .orderBy(asc(maintenanceSchedules.createdAt))
    .limit(1)

  return row as ContractRow | null
}

export async function upsertContract(input: {
  projectId:          string
  contractStartDate?: Date
  contractEndDate?:   Date
  visitFrequency?:    string
  visitFrequencyType?: VisitFrequencyType
  visitFrequencyDays?: number
  monthlyCost?:       string
  contractAssetId?:   string
  notes?:             string
  createdBy:          string
}) {
  const existing = await getContract(input.projectId)

  if (existing) {
    const [updated] = await db
      .update(maintenanceSchedules)
      .set({
        contractStartDate:  input.contractStartDate,
        contractEndDate:    input.contractEndDate,
        visitFrequency:     input.visitFrequency,
        visitFrequencyType: input.visitFrequencyType,
        visitFrequencyDays: input.visitFrequencyDays,
        monthlyCost:        input.monthlyCost,
        contractAssetId:    input.contractAssetId,
        notes:              input.notes,
        updatedAt:          new Date(),
      })
      .where(eq(maintenanceSchedules.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(maintenanceSchedules)
    .values({
      projectId:          input.projectId,
      contractStartDate:  input.contractStartDate,
      contractEndDate:    input.contractEndDate,
      visitFrequency:     input.visitFrequency,
      visitFrequencyType: input.visitFrequencyType,
      visitFrequencyDays: input.visitFrequencyDays,
      monthlyCost:        input.monthlyCost,
      contractAssetId:    input.contractAssetId,
      isActive:           true,
      notes:              input.notes,
      createdBy:          input.createdBy,
    })
    .returning()
  return created
}

// ─── Scheduled visits ─────────────────────────────────────────────────────────

export async function getScheduledVisits(projectId: string): Promise<ScheduledVisitRow[]> {
  const rows = await db
    .select({
      id:             maintenanceVisits.id,
      projectId:      maintenanceVisits.projectId,
      visitDate:      maintenanceVisits.visitDate,
      visitType:      maintenanceVisits.visitType,
      durationHours:  maintenanceVisits.durationHours,
      teamMemberId:   maintenanceVisits.teamMemberId,
      teamMemberName: users.name,
      notes:          maintenanceVisits.nextVisitRecommendation,
      workDone:       maintenanceVisits.workDone,
      createdAt:      maintenanceVisits.createdAt,
    })
    .from(maintenanceVisits)
    .leftJoin(users, eq(maintenanceVisits.teamMemberId, users.id))
    .where(eq(maintenanceVisits.projectId, projectId))
    .orderBy(asc(maintenanceVisits.visitDate))

  return rows.map((r) => ({
    ...r,
    hasReport: !!r.workDone,
  })) as ScheduledVisitRow[]
}

export async function createScheduledVisit(input: {
  projectId:     string
  visitDate:     Date
  visitType:     VisitType
  durationHours?: string
  teamMemberId:  string
  notes?:        string
  scheduleId:    string
  createdBy:     string
}) {
  const [visit] = await db
    .insert(maintenanceVisits)
    .values({
      projectId:               input.projectId,
      scheduleId:              input.scheduleId,
      visitDate:               input.visitDate,
      visitType:               input.visitType,
      durationHours:           input.durationHours,
      teamMemberId:            input.teamMemberId,
      nextVisitRecommendation: input.notes,
      createdBy:               input.createdBy,
    })
    .returning()
  return visit
}

// ─── Visit reports ────────────────────────────────────────────────────────────

export async function getVisitReports(projectId: string): Promise<VisitReportRow[]> {
  const visits = await db
    .select({
      id:                      maintenanceVisits.id,
      projectId:               maintenanceVisits.projectId,
      visitDate:               maintenanceVisits.visitDate,
      visitType:               maintenanceVisits.visitType,
      durationHours:           maintenanceVisits.durationHours,
      teamMemberId:            maintenanceVisits.teamMemberId,
      teamMemberName:          users.name,
      workDone:                maintenanceVisits.workDone,
      workChecklist:           maintenanceVisits.workChecklist,
      productsUsed:            maintenanceVisits.productsUsed,
      issuesFound:             maintenanceVisits.issuesFound,
      nextVisitRecommendation: maintenanceVisits.nextVisitRecommendation,
      beforePhotoAssetId:      maintenanceVisits.beforePhotoAssetId,
      afterPhotoAssetId:       maintenanceVisits.afterPhotoAssetId,
      ncId:                    maintenanceVisits.ncId,
      createdAt:               maintenanceVisits.createdAt,
    })
    .from(maintenanceVisits)
    .leftJoin(users, eq(maintenanceVisits.teamMemberId, users.id))
    .where(and(eq(maintenanceVisits.projectId, projectId), sql`${maintenanceVisits.workDone} IS NOT NULL`))
    .orderBy(desc(maintenanceVisits.visitDate))

  // Fetch photo URLs and health records for each visit
  const visitIds = visits.map((v) => v.id)
  const healthByVisit: Record<string, PlantHealthRow[]> = {}
  if (visitIds.length > 0) {
    const records = await db
      .select()
      .from(plantHealthRecords)
      .where(sql`${plantHealthRecords.visitId} = ANY(${sql.raw(`ARRAY['${visitIds.join("','")}']::uuid[]`)})`)
      .orderBy(asc(plantHealthRecords.zoneName))
    for (const r of records) {
      if (!healthByVisit[r.visitId]) healthByVisit[r.visitId] = []
      healthByVisit[r.visitId].push(r as PlantHealthRow)
    }
  }

  // Batch-fetch photo URLs
  const assetIds = [...new Set(visits.flatMap((v) => [v.beforePhotoAssetId, v.afterPhotoAssetId].filter(Boolean) as string[]))]
  const assetMap: Record<string, string> = {}
  if (assetIds.length > 0) {
    const assets = await db
      .select({ id: cloudinaryAssets.id, secureUrl: cloudinaryAssets.secureUrl })
      .from(cloudinaryAssets)
      .where(sql`${cloudinaryAssets.id} = ANY(${sql.raw(`ARRAY['${assetIds.join("','")}']::uuid[]`)})`)
    for (const a of assets) assetMap[a.id] = a.secureUrl
  }

  return visits.map((v) => ({
    ...v,
    workChecklist: v.workChecklist as Record<string, boolean> | null,
    productsUsed:  v.productsUsed  as ProductUsed[] | null,
    beforePhotoUrl: v.beforePhotoAssetId ? (assetMap[v.beforePhotoAssetId] ?? null) : null,
    afterPhotoUrl:  v.afterPhotoAssetId  ? (assetMap[v.afterPhotoAssetId] ?? null)  : null,
    healthRecords: healthByVisit[v.id] ?? [],
  })) as VisitReportRow[]
}

export async function saveVisitReport(input: {
  visitId?:                string  // update existing scheduled visit
  projectId:               string
  scheduleId:              string
  visitDate:               Date
  visitType:               VisitType
  durationHours?:          string
  teamMemberId:            string
  workDone:                string
  workChecklist:           Record<string, boolean>
  productsUsed:            ProductUsed[]
  issuesFound?:            string
  nextVisitRecommendation?: string
  beforePhotoAssetId?:     string
  afterPhotoAssetId?:      string
  healthZones:             { zoneName: string; healthStatus: HealthStatus; healthScore: number; observations?: string }[]
  createdBy:               string
}) {
  let visitId = input.visitId

  if (visitId) {
    // Update the scheduled visit with report data
    await db
      .update(maintenanceVisits)
      .set({
        workDone:                input.workDone,
        workChecklist:           input.workChecklist,
        productsUsed:            input.productsUsed as unknown as typeof maintenanceVisits.$inferInsert['productsUsed'],
        issuesFound:             input.issuesFound,
        nextVisitRecommendation: input.nextVisitRecommendation,
        beforePhotoAssetId:      input.beforePhotoAssetId,
        afterPhotoAssetId:       input.afterPhotoAssetId,
        durationHours:           input.durationHours,
        updatedAt:               new Date(),
      })
      .where(eq(maintenanceVisits.id, visitId))
  } else {
    // Create a new standalone visit + report
    const [visit] = await db
      .insert(maintenanceVisits)
      .values({
        projectId:               input.projectId,
        scheduleId:              input.scheduleId,
        visitDate:               input.visitDate,
        visitType:               input.visitType,
        durationHours:           input.durationHours,
        teamMemberId:            input.teamMemberId,
        workDone:                input.workDone,
        workChecklist:           input.workChecklist,
        productsUsed:            input.productsUsed as unknown as typeof maintenanceVisits.$inferInsert['productsUsed'],
        issuesFound:             input.issuesFound,
        nextVisitRecommendation: input.nextVisitRecommendation,
        beforePhotoAssetId:      input.beforePhotoAssetId,
        afterPhotoAssetId:       input.afterPhotoAssetId,
        createdBy:               input.createdBy,
      })
      .returning()
    visitId = visit.id
  }

  // Upsert plant health records per zone
  if (input.healthZones.length > 0) {
    await db.delete(plantHealthRecords).where(eq(plantHealthRecords.visitId, visitId))
    await db.insert(plantHealthRecords).values(
      input.healthZones.map((z) => ({
        visitId,
        projectId:    input.projectId,
        zoneName:     z.zoneName,
        healthStatus: z.healthStatus,
        healthScore:  z.healthScore,
        observations: z.observations ?? null,
        createdBy:    input.createdBy,
      }))
    )
  }

  return visitId
}

// ─── Plant health tracker ─────────────────────────────────────────────────────

export async function getPlantHealthSummary(projectId: string): Promise<PlantHealthSummary[]> {
  // Fetch all health records for this project ordered by zone + visit date
  const records = await db
    .select({
      zoneName:     plantHealthRecords.zoneName,
      healthStatus: plantHealthRecords.healthStatus,
      healthScore:  plantHealthRecords.healthScore,
      visitDate:    maintenanceVisits.visitDate,
    })
    .from(plantHealthRecords)
    .leftJoin(maintenanceVisits, eq(plantHealthRecords.visitId, maintenanceVisits.id))
    .where(eq(plantHealthRecords.projectId, projectId))
    .orderBy(asc(plantHealthRecords.zoneName), desc(maintenanceVisits.visitDate))

  // Group by zone
  const byZone = new Map<string, typeof records>()
  for (const r of records) {
    if (!byZone.has(r.zoneName)) byZone.set(r.zoneName, [])
    byZone.get(r.zoneName)!.push(r)
  }

  return Array.from(byZone.entries()).map(([zoneName, recs]) => {
    const latest = recs[0]
    const last5  = recs.slice(0, 5)

    // Count consecutive critical visits from most recent
    let criticalConsecutive = 0
    for (const r of recs) {
      if (r.healthStatus === 'critical') criticalConsecutive++
      else break
    }

    return {
      zoneName,
      currentStatus: latest?.healthStatus ?? 'healthy',
      currentScore:  latest?.healthScore  ?? null,
      lastScores:    last5.map((r) => ({
        score:     r.healthScore,
        visitDate: r.visitDate!,
        status:    r.healthStatus,
      })),
      criticalConsecutive,
    }
  })
}

// ─── Client satisfaction ──────────────────────────────────────────────────────

export async function getSatisfactionRecords(projectId: string): Promise<SatisfactionRow[]> {
  const rows = await db
    .select({
      id:             clientSatisfaction.id,
      projectId:      clientSatisfaction.projectId,
      score:          clientSatisfaction.score,
      comments:       clientSatisfaction.comments,
      recordedAt:     clientSatisfaction.recordedAt,
      recordedByName: users.name,
    })
    .from(clientSatisfaction)
    .leftJoin(users, eq(clientSatisfaction.recordedBy, users.id))
    .where(eq(clientSatisfaction.projectId, projectId))
    .orderBy(desc(clientSatisfaction.recordedAt))

  return rows as SatisfactionRow[]
}

export async function saveSatisfaction(input: {
  projectId:  string
  score:      number
  comments?:  string
  recordedBy: string
  createdBy:  string
}) {
  const [row] = await db
    .insert(clientSatisfaction)
    .values({
      projectId:  input.projectId,
      score:      input.score,
      comments:   input.comments,
      recordedBy: input.recordedBy,
      isoClause:  '9.1.2',
      createdBy:  input.createdBy,
    })
    .returning()
  return row
}

// ─── Upcoming visits (for reminder cron) ────────────────────────────────────

export async function getVisitsIn24h() {
  const from = new Date()
  const to   = new Date(Date.now() + 25 * 60 * 60 * 1000) // 24h + 1h buffer

  return db
    .select({
      id:          maintenanceVisits.id,
      projectId:   maintenanceVisits.projectId,
      projectName: projects.name,
      projectRef:  projects.reference,
      clientName:  projects.clientName,
      siteAddress: projects.siteAddress,
      visitDate:   maintenanceVisits.visitDate,
      visitType:   maintenanceVisits.visitType,
      durationHours: maintenanceVisits.durationHours,
      teamMemberId: maintenanceVisits.teamMemberId,
      teamEmail:   users.email,
      teamName:    users.name,
      notes:       maintenanceVisits.nextVisitRecommendation,
    })
    .from(maintenanceVisits)
    .leftJoin(projects, eq(maintenanceVisits.projectId, projects.id))
    .leftJoin(users,    eq(maintenanceVisits.teamMemberId, users.id))
    .where(
      and(
        sql`${maintenanceVisits.visitDate} >= ${from}`,
        sql`${maintenanceVisits.visitDate} <= ${to}`,
        sql`${maintenanceVisits.workDone} IS NULL`  // not yet reported
      )
    )
}

// ─── All visits across projects (for unified calendar) ────────────────────────

export async function getAllMaintenanceVisits() {
  return db
    .select({
      id:          maintenanceVisits.id,
      visitDate:   maintenanceVisits.visitDate,
      visitType:   maintenanceVisits.visitType,
      projectId:   maintenanceVisits.projectId,
      projectName: projects.name,
    })
    .from(maintenanceVisits)
    .leftJoin(projects, eq(maintenanceVisits.projectId, projects.id))
    .orderBy(asc(maintenanceVisits.visitDate))
}
