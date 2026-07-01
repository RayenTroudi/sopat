'use server'

import { db } from '@/lib/db'
import { regulatoryWatch } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

export async function createRegulatoryEntry(data: {
  reference?: string
  title: string
  domain?: string
  issuingBody?: string
  publicationDate?: string
  effectiveDate?: string
  status: string
  complianceNotes?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(regulatoryWatch).values({
    reference: data.reference,
    title: data.title,
    domain: data.domain,
    issuingBody: data.issuingBody,
    publicationDate: data.publicationDate,
    effectiveDate: data.effectiveDate,
    status: data.status as 'applicable' | 'non_applicable' | 'en_veille',
    complianceNotes: data.complianceNotes,
    nextReviewDate: data.nextReviewDate,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}

export async function updateRegulatoryEntry(id: string, data: {
  title?: string
  status?: string
  complianceNotes?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(regulatoryWatch).set({ ...data as any, updatedAt: new Date() }).where(eq(regulatoryWatch.id, id))
  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}

export async function deleteRegulatoryEntry(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.update(regulatoryWatch).set({ deletedAt: new Date() }).where(eq(regulatoryWatch.id, id))
  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}
