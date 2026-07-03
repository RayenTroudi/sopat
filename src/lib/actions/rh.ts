'use server'

import { auth } from '../auth'
import { redirect } from 'next/navigation'
import {
  listJobPositions, getJobPositionById, createJobPosition, updateJobPosition,
  listEmployeesWithProfiles, getEmployeeProfile, upsertEmployeeProfile,
  listRecruitmentRequests, getRecruitmentRequestById, createRecruitmentRequest,
  listTrainingSessions, getTrainingSessionById, createTrainingSession, updateTrainingSession,
  listLeaveRequests, createLeaveRequest, updateLeaveRequestStatus,
  listPerformanceEvaluations, getPerformanceEvaluationById, createPerformanceEvaluation,
  getIntegrationPlan, upsertIntegrationPlan,
} from '../db/rh'

function getUserId(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user) redirect('/login')
  const user = session.user as { userId?: string; id?: string }
  return (user.userId ?? user.id)!
}

// ─── Job Positions ─────────────────────────────────────────────────────────────

export async function createJobPositionAction(formData: FormData) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    const id = await createJobPosition({
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
    return { success: true, id: id.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateJobPositionAction(id: string, formData: FormData) {
  const session = await auth()
  getUserId(session)
  try {
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

export async function upsertEmployeeProfileAction(targetUserId: string, data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    await upsertEmployeeProfile(targetUserId, data, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Recruitment ──────────────────────────────────────────────────────────────

export async function createRecruitmentRequestAction(data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    const row = await createRecruitmentRequest(data, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Training ─────────────────────────────────────────────────────────────────

export async function createTrainingSessionAction(data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    const row = await createTrainingSession(data, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateTrainingSessionAction(id: string, data: Record<string, unknown>) {
  const session = await auth()
  getUserId(session)
  try {
    await updateTrainingSession(id, data)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Leaves ───────────────────────────────────────────────────────────────────

export async function createLeaveRequestAction(data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    const row = await createLeaveRequest(data, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function approveLeaveRequestAction(id: string, field: string, status: string) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    await updateLeaveRequestStatus(id, field, status, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Performance ──────────────────────────────────────────────────────────────

export async function createPerformanceEvaluationAction(data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    const row = await createPerformanceEvaluation({ ...data, evaluatorId: userId }, userId)
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─── Integration Plan ─────────────────────────────────────────────────────────

export async function upsertIntegrationPlanAction(targetUserId: string, data: Record<string, unknown>) {
  const session = await auth()
  const userId = getUserId(session)
  try {
    await upsertIntegrationPlan(targetUserId, data, userId)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
