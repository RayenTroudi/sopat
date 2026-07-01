'use server'

import { db } from '@/db'
import { hseChecklistSubmissions, hseChecklistAnswers } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function submitHseChecklist(data: {
  submittedDate: string
  dept: string
  notes?: string
  answers: Array<{ itemId: string; isCompliant: boolean; comment?: string }>
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const nonCompliantCount = data.answers.filter((a) => !a.isCompliant).length
  const total = data.answers.length
  const overallStatus =
    nonCompliantCount === 0
      ? 'conforme'
      : nonCompliantCount < total / 2
      ? 'partiel'
      : 'non_conforme'

  const [submission] = await db
    .insert(hseChecklistSubmissions)
    .values({
      submittedDate: data.submittedDate,
      dept: data.dept as 'AC' | 'CO' | 'ET' | 'MI' | 'RE1' | 'RE2' | 'RH',
      overallStatus: overallStatus as 'conforme' | 'non_conforme' | 'partiel',
      notes: data.notes,
      createdBy: session.user.userId,
    })
    .returning()

  if (data.answers.length > 0) {
    await db.insert(hseChecklistAnswers).values(
      data.answers.map((a) => ({
        submissionId: submission.id,
        itemId: a.itemId,
        isCompliant: a.isCompliant,
        comment: a.comment,
        createdBy: session.user.userId,
      }))
    )
  }

  revalidatePath('/admin/environment/hse-checklist')
  return { success: true }
}
