import { db } from '../../../db/index'
import {
  employeeProfiles, jobPositions, recruitmentRequests,
  trainingSessions, trainingParticipants, leaveRequests,
  exitAuthorizations, performanceEvaluations, integrationPlans,
  users,
} from '../../../db/schema'
import { eq, desc, asc, and, ilike, or } from 'drizzle-orm'

// ─── Job Positions ─────────────────────────────────────────────────────────────

export async function listJobPositions() {
  return db.select().from(jobPositions)
    .where(eq(jobPositions.isActive, true))
    .orderBy(asc(jobPositions.title))
}

export async function getJobPositionById(id: string) {
  const [row] = await db.select().from(jobPositions).where(eq(jobPositions.id, id)).limit(1)
  return row ?? null
}

export async function createJobPosition(data: {
  code?: string; title: string; department?: string; hierarchicalSuperior?: string
  initialTraining?: string; continuousTraining?: string; mainMissions?: string
  attributions?: string; indispensableCriteria?: string; desirableCriteria?: string
  workTechniques?: { label: string }[]; updatedDate?: string
}, createdBy: string) {
  const [row] = await db.insert(jobPositions).values({ ...data, createdBy }).returning()
  return row
}

export async function updateJobPosition(id: string, data: Record<string, unknown>) {
  const [row] = await db.update(jobPositions).set(data).where(eq(jobPositions.id, id)).returning()
  return row
}

// ─── Employee Profiles ────────────────────────────────────────────────────────

export async function listEmployeesWithProfiles() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      isActive: users.isActive,
      profile: {
        matricule: employeeProfiles.matricule,
        cin: employeeProfiles.cin,
        matriculeCnss: employeeProfiles.matriculeCnss,
        familySituation: employeeProfiles.familySituation,
        contractType: employeeProfiles.contractType,
        contractStartDate: employeeProfiles.contractStartDate,
        contractEndDate: employeeProfiles.contractEndDate,
        jobTitle: employeeProfiles.jobTitle,
        leaveBalanceDays: employeeProfiles.leaveBalanceDays,
        leaveBalancePrevious: employeeProfiles.leaveBalancePrevious,
        plannedDaysPerYear: employeeProfiles.plannedDaysPerYear,
        deputyId: employeeProfiles.deputyId,
        hierarchicalSuperiorId: employeeProfiles.hierarchicalSuperiorId,
        jobPositionId: employeeProfiles.jobPositionId,
        notes: employeeProfiles.notes,
      },
    })
    .from(users)
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name))
}

export async function getEmployeeProfile(userId: string) {
  const [row] = await db.select().from(employeeProfiles)
    .where(eq(employeeProfiles.userId, userId)).limit(1)
  return row ?? null
}

export async function upsertEmployeeProfile(userId: string, data: Record<string, unknown>, createdBy: string) {
  const existing = await getEmployeeProfile(userId)
  if (existing) {
    const [row] = await db.update(employeeProfiles).set(data).where(eq(employeeProfiles.userId, userId)).returning()
    return row
  }
  const [row] = await db.insert(employeeProfiles).values({ userId, ...data, contractType: data.contractType as any, createdBy }).returning()
  return row
}

// ─── Recruitment Requests ─────────────────────────────────────────────────────

export async function listRecruitmentRequests(status?: string) {
  return db.select().from(recruitmentRequests)
    .where(and(
      status ? eq(recruitmentRequests.status, status as any) : undefined,
      eq(recruitmentRequests.deletedAt, null as any),
    ))
    .orderBy(desc(recruitmentRequests.createdAt))
}

export async function getRecruitmentRequestById(id: string) {
  const [row] = await db.select().from(recruitmentRequests).where(eq(recruitmentRequests.id, id)).limit(1)
  return row ?? null
}

export async function createRecruitmentRequest(data: Record<string, unknown>, createdBy: string) {
  const [row] = await db.insert(recruitmentRequests).values({ ...data as any, status: (data.status ?? 'ouvert') as any, createdBy }).returning()
  return row
}

// ─── Training Sessions ────────────────────────────────────────────────────────

export async function listTrainingSessions(year?: number, status?: string) {
  return db.select().from(trainingSessions)
    .where(and(
      year ? eq(trainingSessions.year, year) : undefined,
      status ? eq(trainingSessions.status, status as any) : undefined,
    ))
    .orderBy(desc(trainingSessions.year), asc(trainingSessions.plannedStartDate))
}

export async function getTrainingSessionById(id: string) {
  const session = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id)).limit(1)
  const participants = await db
    .select({ p: trainingParticipants, u: { id: users.id, name: users.name } })
    .from(trainingParticipants)
    .leftJoin(users, eq(users.id, trainingParticipants.userId))
    .where(eq(trainingParticipants.trainingSessionId, id))
  return { session: session[0] ?? null, participants }
}

export async function createTrainingSession(data: Record<string, unknown>, createdBy: string) {
  const [row] = await db.insert(trainingSessions).values({ ...data as any, status: (data.status ?? 'planifie') as any, createdBy }).returning()
  return row
}

export async function updateTrainingSession(id: string, data: Record<string, unknown>) {
  const [row] = await db.update(trainingSessions).set(data as any).where(eq(trainingSessions.id, id)).returning()
  return row
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function listLeaveRequests(userId?: string, status?: string) {
  return db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      userName: users.name,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      durationDays: leaveRequests.durationDays,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      supervisorApproval: leaveRequests.supervisorApproval,
      rhApproval: leaveRequests.rhApproval,
      directionApproval: leaveRequests.directionApproval,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(
      userId ? eq(leaveRequests.userId, userId) : undefined,
      status ? eq(leaveRequests.status, status as any) : undefined,
    ))
    .orderBy(desc(leaveRequests.createdAt))
}

export async function getLeaveRequestById(id: string) {
  const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1)
  return row ?? null
}

export async function createLeaveRequest(data: Record<string, unknown>, createdBy: string) {
  const [row] = await db.insert(leaveRequests).values({ ...data as any, leaveType: data.leaveType as any, status: 'en_attente', createdBy }).returning()
  return row
}

export async function updateLeaveRequestStatus(id: string, field: string, status: string, approvedBy: string) {
  const updates: Record<string, unknown> = {
    [field]: status,
    [`${field.replace('Approval', 'ApprovedBy')}`]: approvedBy,
    [`${field.replace('Approval', 'ApprovedAt')}`]: new Date(),
  }
  if (status === 'approuve' || status === 'refuse') updates.status = status
  const [row] = await db.update(leaveRequests).set(updates as any).where(eq(leaveRequests.id, id)).returning()
  return row
}

// ─── Performance Evaluations ──────────────────────────────────────────────────

export async function listPerformanceEvaluations(userId?: string) {
  return db
    .select({
      id: performanceEvaluations.id,
      userId: performanceEvaluations.userId,
      userName: users.name,
      evaluationDate: performanceEvaluations.evaluationDate,
      currentPosition: performanceEvaluations.currentPosition,
      globalScore: performanceEvaluations.globalScore,
      globalScorePct: performanceEvaluations.globalScorePct,
    })
    .from(performanceEvaluations)
    .leftJoin(users, eq(users.id, performanceEvaluations.userId))
    .where(userId ? eq(performanceEvaluations.userId, userId) : undefined)
    .orderBy(desc(performanceEvaluations.evaluationDate))
}

export async function getPerformanceEvaluationById(id: string) {
  const [row] = await db.select().from(performanceEvaluations).where(eq(performanceEvaluations.id, id)).limit(1)
  return row ?? null
}

export async function createPerformanceEvaluation(data: Record<string, unknown>, createdBy: string) {
  const [row] = await db.insert(performanceEvaluations).values({ ...data as any, createdBy }).returning()
  return row
}

// ─── Integration Plans ────────────────────────────────────────────────────────

export async function getIntegrationPlan(userId: string) {
  const [row] = await db.select().from(integrationPlans).where(eq(integrationPlans.userId, userId)).limit(1)
  return row ?? null
}

export async function upsertIntegrationPlan(userId: string, data: Record<string, unknown>, createdBy: string) {
  const existing = await getIntegrationPlan(userId)
  if (existing) {
    const [row] = await db.update(integrationPlans).set(data as any).where(eq(integrationPlans.userId, userId)).returning()
    return row
  }
  const [row] = await db.insert(integrationPlans).values({ userId, ...data, createdBy }).returning()
  return row
}

// ─── List all users (for dropdowns) ──────────────────────────────────────────

export async function listActiveUsers() {
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users).where(eq(users.isActive, true)).orderBy(asc(users.name))
}
