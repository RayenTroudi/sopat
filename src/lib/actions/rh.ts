'use server'

import { auth } from '../auth'
import { redirect } from 'next/navigation'
import {
  createJobPosition, updateJobPosition,
  upsertEmployeeProfile,
  createRecruitmentRequest,
  createTrainingSession, updateTrainingSession,
  createLeaveRequest, updateLeaveRequestStatus, getRecruitmentRequestById,
  createPerformanceEvaluation,
  upsertIntegrationPlan,
} from '../db/rh'

type Session = Awaited<ReturnType<typeof auth>>

function getSessionUser(session: Session): { id: string; role: string } {
  if (!session?.user) redirect('/login')
  const u = session.user as { userId?: string; id?: string; role?: string }
  const id = (u.userId ?? u.id)!
  const role = (u.role ?? '') as string
  return { id, role }
}

const RH_WRITE_ROLES = ['admin', 'direction', 'rh_manager', 'rh_agent']
const RH_MANAGER_ROLES = ['admin', 'direction', 'rh_manager']

function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new Error('Accès refusé')
}

// ─── Job Positions ─────────────────────────────────────────────────────────────

export async function createJobPositionAction(formData: FormData) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_MANAGER_ROLES)
    const row = await createJobPosition({
      code: formData.get('code') as string || undefined,
      title: formData.get('title') as string,
      department: formData.get('department') as string || undefined,
      hierarchicalSuperior: formData.get('hierarchicalSuperior') as string || undefined,
      initialTraining: formData.get('initialTraining') as string || undefined,
      continuousTraining: formData.get('continuousTraining') as string || undefined,
      mainMissions: formData.get('mainMissions') as string || undefined,
      attributions: formData.get('attributions') as string || undefined,
      indispensableCriteria: formData.get('indispensableCriteria') as string || undefined,
      desirableCriteria: formData.get('desirableCriteria') as string || undefined,
      workTechniques: JSON.parse((formData.get('workTechniques') as string) || '[]'),
      updatedDate: formData.get('updatedDate') as string || undefined,
    }, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateJobPositionAction(id: string, formData: FormData) {
  const session = await auth()
  const { role } = getSessionUser(session)
  try {
    requireRole(role, RH_MANAGER_ROLES)
    await updateJobPosition(id, {
      code: formData.get('code'),
      title: formData.get('title'),
      department: formData.get('department'),
      hierarchicalSuperior: formData.get('hierarchicalSuperior'),
      initialTraining: formData.get('initialTraining'),
      continuousTraining: formData.get('continuousTraining'),
      mainMissions: formData.get('mainMissions'),
      attributions: formData.get('attributions'),
      indispensableCriteria: formData.get('indispensableCriteria'),
      desirableCriteria: formData.get('desirableCriteria'),
      workTechniques: JSON.parse((formData.get('workTechniques') as string) || '[]'),
      updatedDate: formData.get('updatedDate'),
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Employee Profile ─────────────────────────────────────────────────────────

const EMPLOYEE_PROFILE_ALLOWED_FIELDS = [
  'matricule', 'cin', 'matriculeCnss', 'familySituation', 'contractType',
  'contractStartDate', 'contractEndDate', 'jobPositionId', 'jobTitle',
  'hierarchicalSuperiorId', 'plannedDaysPerYear', 'leaveBalanceDays',
  'leaveBalancePrevious', 'integrationPilot', 'integrationStartDate',
  'integrationEndDate', 'deputyId', 'notes',
]

export async function upsertEmployeeProfileAction(targetUserId: string, data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_WRITE_ROLES)
    // Whitelist fields — reject anything not in the allowed set
    const safe: Record<string, unknown> = {}
    for (const key of EMPLOYEE_PROFILE_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    await upsertEmployeeProfile(targetUserId, safe, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Recruitment ──────────────────────────────────────────────────────────────

const RECRUITMENT_ALLOWED_FIELDS = [
  'refCode', 'jobPositionId', 'postTitle', 'requestingDept', 'hierarchicalSuperior',
  'proposedStatus', 'reason', 'studyLevel', 'studySpecialty', 'experienceDuration',
  'mainMissions', 'requiredSkills', 'status', 'openedDate', 'notes',
]

export async function createRecruitmentRequestAction(data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_WRITE_ROLES)
    const safe: Record<string, unknown> = {}
    for (const key of RECRUITMENT_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    const row = await createRecruitmentRequest(safe, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Training ─────────────────────────────────────────────────────────────────

const TRAINING_ALLOWED_FIELDS = [
  'refCode', 'year', 'thematic', 'theme', 'requestedDate', 'objective',
  'trainerName', 'trainingOrg', 'location', 'plannedStartDate', 'plannedEndDate',
  'actualStartDate', 'actualEndDate', 'status', 'actionType',
  'hotEvalDate', 'coldEvalDate', 'notes',
]

export async function createTrainingSessionAction(data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_WRITE_ROLES)
    const safe: Record<string, unknown> = {}
    for (const key of TRAINING_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    const row = await createTrainingSession(safe, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateTrainingSessionAction(id: string, data: Record<string, unknown>) {
  const session = await auth()
  const { role } = getSessionUser(session)
  try {
    requireRole(role, RH_WRITE_ROLES)
    const safe: Record<string, unknown> = {}
    for (const key of TRAINING_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    await updateTrainingSession(id, safe)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

const LEAVE_REQUEST_ALLOWED_FIELDS = [
  'leaveType', 'startDate', 'endDate', 'durationDays', 'reason', 'notes',
]

export async function createLeaveRequestAction(data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId } = getSessionUser(session)
  try {
    // Any authenticated user can submit a leave request for themselves
    const safe: Record<string, unknown> = { userId }
    for (const key of LEAVE_REQUEST_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    const row = await createLeaveRequest(safe, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

const APPROVAL_FIELDS = ['supervisorApproval', 'rhApproval', 'directionApproval'] as const
type ApprovalField = typeof APPROVAL_FIELDS[number]
const APPROVAL_STATUSES = ['approuve', 'refuse'] as const
type ApprovalStatus = typeof APPROVAL_STATUSES[number]

const APPROVAL_FIELD_ALLOWED_ROLES: Record<ApprovalField, string[]> = {
  supervisorApproval: ['admin', 'direction', 'rh_manager', 'etudes_chef', 'realisation_chef', 'entretien_chef'],
  rhApproval: ['admin', 'direction', 'rh_manager', 'rh_agent'],
  directionApproval: ['admin', 'direction'],
}

export async function approveLeaveRequestAction(id: string, field: string, status: string) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    // Allowlist field and status
    if (!(APPROVAL_FIELDS as readonly string[]).includes(field))
      throw new Error('Champ d\'approbation invalide')
    if (!(APPROVAL_STATUSES as readonly string[]).includes(status))
      throw new Error('Statut d\'approbation invalide')

    const approvalField = field as ApprovalField
    requireRole(role, APPROVAL_FIELD_ALLOWED_ROLES[approvalField])

    // Block self-approval for supervisor role
    const { getLeaveRequestById } = await import('../db/rh')
    const req = await getLeaveRequestById(id)
    if (!req) throw new Error('Demande introuvable')
    if (approvalField === 'supervisorApproval' && req.userId === userId)
      throw new Error('Impossible d\'approuver sa propre demande')

    await updateLeaveRequestStatus(id, approvalField, status, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Performance ──────────────────────────────────────────────────────────────

const PERFORMANCE_ALLOWED_FIELDS = [
  'userId', 'evaluationDate', 'currentPosition', 'seniorityCompany', 'seniorityPosition',
  'workTechniquesScore', 'attendanceScore', 'rigorScore', 'disciplineScore',
  'improvementScore', 'smqRespectScore', 'riskAnalysisScore', 'qualityScore',
  'communicationScore', 'teamworkScore', 'managementScore', 'learningScore',
  'integrationScore', 'globalScore', 'globalScorePct', 'evalueeNeeds',
  'nextObjectives', 'remarks',
]

export async function createPerformanceEvaluationAction(data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_MANAGER_ROLES)
    const safe: Record<string, unknown> = { evaluatorId: userId }
    for (const key of PERFORMANCE_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    if (safe.userId === userId) throw new Error('Auto-évaluation non autorisée')
    const row = await createPerformanceEvaluation(safe, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Integration Plan ─────────────────────────────────────────────────────────

const INTEGRATION_ALLOWED_FIELDS = [
  'pilotId', 'plannedStartDate', 'plannedEndDate', 'items', 'notes',
]

export async function upsertIntegrationPlanAction(targetUserId: string, data: Record<string, unknown>) {
  const session = await auth()
  const { id: userId, role } = getSessionUser(session)
  try {
    requireRole(role, RH_WRITE_ROLES)
    const safe: Record<string, unknown> = {}
    for (const key of INTEGRATION_ALLOWED_FIELDS) {
      if (key in data) safe[key] = data[key]
    }
    await upsertIntegrationPlan(targetUserId, safe, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
