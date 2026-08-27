'use server'

import { db } from '@/db'
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
    createdBy: session.user.userId,
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
  // Champs explicites : `...data as any` écrivait toute colonne fournie, le cast
  // neutralisant jusqu'au contrôle de type. reference/createdBy/deletedAt protégés.
  const STATUSES = ['applicable', 'non_applicable', 'en_veille'] as const
  if (data.status !== undefined && !STATUSES.includes(data.status as typeof STATUSES[number])) {
    return { success: false, error: 'Statut invalide' }
  }
  await db
    .update(regulatoryWatch)
    .set({
      ...(data.title            !== undefined && { title: data.title }),
      ...(data.status           !== undefined && { status: data.status as typeof STATUSES[number] }),
      ...(data.complianceNotes  !== undefined && { complianceNotes: data.complianceNotes }),
      ...(data.nextReviewDate   !== undefined && { nextReviewDate: data.nextReviewDate }),
      updatedAt: new Date(),
    })
    .where(eq(regulatoryWatch.id, id))
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
