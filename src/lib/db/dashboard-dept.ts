import { db } from '../../../db/index'
import {
  projects,
  projectPhases,
  projectStudyRecords,
  purchaseOrders,
  nonConformances,
  maintenanceVisits,
  maintenanceSchedules,
  recruitmentRequests,
  leaveRequests,
  trainingSessions,
  trainingParticipants,
  users,
} from '../../../db/schema'
import { eq, and, gte, lte, desc, count, sql, inArray } from 'drizzle-orm'

// ─── Études ───────────────────────────────────────────────────────────────────

export type EtudesDashboardKpis = {
  projectsInEtudes: number
  studyRecordsCount: number
  openNcsEtudes: number
  activeProjects: Array<{ id: string; name: string; clientName: string | null; projectType: string }>
  recentStudyRecords: Array<{ id: string; projectId: string; projectName: string | null; createdAt: Date }>
}

export async function getEtudesDashboardKpis(): Promise<EtudesDashboardKpis> {
  const now = new Date()

  const [
    [phasesRow],
    [studyRow],
    [ncsRow],
    activeProjects,
    recentStudyRecords,
  ] = await Promise.all([
    db.select({ n: count() }).from(projectPhases)
      .where(and(eq(projectPhases.phase, 'etudes'), eq(projectPhases.status, 'in_progress'))),
    db.select({ n: count() }).from(projectStudyRecords),
    db.select({ n: count() }).from(nonConformances)
      .where(and(
        inArray(nonConformances.status, ['open', 'in_progress']),
        eq(nonConformances.dept, 'ET'),
      )),
    db.select({ id: projects.id, name: projects.name, clientName: projects.clientName, projectType: projects.projectType })
      .from(projects)
      .innerJoin(projectPhases, and(
        eq(projectPhases.projectId, projects.id),
        eq(projectPhases.phase, 'etudes'),
        eq(projectPhases.status, 'in_progress'),
      ))
      .orderBy(desc(projects.createdAt))
      .limit(8),
    db.select({
      id: projectStudyRecords.id,
      projectId: projectStudyRecords.projectId,
      projectName: projects.name,
      createdAt: projectStudyRecords.createdAt,
    })
      .from(projectStudyRecords)
      .leftJoin(projects, eq(projects.id, projectStudyRecords.projectId))
      .orderBy(desc(projectStudyRecords.createdAt))
      .limit(5),
  ])

  return {
    projectsInEtudes: phasesRow.n,
    studyRecordsCount: studyRow.n,
    openNcsEtudes: ncsRow.n,
    activeProjects,
    recentStudyRecords,
  }
}

// ─── Réalisation ──────────────────────────────────────────────────────────────

export type RealisationDashboardKpis = {
  projectsInRealisation: number
  purchaseOrdersThisMonth: number
  openNcsRealisation: number
  activeProjects: Array<{ id: string; name: string; clientName: string | null; projectType: string }>
  recentPurchaseOrders: Array<{
    id: string; projectId: string; projectName: string | null
    itemDescription: string; totalCost: string; purchaseDate: Date
  }>
}

export async function getRealisationDashboardKpis(): Promise<RealisationDashboardKpis> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    [phasesRow],
    [posRow],
    [ncsRow],
    activeProjects,
    recentPOs,
  ] = await Promise.all([
    db.select({ n: count() }).from(projectPhases)
      .where(and(eq(projectPhases.phase, 'realisation'), eq(projectPhases.status, 'in_progress'))),
    db.select({ n: count() }).from(purchaseOrders)
      .where(gte(purchaseOrders.purchaseDate, monthStart)),
    db.select({ n: count() }).from(nonConformances)
      .where(and(
        inArray(nonConformances.status, ['open', 'in_progress']),
        inArray(nonConformances.dept, ['RE1', 'RE2']),
      )),
    db.select({ id: projects.id, name: projects.name, clientName: projects.clientName, projectType: projects.projectType })
      .from(projects)
      .innerJoin(projectPhases, and(
        eq(projectPhases.projectId, projects.id),
        eq(projectPhases.phase, 'realisation'),
        eq(projectPhases.status, 'in_progress'),
      ))
      .orderBy(desc(projects.createdAt))
      .limit(8),
    db.select({
      id: purchaseOrders.id,
      projectId: purchaseOrders.projectId,
      projectName: projects.name,
      itemDescription: purchaseOrders.itemDescription,
      totalCost: purchaseOrders.totalCost,
      purchaseDate: purchaseOrders.purchaseDate,
    })
      .from(purchaseOrders)
      .leftJoin(projects, eq(projects.id, purchaseOrders.projectId))
      .orderBy(desc(purchaseOrders.purchaseDate))
      .limit(5),
  ])

  return {
    projectsInRealisation: phasesRow.n,
    purchaseOrdersThisMonth: posRow.n,
    openNcsRealisation: ncsRow.n,
    activeProjects,
    recentPurchaseOrders: recentPOs,
  }
}

// ─── Entretien ────────────────────────────────────────────────────────────────

export type EntretienDashboardKpis = {
  projectsInEntretien: number
  visitsThisMonth: { completed: number; scheduled: number }
  upcomingVisits: Array<{
    id: string; projectId: string; projectName: string | null
    visitDate: Date; visitType: string; teamMemberName: string | null
  }>
  openNcsEntretien: number
}

export async function getEntretienDashboardKpis(): Promise<EntretienDashboardKpis> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    [phasesRow],
    [scheduledRow],
    [completedRow],
    upcomingVisits,
    [ncsRow],
  ] = await Promise.all([
    db.select({ n: count() }).from(projectPhases)
      .where(and(eq(projectPhases.phase, 'entretien'), eq(projectPhases.status, 'in_progress'))),
    // scheduled = active maintenance schedules (contracts)
    db.select({ n: count() }).from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.isActive, true)),
    // completed = visits done this month
    db.select({ n: count() }).from(maintenanceVisits)
      .where(and(
        gte(maintenanceVisits.visitDate, monthStart),
        lte(maintenanceVisits.visitDate, monthEnd),
      )),
    // upcoming visits in next 7 days
    db.select({
      id: maintenanceVisits.id,
      projectId: maintenanceVisits.projectId,
      projectName: projects.name,
      visitDate: maintenanceVisits.visitDate,
      visitType: sql<string>`coalesce(${maintenanceVisits.visitType}, '')`,
      teamMemberName: users.name,
    })
      .from(maintenanceVisits)
      .leftJoin(projects, eq(projects.id, maintenanceVisits.projectId))
      .leftJoin(users, eq(users.id, maintenanceVisits.teamMemberId))
      .where(and(
        gte(maintenanceVisits.visitDate, now),
        lte(maintenanceVisits.visitDate, sevenDaysLater),
      ))
      .orderBy(maintenanceVisits.visitDate)
      .limit(10),
    db.select({ n: count() }).from(nonConformances)
      .where(and(
        inArray(nonConformances.status, ['open', 'in_progress']),
        eq(nonConformances.dept, 'MI'),
      )),
  ])

  return {
    projectsInEntretien: phasesRow.n,
    visitsThisMonth: { scheduled: scheduledRow.n, completed: completedRow.n },
    upcomingVisits,
    openNcsEntretien: ncsRow.n,
  }
}

// ─── RH ───────────────────────────────────────────────────────────────────────

export type RhDashboardKpis = {
  totalEmployees: number
  pendingLeaves: number
  pendingRecruitment: number
  upcomingTrainings: Array<{
    id: string; theme: string; plannedStartDate: string | null; participantCount: number
  }>
  recentLeaves: Array<{
    id: string; employeeName: string | null; leaveType: string
    startDate: string; endDate: string; status: string
  }>
}

export async function getRhDashboardKpis(): Promise<RhDashboardKpis> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const [
    [employeesRow],
    [pendingLeavesRow],
    [pendingRecruitRow],
    upcomingTrainings,
    recentLeaves,
  ] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.isActive, true)),
    db.select({ n: count() }).from(leaveRequests).where(eq(leaveRequests.status, 'en_attente')),
    db.select({ n: count() }).from(recruitmentRequests).where(eq(recruitmentRequests.status, 'ouvert')),
    db.select({
      id: trainingSessions.id,
      theme: trainingSessions.theme,
      plannedStartDate: trainingSessions.plannedStartDate,
      participantCount: count(trainingParticipants.id),
    })
      .from(trainingSessions)
      .leftJoin(trainingParticipants, eq(trainingParticipants.trainingSessionId, trainingSessions.id))
      .where(gte(trainingSessions.plannedStartDate, today))
      .groupBy(trainingSessions.id)
      .orderBy(trainingSessions.plannedStartDate)
      .limit(5),
    db.select({
      id: leaveRequests.id,
      employeeName: users.name,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
      .from(leaveRequests)
      .leftJoin(users, eq(users.id, leaveRequests.userId))
      .orderBy(desc(leaveRequests.createdAt))
      .limit(5),
  ])

  return {
    totalEmployees: employeesRow.n,
    pendingLeaves: pendingLeavesRow.n,
    pendingRecruitment: pendingRecruitRow.n,
    upcomingTrainings,
    recentLeaves,
  }
}
