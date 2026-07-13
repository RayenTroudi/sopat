// src/lib/dms/audit.ts
// Writes to dms_audit_log. The table is guarded by a DB trigger that blocks
// UPDATE/DELETE, so every row inserted here is a permanent, ISO 9001 7.5.3
// traceability record — never mutate rows after insert.

import { db } from '../../../db/index'
import { dmsAuditLog, dmsAuditEventEnum, users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

type Tx = Parameters<Parameters<(typeof db)['transaction']>[0]>[0]
type DmsAuditEvent = typeof dmsAuditEventEnum.enumValues[number]
type UserRole = typeof users.$inferSelect['role']

export async function logDmsAudit(
  txOrDb: Tx | typeof db,
  opts: {
    documentId: string
    versionId?: string
    event: DmsAuditEvent
    actorId: string
    actorRole?: UserRole
    previousState?: Record<string, unknown> | null
    newState?: Record<string, unknown> | null
    metadata?: Record<string, unknown> | null
    ipAddress?: string
    userAgent?: string
  },
): Promise<void> {
  const database = txOrDb as typeof db

  let actorRole = opts.actorRole
  if (!actorRole) {
    const [actor] = await database
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, opts.actorId))
      .limit(1)
    if (!actor) return // unknown actor — nothing reliable to log
    actorRole = actor.role
  }

  await database.insert(dmsAuditLog).values({
    documentId: opts.documentId,
    versionId: opts.versionId ?? null,
    event: opts.event,
    actorId: opts.actorId,
    actorRoleSnapshot: actorRole,
    previousState: opts.previousState ?? null,
    newState: opts.newState ?? null,
    metadata: opts.metadata ?? null,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
  })
}
