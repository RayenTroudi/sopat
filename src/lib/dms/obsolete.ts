// src/lib/dms/obsolete.ts
// Marks the dms_documents entry for a given code as obsolete.
// Call this inside any soft-delete transaction.

import { db } from '../../../db/index'
import { dmsDocuments } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { logDmsAudit } from './audit'

type Tx = Parameters<Parameters<(typeof db)['transaction']>[0]>[0]

export async function obsoleteDmsDocument(
  txOrDb: Tx | typeof db,
  code: string,
  actorId: string,
): Promise<void> {
  if (!code) return
  const database = txOrDb as typeof db

  const [before] = await database
    .select({ id: dmsDocuments.id, status: dmsDocuments.status })
    .from(dmsDocuments)
    .where(eq(dmsDocuments.documentNumber, code))
    .limit(1)
  if (!before) return

  await database
    .update(dmsDocuments)
    .set({ status: 'obsolete' })
    .where(eq(dmsDocuments.documentNumber, code))

  await logDmsAudit(database, {
    documentId:    before.id,
    event:         'obsoleted',
    actorId,
    previousState: { status: before.status },
    newState:      { status: 'obsolete' },
  })
}
