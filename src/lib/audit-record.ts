/**
 * Écriture du journal de traçabilité ISO 9001.
 *
 * Volontairement SANS `import 'server-only'` : les registres serveur
 * (src/lib/db/*.ts) doivent rester importables par les scripts tsx de
 * migration et de vérification, qui tournent hors du bundler Next. La
 * protection contre un import client reste assurée par `audit.ts`, qui
 * ré-exporte ce module pour les composants et server actions.
 */
import { db, type DB } from '@/db'
import { recordAuditLog } from '@/db/schema'
import type { UserRole } from '@/lib/auth-utils'

/** Transaction Drizzle, ou l'instance db pour un appel hors transaction. */
type Executor = DB | Parameters<Parameters<DB['transaction']>[0]>[0]

export type AuditActor = {
  userId: string
  name: string | null
  email: string | null
  role: UserRole
}

export type AuditEntityType =
  | 'extra_expense'
  | 'purchase_order'
  | 'delivery_note'
  | 'non_conformance'
  | 'corrective_action'

export type AuditAction =
  | 'created'
  | 'updated'
  | 'approved'
  | 'rejected'
  | 'deleted'
  /** NC / CAPA lifecycle: status transitions are quality decisions in their own right. */
  | 'status_changed'
  | 'closed'
  | 'reopened'
  | 'verified'
  /** One-off provenance entry written when a record is migrated from a legacy system. */
  | 'imported'
  /** Data-quality backfill performed by a migration script rather than a user. */
  | 'reclassified'

/**
 * Écrire la trace DANS la transaction qui modifie l'enregistrement : un
 * montant ne doit jamais pouvoir changer sans sa ligne de journal. C'est plus
 * strict que logActivity(), qui insère après coup et laisse donc une fenêtre
 * où la modification est enregistrée mais pas la trace.
 */
export async function recordAudit(
  tx: Executor,
  entry: {
    entityType: AuditEntityType
    entityId: string
    action: AuditAction
    actor: AuditActor
    previousState?: Record<string, unknown> | null
    newState?: Record<string, unknown> | null
    metadata?: Record<string, unknown> | null
  },
) {
  await tx.insert(recordAuditLog).values({
    entityType:        entry.entityType,
    entityId:          entry.entityId,
    action:            entry.action,
    actorId:           entry.actor.userId,
    actorName:         entry.actor.name ?? entry.actor.email ?? 'Inconnu',
    // Autorité au moment du fait : le rôle de l'acteur peut changer ensuite.
    actorRoleSnapshot: entry.actor.role,
    previousState:     entry.previousState ?? null,
    newState:          entry.newState ?? null,
    metadata:          entry.metadata ?? null,
  })
}

/** Historique d'un enregistrement, du plus récent au plus ancien. */
export async function getRecordAuditTrail(entityType: AuditEntityType, entityId: string) {
  return db.query.recordAuditLog.findMany({
    where: (log, { and, eq }) => and(eq(log.entityType, entityType), eq(log.entityId, entityId)),
    orderBy: (log, { desc }) => [desc(log.occurredAt)],
  })
}
