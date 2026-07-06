import { db } from '../../../db/index'
import { projectStudyRecords } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export type DocumentReceived = {
  name: string
  receivedDate?: string
  required?: boolean
  observation?: string
}

export type StudyPhase = {
  phase: string
  plannedDays?: number
  actualDays?: number
  progressState?: string
  validationMeans?: string
  validationDate?: string
  observations?: string
}

export type ProjectStudyInput = {
  updatedDate?: string
  projectTitle?: string
  location?: string
  clientName?: string
  reference?: string
  amenagementType?: 'amenagement' | 'reamenagement' | 'autre'
  projectDetails?: string
  deadlineProposed?: string
  documentsReceived?: DocumentReceived[]
  clientRequests?: string
  durationPlannedDays?: number
  durationActualDays?: number
  startDatePlanned?: string
  startDateActual?: string
  endDatePlanned?: string
  endDateActual?: string
  phases?: StudyPhase[]
  droughtResistantRate?: string
  droughtResistantNote?: string
  responsableEtude?: string
}

export async function getProjectStudyRecord(projectId: string) {
  const [row] = await db
    .select()
    .from(projectStudyRecords)
    .where(eq(projectStudyRecords.projectId, projectId))
    .limit(1)
  return row ?? null
}

export async function upsertProjectStudyRecord(
  projectId: string,
  data: ProjectStudyInput,
  userId: string
) {
  const existing = await getProjectStudyRecord(projectId)

  if (existing) {
    const [row] = await db
      .update(projectStudyRecords)
      .set({
        ...data,
        droughtResistantRate: data.droughtResistantRate ?? null,
        documentsReceived: data.documentsReceived ?? existing.documentsReceived,
        phases: data.phases ?? existing.phases,
      })
      .where(eq(projectStudyRecords.projectId, projectId))
      .returning()
    return row
  }

  const [row] = await db
    .insert(projectStudyRecords)
    .values({
      projectId,
      ...data,
      documentsReceived: data.documentsReceived ?? [],
      phases: data.phases ?? [],
      createdBy: userId,
    })
    .returning()
  return row
}
