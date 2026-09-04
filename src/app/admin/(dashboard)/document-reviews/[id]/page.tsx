import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getDocumentReviewById } from '@/lib/db/document-reviews'
import { getRecordAuditTrail } from '@/lib/audit'
import EditReviewClient from './EditReviewClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revue documentaire | SOPAT Admin' }

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const { id } = await params
  const review = await getDocumentReviewById(id)
  if (!review) notFound()

  // L'historique est affiché à côté du formulaire : modifier un rapport clos se
  // fait en voyant ce que les modifications précédentes ont déjà changé.
  const trail = await getRecordAuditTrail('document_review', id)

  return (
    <EditReviewClient
      review={{
        id: review.id,
        reference: review.reference,
        reviewDate: review.reviewDate,
        processCode: review.processCode,
        scope: review.scope,
        documentsCount: review.documentsCount,
        findings: review.findings,
        decisions: review.decisions,
        nextReviewDate: review.nextReviewDate,
        status: review.status,
        revisionNumber: review.revisionNumber,
        creatorName: review.creatorName,
        completedAt: review.completedAt ? review.completedAt.toISOString() : null,
        lines: review.lines.map((l) => ({
          id: l.id,
          documentCode: l.documentCode,
          documentId: l.documentId,
          title: l.title,
          dmsTitle: l.dmsTitle,
          changeNeeded: l.changeNeeded,
          changeDescription: l.changeDescription,
          riskReviewNeeded: l.riskReviewNeeded,
          riskReviewDescription: l.riskReviewDescription,
          comments: l.comments,
          sortOrder: l.sortOrder,
        })),
      }}
      trail={trail.map((t) => ({
        id: t.id,
        action: t.action,
        actorName: t.actorName,
        occurredAt: t.occurredAt.toISOString(),
        changeReason:
          (t.metadata as { changeReason?: string | null } | null)?.changeReason ?? null,
        previousState: t.previousState as Record<string, unknown> | null,
        newState: t.newState as Record<string, unknown> | null,
      }))}
    />
  )
}
