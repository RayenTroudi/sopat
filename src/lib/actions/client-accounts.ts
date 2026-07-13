'use server'

import { db } from '@/db'
import { clientAccountEntries } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import type { ClientEntryType } from '@/lib/db/client-accounts'

function canManage(role: string) {
  return ['admin', 'direction', 'etudes_chef'].includes(role)
}

export async function createClientAccountEntry(data: {
  clientId: string
  projectId?: string
  entryType: ClientEntryType
  amount: string
  currency?: string
  entryDate: string
  reference?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db.insert(clientAccountEntries).values({
    clientId: data.clientId,
    projectId: data.projectId || null,
    entryType: data.entryType,
    amount: data.amount,
    currency: data.currency || 'TND',
    entryDate: data.entryDate,
    reference: data.reference,
    notes: data.notes,
    createdBy: session.user.userId,
  })

  revalidatePath('/admin/commercial/client-balances')
  return { success: true }
}

export async function deleteClientAccountEntry(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  if (!canManage(session.user.role))
    return { success: false, error: 'Accès non autorisé' }

  await db
    .update(clientAccountEntries)
    .set({ deletedAt: new Date() })
    .where(eq(clientAccountEntries.id, id))
  revalidatePath('/admin/commercial/client-balances')
  return { success: true }
}
