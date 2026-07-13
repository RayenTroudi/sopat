// src/lib/dms/workflow.ts
// ISO 9001 §7.5.2 document lifecycle transitions.
// Every transition runs in one transaction: document status + version stamps
// + dms_workflow_steps row + immutable dms_audit_log event.

import { createHash } from 'crypto'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../../../db/index'
import {
  dmsDocuments,
  dmsDocumentVersions,
  dmsWorkflowSteps,
  dmsApprovalActionEnum,
  dmsAuditEventEnum,
  dmsLifecycleStatusEnum,
  users,
} from '../../../db/schema'
import { logDmsAudit } from './audit'

export type DmsApprovalAction = typeof dmsApprovalActionEnum.enumValues[number]
type DmsStatus = typeof dmsLifecycleStatusEnum.enumValues[number]
type DmsAuditEvent = typeof dmsAuditEventEnum.enumValues[number]
type UserRole = typeof users.$inferSelect['role']

type TransitionRule = {
  from: DmsStatus[]
  to: DmsStatus
  event: DmsAuditEvent
  stepName: string
}

export const TRANSITIONS: Record<DmsApprovalAction, TransitionRule> = {
  submit_for_review: { from: ['draft', 'under_revision'],            to: 'in_review',        event: 'status_changed', stepName: 'Soumission pour révision' },
  review_approved:   { from: ['in_review'],                          to: 'pending_approval', event: 'reviewed',       stepName: 'Révision' },
  review_rejected:   { from: ['in_review'],                          to: 'draft',            event: 'rejected',       stepName: 'Révision' },
  approve:           { from: ['pending_approval'],                   to: 'approved',         event: 'approved',       stepName: 'Approbation' },
  reject:            { from: ['pending_approval'],                   to: 'draft',            event: 'rejected',       stepName: 'Approbation' },
  publish:           { from: ['approved'],                           to: 'effective',        event: 'published',      stepName: 'Publication' },
  request_revision:  { from: ['effective', 'approved'],              to: 'under_revision',   event: 'status_changed', stepName: 'Demande de révision' },
  mark_obsolete:     { from: ['effective', 'approved', 'under_revision'], to: 'obsolete',    event: 'obsoleted',      stepName: 'Mise en obsolescence' },
  archive:           { from: ['obsolete'],                           to: 'archived',         event: 'archived',       stepName: 'Archivage' },
}

// Département → rôle chef habilité à réviser en plus d'admin/direction
const DEPARTMENT_REVIEWER_ROLE: Partial<Record<string, UserRole>> = {
  etudes:      'etudes_chef',
  realisation: 'realisation_chef',
  entretien:   'entretien_chef',
  rh:          'rh_manager',
}

export function canPerformAction(
  action: DmsApprovalAction,
  actor: { userId: string; role: UserRole },
  doc: { ownerId: string; authorId: string; department: string },
): boolean {
  if (actor.role === 'admin' || actor.role === 'direction') return true
  const chefRole = DEPARTMENT_REVIEWER_ROLE[doc.department]

  switch (action) {
    case 'submit_for_review':
      return actor.userId === doc.ownerId || actor.userId === doc.authorId || actor.role === chefRole
    case 'review_approved':
    case 'review_rejected':
      return actor.role === chefRole
    // approve / reject / publish / request_revision / mark_obsolete / archive
    // restent réservés à admin / direction
    default:
      return false
  }
}

async function ensureInitialVersion(
  tx: Pick<typeof db, 'select' | 'insert' | 'update'>,
  doc: typeof dmsDocuments.$inferSelect,
): Promise<string> {
  if (doc.currentVersionId) return doc.currentVersionId

  const [existing] = await tx
    .select({ id: dmsDocumentVersions.id })
    .from(dmsDocumentVersions)
    .where(eq(dmsDocumentVersions.documentId, doc.id))
    .orderBy(desc(dmsDocumentVersions.createdAt))
    .limit(1)

  let versionId = existing?.id
  if (!versionId) {
    const contentHash = createHash('sha256')
      .update(`${doc.documentNumber}|${doc.title}|${doc.category}|${doc.department}`)
      .digest('hex')
    const [created] = await tx
      .insert(dmsDocumentVersions)
      .values({
        documentId:    doc.id,
        versionMajor:  1,
        versionMinor:  0,
        versionLabel:  doc.versionLabel || '1.0',
        contentHash,
        status:        doc.status,
        changeSummary: 'Version initiale (créée automatiquement par le workflow)',
        authorId:      doc.authorId,
        createdBy:     doc.authorId,
      })
      .returning({ id: dmsDocumentVersions.id })
    versionId = created.id
  }

  await tx
    .update(dmsDocuments)
    .set({ currentVersionId: versionId })
    .where(eq(dmsDocuments.id, doc.id))

  return versionId
}

export type TransitionResult =
  | { ok: true; status: DmsStatus }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_TRANSITION' }

export async function transitionDmsDocument(opts: {
  documentId: string
  action: DmsApprovalAction
  actor: { userId: string; role: UserRole }
  comments?: string
  ipAddress?: string
  userAgent?: string
}): Promise<TransitionResult> {
  const rule = TRANSITIONS[opts.action]

  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(dmsDocuments)
      .where(and(eq(dmsDocuments.id, opts.documentId), isNull(dmsDocuments.deletedAt)))
      .limit(1)

    if (!doc) {
      return { ok: false as const, error: 'Document introuvable', code: 'NOT_FOUND' as const }
    }
    if (!rule.from.includes(doc.status)) {
      return {
        ok: false as const,
        error: `Transition impossible : le document est « ${doc.status} », l'action « ${opts.action} » exige « ${rule.from.join(' / ')} »`,
        code: 'INVALID_TRANSITION' as const,
      }
    }
    if (!canPerformAction(opts.action, opts.actor, doc)) {
      return { ok: false as const, error: 'Vous n\'êtes pas habilité à effectuer cette action', code: 'FORBIDDEN' as const }
    }

    const versionId = await ensureInitialVersion(tx, doc)
    const now = new Date()

    // 1. Document status + dates de cycle de vie
    const docUpdates: Partial<typeof dmsDocuments.$inferInsert> = { status: rule.to }
    if (opts.action === 'publish') {
      docUpdates.effectiveDate = doc.effectiveDate ?? now
    }
    if (opts.action === 'mark_obsolete') {
      docUpdates.obsoletedAt = now
      docUpdates.retentionExpiresAt = new Date(
        now.getFullYear() + doc.retentionYears, now.getMonth(), now.getDate(),
      )
    }
    await tx.update(dmsDocuments).set(docUpdates).where(eq(dmsDocuments.id, doc.id))

    // 2. Version : statut + horodatages réviseur / approbateur / publication
    const verUpdates: Partial<typeof dmsDocumentVersions.$inferInsert> = { status: rule.to }
    if (opts.action === 'review_approved') {
      verUpdates.reviewedById = opts.actor.userId
      verUpdates.reviewedAt = now
    }
    if (opts.action === 'approve') {
      verUpdates.approvedById = opts.actor.userId
      verUpdates.approvedAt = now
    }
    if (opts.action === 'publish') {
      verUpdates.publishedAt = now
      verUpdates.effectiveDate = doc.effectiveDate ?? now
    }
    await tx.update(dmsDocumentVersions).set(verUpdates).where(eq(dmsDocumentVersions.id, versionId))

    // 3. Étape de workflow (enregistrement ISO de qui a fait quoi, quand)
    const [{ count }] = await tx
      .select({ count: dmsWorkflowSteps.stepOrder })
      .from(dmsWorkflowSteps)
      .where(eq(dmsWorkflowSteps.versionId, versionId))
      .orderBy(desc(dmsWorkflowSteps.stepOrder))
      .limit(1)
      .then((rows) => (rows.length ? [{ count: rows[0].count }] : [{ count: 0 }]))

    await tx.insert(dmsWorkflowSteps).values({
      documentId:   doc.id,
      versionId,
      stepOrder:    count + 1,
      stepName:     rule.stepName,
      assigneeId:   opts.actor.userId,
      assigneeRole: opts.actor.role,
      action:       opts.action,
      actionAt:     now,
      comments:     opts.comments ?? null,
    })

    // 4. Trace d'audit immuable
    const selfApproval =
      (opts.action === 'approve' || opts.action === 'review_approved') &&
      opts.actor.userId === doc.authorId
    await logDmsAudit(tx, {
      documentId:    doc.id,
      versionId,
      event:         rule.event,
      actorId:       opts.actor.userId,
      actorRole:     opts.actor.role,
      previousState: { status: doc.status },
      newState:      { status: rule.to },
      metadata: {
        action: opts.action,
        ...(opts.comments ? { comments: opts.comments } : {}),
        ...(selfApproval ? { selfApproval: true } : {}),
      },
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    })

    return { ok: true as const, status: rule.to }
  })
}
