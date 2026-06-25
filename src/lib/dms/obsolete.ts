// src/lib/dms/obsolete.ts
// Marks the dms_documents entry for a given code as obsolete.
// Call this inside any soft-delete transaction.

import { db } from '../../../db/index'
import { dmsDocuments } from '../../../db/schema'
import { eq } from 'drizzle-orm'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function obsoleteDmsDocument(txOrDb: Tx | typeof db, code: string): Promise<void> {
  if (!code) return
  await (txOrDb as typeof db)
    .update(dmsDocuments)
    .set({ status: 'obsolete' })
    .where(eq(dmsDocuments.documentNumber, code))
}
