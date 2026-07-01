'use server'

import { db } from '@/db'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

export async function setAuditorStatus(userId: string, data: {
  isInternalAuditor: boolean
  auditorDomain?: string
  auditorQualifiedDate?: string
  auditorQualificationProof?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.update(users).set({
    isInternalAuditor: data.isInternalAuditor,
    auditorDomain: data.auditorDomain,
    auditorQualifiedDate: data.auditorQualifiedDate,
    auditorQualificationProof: data.auditorQualificationProof,
    updatedAt: new Date(),
  }).where(eq(users.id, userId))
  revalidatePath('/admin/auditors')
  return { success: true }
}
