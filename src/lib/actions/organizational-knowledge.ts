'use server'

import { db } from '@/db'
import { organizationalKnowledge } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextKnowledgeReference } from '@/lib/db/organizational-knowledge'

function canManage(role: string) {
  return ['admin', 'direction'].includes(role)
}

export async function createKnowledge(data: {
  domain?: string
  title: string
  description?: string
  holder?: string
  criticality?: number
  preservationMethod?: string
  transferPlan?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  const reference = await getNextKnowledgeReference()
  await db.insert(organizationalKnowledge).values({
    reference,
    domain: data.domain,
    title: data.title,
    description: data.description,
    holder: data.holder,
    criticality: data.criticality,
    preservationMethod: data.preservationMethod,
    transferPlan: data.transferPlan,
    createdBy: session.user.userId,
  })

  revalidatePath('/admin/knowledge')
  return { success: true }
}

export async function updateKnowledgeStatus(
  id: string,
  status: 'active' | 'a_preserver' | 'archived',
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès réservé à la direction' }

  await db
    .update(organizationalKnowledge)
    .set({ status, updatedAt: new Date() })
    .where(eq(organizationalKnowledge.id, id))
  revalidatePath('/admin/knowledge')
  return { success: true }
}
