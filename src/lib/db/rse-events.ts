import { db } from '../../../db/index'
import {
  rseEvents,
  rseEventTeams,
  rseEventLogistics,
  rseEventRetroplanning,
  rseEventCommunicationPlan,
  rseEventResults,
  rsePartnerships,
  users,
  cloudinaryAssets,
} from '../../../db/schema'
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm'

// ─── Reference generation ─────────────────────────────────────────────────────

export async function generateEventReference(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `EVT-${year}-`
  const [row] = await db
    .select({ ref: rseEvents.eventReference })
    .from(rseEvents)
    .where(sql`event_reference LIKE ${prefix + '%'}`)
    .orderBy(desc(rseEvents.eventReference))
    .limit(1)

  if (!row) return `${prefix}001`
  const last = parseInt(row.ref.split('-')[2] ?? '0', 10)
  return `${prefix}${String(last + 1).padStart(3, '0')}`
}

// ─── Event list / detail ──────────────────────────────────────────────────────

export async function listRseEvents(filters?: {
  type?: string
  status?: string
  year?: number
}) {
  const rows = await db
    .select({
      id: rseEvents.id,
      eventReference: rseEvents.eventReference,
      title: rseEvents.title,
      eventType: rseEvents.eventType,
      date: rseEvents.date,
      location: rseEvents.location,
      status: rseEvents.status,
      participantCountPlanned: rseEvents.participantCountPlanned,
      participantCountActual: rseEvents.participantCountActual,
      partnerId: rseEvents.partnerId,
      partnerName: rsePartnerships.partnerName,
      coordinatorId: rseEvents.sopatCoordinatorId,
      coordinatorName: users.name,
      createdAt: rseEvents.createdAt,
    })
    .from(rseEvents)
    .leftJoin(rsePartnerships, eq(rseEvents.partnerId, rsePartnerships.id))
    .leftJoin(users, eq(rseEvents.sopatCoordinatorId, users.id))
    .orderBy(desc(rseEvents.date))

  return rows.filter((r) => {
    if (filters?.type && r.eventType !== filters.type) return false
    if (filters?.status && r.status !== filters.status) return false
    if (filters?.year && new Date(r.date).getFullYear() !== filters.year) return false
    return true
  })
}

export async function getRseEvent(id: string) {
  const [event] = await db
    .select({
      id: rseEvents.id,
      eventReference: rseEvents.eventReference,
      title: rseEvents.title,
      eventType: rseEvents.eventType,
      date: rseEvents.date,
      location: rseEvents.location,
      status: rseEvents.status,
      participantCountPlanned: rseEvents.participantCountPlanned,
      participantCountActual: rseEvents.participantCountActual,
      partnerId: rseEvents.partnerId,
      partnerName: rsePartnerships.partnerName,
      sopatCoordinatorId: rseEvents.sopatCoordinatorId,
      coordinatorName: users.name,
      notes: rseEvents.notes,
      createdAt: rseEvents.createdAt,
      updatedAt: rseEvents.updatedAt,
      createdBy: rseEvents.createdBy,
    })
    .from(rseEvents)
    .leftJoin(rsePartnerships, eq(rseEvents.partnerId, rsePartnerships.id))
    .leftJoin(users, eq(rseEvents.sopatCoordinatorId, users.id))
    .where(eq(rseEvents.id, id))
    .limit(1)

  return event ?? null
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createRseEvent(data: {
  title: string
  eventType: string
  date: Date
  location: string
  partnerId?: string | null
  participantCountPlanned?: number | null
  sopatCoordinatorId: string
  notes?: string | null
  createdBy: string
}) {
  const eventReference = await generateEventReference()
  const [event] = await db
    .insert(rseEvents)
    .values({
      eventReference,
      title: data.title,
      eventType: data.eventType as never,
      date: data.date,
      location: data.location,
      partnerId: data.partnerId ?? null,
      participantCountPlanned: data.participantCountPlanned ?? null,
      sopatCoordinatorId: data.sopatCoordinatorId,
      notes: data.notes ?? null,
      createdBy: data.createdBy,
    })
    .returning()
  return event
}

export async function updateRseEvent(
  id: string,
  data: Partial<{
    title: string
    eventType: string
    date: Date
    location: string
    partnerId: string | null
    status: string
    participantCountPlanned: number | null
    participantCountActual: number | null
    sopatCoordinatorId: string
    notes: string | null
  }>
) {
  const [updated] = await db
    .update(rseEvents)
    .set(Object.assign({}, data, { updatedAt: new Date() }) as never)
    .where(eq(rseEvents.id, id))
    .returning()
  return updated
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getEventTeams(eventId: string) {
  return db
    .select({
      id: rseEventTeams.id,
      teamName: rseEventTeams.teamName,
      teamLeaderId: rseEventTeams.teamLeaderId,
      leaderName: users.name,
      missions: rseEventTeams.missions,
      notes: rseEventTeams.notes,
    })
    .from(rseEventTeams)
    .leftJoin(users, eq(rseEventTeams.teamLeaderId, users.id))
    .where(eq(rseEventTeams.eventId, eventId))
}

export async function upsertEventTeams(
  eventId: string,
  teams: Array<{
    teamName: string
    teamLeaderId?: string | null
    missions?: string[]
    notes?: string | null
  }>,
  createdBy: string
) {
  await db.delete(rseEventTeams).where(eq(rseEventTeams.eventId, eventId))
  if (teams.length === 0) return []
  return db
    .insert(rseEventTeams)
    .values(
      teams.map((t) => ({
        eventId,
        teamName: t.teamName as never,
        teamLeaderId: t.teamLeaderId ?? null,
        missions: t.missions ?? null,
        notes: t.notes ?? null,
        createdBy,
      }))
    )
    .returning()
}

// ─── Logistics ────────────────────────────────────────────────────────────────

export async function getEventLogistics(eventId: string) {
  return db
    .select()
    .from(rseEventLogistics)
    .where(eq(rseEventLogistics.eventId, eventId))
    .orderBy(rseEventLogistics.category, rseEventLogistics.itemName)
}

export async function upsertEventLogistics(
  eventId: string,
  items: Array<{
    id?: string
    category: string
    itemName: string
    quantityPlanned?: number | null
    quantityActual?: number | null
    unit?: string | null
    supplier?: string | null
    cost?: string | null
    notes?: string | null
  }>,
  createdBy: string
) {
  await db.delete(rseEventLogistics).where(eq(rseEventLogistics.eventId, eventId))
  if (items.length === 0) return []
  return db
    .insert(rseEventLogistics)
    .values(
      items.map((i) => ({
        eventId,
        category: i.category as never,
        itemName: i.itemName,
        quantityPlanned: i.quantityPlanned ?? null,
        quantityActual: i.quantityActual ?? null,
        unit: i.unit ?? null,
        supplier: i.supplier ?? null,
        cost: i.cost ?? null,
        notes: i.notes ?? null,
        createdBy,
      }))
    )
    .returning()
}

// ─── Retroplanning ────────────────────────────────────────────────────────────

export async function getEventRetroplanning(eventId: string) {
  return db
    .select()
    .from(rseEventRetroplanning)
    .where(eq(rseEventRetroplanning.eventId, eventId))
    .orderBy(rseEventRetroplanning.deadline)
}

export async function upsertEventRetroplanning(
  eventId: string,
  tasks: Array<{
    taskDescription: string
    deadline?: Date | null
    assignedTeam?: string | null
    status?: string
    notes?: string | null
  }>,
  createdBy: string
) {
  await db.delete(rseEventRetroplanning).where(eq(rseEventRetroplanning.eventId, eventId))
  if (tasks.length === 0) return []
  return db
    .insert(rseEventRetroplanning)
    .values(
      tasks.map((t) => ({
        eventId,
        taskDescription: t.taskDescription,
        deadline: t.deadline ?? null,
        assignedTeam: (t.assignedTeam ?? null) as never,
        status: (t.status ?? 'a_faire') as never,
        notes: t.notes ?? null,
        createdBy,
      }))
    )
    .returning()
}

export async function updateRetroTask(
  taskId: string,
  data: { status?: string; completedAt?: Date | null }
) {
  const [updated] = await db
    .update(rseEventRetroplanning)
    .set(Object.assign({}, data, { updatedAt: new Date() }) as never)
    .where(eq(rseEventRetroplanning.id, taskId))
    .returning()
  return updated
}

// ─── Communication plan ───────────────────────────────────────────────────────

export async function getEventCommunicationPlan(eventId: string) {
  return db
    .select({
      id: rseEventCommunicationPlan.id,
      phase: rseEventCommunicationPlan.phase,
      actionDescription: rseEventCommunicationPlan.actionDescription,
      channel: rseEventCommunicationPlan.channel,
      responsibleId: rseEventCommunicationPlan.responsibleId,
      responsibleName: users.name,
      status: rseEventCommunicationPlan.status,
      publishedAt: rseEventCommunicationPlan.publishedAt,
      assetCloudinaryId: rseEventCommunicationPlan.assetCloudinaryId,
      notes: rseEventCommunicationPlan.notes,
    })
    .from(rseEventCommunicationPlan)
    .leftJoin(users, eq(rseEventCommunicationPlan.responsibleId, users.id))
    .where(eq(rseEventCommunicationPlan.eventId, eventId))
    .orderBy(rseEventCommunicationPlan.phase)
}

export async function upsertEventCommunicationPlan(
  eventId: string,
  actions: Array<{
    phase: string
    actionDescription: string
    channel: string
    responsibleId?: string | null
    status?: string
    notes?: string | null
  }>,
  createdBy: string
) {
  await db
    .delete(rseEventCommunicationPlan)
    .where(eq(rseEventCommunicationPlan.eventId, eventId))
  if (actions.length === 0) return []
  return db
    .insert(rseEventCommunicationPlan)
    .values(
      actions.map((a) => ({
        eventId,
        phase: a.phase as never,
        actionDescription: a.actionDescription,
        channel: a.channel as never,
        responsibleId: a.responsibleId ?? null,
        status: (a.status ?? 'planifie') as never,
        notes: a.notes ?? null,
        createdBy,
      }))
    )
    .returning()
}

export async function updateCommunicationAction(
  actionId: string,
  data: { status?: string; publishedAt?: Date | null; assetCloudinaryId?: string | null }
) {
  const [updated] = await db
    .update(rseEventCommunicationPlan)
    .set(Object.assign({}, data, { updatedAt: new Date() }) as never)
    .where(eq(rseEventCommunicationPlan.id, actionId))
    .returning()
  return updated
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function getEventResults(eventId: string) {
  const [results] = await db
    .select()
    .from(rseEventResults)
    .where(eq(rseEventResults.eventId, eventId))
    .limit(1)
  return results ?? null
}

export async function upsertEventResults(
  eventId: string,
  data: {
    wasteCollectedKg?: string | null
    treesPlanted?: number | null
    participantsActual?: number | null
    beachLengthCleanedM?: string | null
    zonesTreated?: number | null
    mediaCoverage?: boolean
    pressArticlesCount?: number | null
    socialMediaReach?: number | null
    satisfactionScore?: number | null
    lessonsLearned?: string | null
    postEventReportCloudinaryId?: string | null
    photosAlbumCloudinaryIds?: string[]
  },
  submittedBy: string,
  createdBy: string
) {
  const existing = await getEventResults(eventId)
  if (existing) {
    const [updated] = await db
      .update(rseEventResults)
      .set(Object.assign({}, data, { updatedAt: new Date() }) as never)
      .where(eq(rseEventResults.eventId, eventId))
      .returning()
    return updated
  }
  const [created] = await db
    .insert(rseEventResults)
    .values(Object.assign({ eventId, createdBy, submittedBy, submittedAt: new Date() }, data) as never)
    .returning()
  return created
}

export async function publishEventResults(eventId: string) {
  await db
    .update(rseEventResults)
    .set({ submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(rseEventResults.eventId, eventId))
  await db
    .update(rseEvents)
    .set({ status: 'termine' as never, updatedAt: new Date() })
    .where(eq(rseEvents.id, eventId))
}

// ─── Impact dashboard ─────────────────────────────────────────────────────────

export async function getRseImpactData() {
  const [totals] = await db
    .select({
      totalWasteKg: sql<number>`COALESCE(SUM(waste_collected_kg), 0)`,
      totalTrees: sql<number>`COALESCE(SUM(trees_planted), 0)`,
      totalParticipants: sql<number>`COALESCE(SUM(participants_actual), 0)`,
      totalEvents: sql<number>`COUNT(*)`,
    })
    .from(rseEventResults)

  const [eventCounts] = await db
    .select({ total: sql<number>`COUNT(*)`, completed: sql<number>`COUNT(*) FILTER (WHERE status = 'termine')` })
    .from(rseEvents)

  // Per-year aggregates (last 5 years)
  const currentYear = new Date().getFullYear()
  const yearlyData = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${rseEvents.date})::int`,
      wasteKg: sql<number>`COALESCE(SUM(${rseEventResults.wasteCollectedKg}), 0)`,
      trees: sql<number>`COALESCE(SUM(${rseEventResults.treesPlanted}), 0)`,
      participants: sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)`,
      eventCount: sql<number>`COUNT(${rseEvents.id})`,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .where(
      and(
        gte(rseEvents.date, new Date(currentYear - 4, 0, 1)),
        lte(rseEvents.date, new Date(currentYear, 11, 31))
      )
    )
    .groupBy(sql`EXTRACT(YEAR FROM ${rseEvents.date})::int`)
    .orderBy(sql`EXTRACT(YEAR FROM ${rseEvents.date})::int`)

  // By type
  const byType = await db
    .select({
      eventType: rseEvents.eventType,
      count: sql<number>`COUNT(*)`,
    })
    .from(rseEvents)
    .groupBy(rseEvents.eventType)

  // By location
  const byLocation = await db
    .select({
      location: rseEvents.location,
      eventCount: sql<number>`COUNT(*)`,
      totalParticipants: sql<number>`COALESCE(SUM(${rseEventResults.participantsActual}), 0)`,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .groupBy(rseEvents.location)
    .orderBy(desc(sql`COUNT(*)`))

  // Last 10 events with participants
  const recentEvents = await db
    .select({
      id: rseEvents.id,
      title: rseEvents.title,
      date: rseEvents.date,
      participants: rseEventResults.participantsActual,
    })
    .from(rseEvents)
    .leftJoin(rseEventResults, eq(rseEventResults.eventId, rseEvents.id))
    .where(eq(rseEvents.status, 'termine' as never))
    .orderBy(desc(rseEvents.date))
    .limit(10)

  return {
    totals: {
      wasteKg: Number(totals?.totalWasteKg ?? 0),
      trees: Number(totals?.totalTrees ?? 0),
      participants: Number(totals?.totalParticipants ?? 0),
      completedEvents: Number(eventCounts?.completed ?? 0),
      totalEvents: Number(eventCounts?.total ?? 0),
    },
    yearlyData,
    byType,
    byLocation,
    recentEvents,
  }
}
