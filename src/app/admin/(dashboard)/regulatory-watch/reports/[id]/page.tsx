import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getRegulatoryWatchReportById } from '@/lib/db/regulatory-watch'
import { getRecordAuditTrail } from '@/lib/audit'
import EditWatchReportClient from './EditWatchReportClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapport de veille | SOPAT Admin' }

export default async function RegulatoryWatchReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const { id } = await params
  const report = await getRegulatoryWatchReportById(id)
  if (!report) notFound()

  // L'historique est affiché à côté du formulaire : modifier un rapport clos se
  // fait en voyant ce que les modifications précédentes ont déjà changé.
  const trail = await getRecordAuditTrail('regulatory_watch_report', id)

  return (
    <EditWatchReportClient
      report={{
        id: report.id,
        reference: report.reference,
        year: report.year,
        status: report.status,
        revisionNumber: report.revisionNumber,
        creatorName: report.creatorName,
        completedAt: report.completedAt ? report.completedAt.toISOString() : null,
        lines: report.lines.map((l) => ({
          id: l.id,
          watchDate: l.watchDate,
          watchType: l.watchType,
          axis: l.axis,
          reference: l.reference,
          content: l.content,
          version: l.version,
          consultationSource: l.consultationSource,
          results: l.results,
          applicationLevel: l.applicationLevel,
          conformityAssessment: l.conformityAssessment,
          associatedRisk: l.associatedRisk,
          processCode: l.processCode,
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
