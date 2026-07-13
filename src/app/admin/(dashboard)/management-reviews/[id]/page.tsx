import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getManagementReviewById } from '@/lib/db/management-reviews'
import Link from 'next/link'
import ReviewDetailPanel from './ReviewDetailPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revue de direction | SOPAT Admin' }

const INPUT_FIELDS: { key: string; label: string }[] = [
  { key: 'previousActionsStatus',    label: 'État des actions des revues précédentes' },
  { key: 'contextChanges',           label: 'Modifications des enjeux externes et internes' },
  { key: 'customerSatisfaction',     label: 'Satisfaction client et retours des parties intéressées' },
  { key: 'qualityObjectivesReview',  label: 'Atteinte des objectifs qualité' },
  { key: 'processPerformance',       label: 'Performance des processus et conformité' },
  { key: 'ncCapaStatus',             label: 'Non-conformités et actions correctives' },
  { key: 'auditResults',             label: "Résultats d'audits" },
  { key: 'supplierPerformance',      label: 'Performance des prestataires externes' },
  { key: 'resourceAdequacy',         label: 'Adéquation des ressources' },
  { key: 'risksOpportunitiesReview', label: 'Efficacité des actions risques & opportunités' },
  { key: 'improvementOpportunities', label: "Opportunités d'amélioration" },
]

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  held: 'Tenue',
  closed: 'Clôturée',
}

export default async function ManagementReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const data = await getManagementReviewById(id)
  if (!data) notFound()
  const { review, actions } = data

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/management-reviews" className="text-[13px] hover:opacity-70" style={{ color: 'var(--admin-text-muted)' }}>
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Revue de direction {review.reference}
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
            {STATUS_LABELS[review.status]}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(review.reviewDate).toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Participants</p>
            <p style={{ color: 'var(--admin-text)' }}>{review.participants ?? '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Ordre du jour</p>
            <p className="whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{review.agenda ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Éléments d&apos;entrée (ISO 9.3.2)
        </h2>
        <dl className="space-y-3">
          {INPUT_FIELDS.map(({ key, label }) => {
            const value = (review as unknown as Record<string, string | null>)[key]
            return (
              <div key={key} className="grid grid-cols-3 gap-4 text-sm">
                <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
                <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value || '—'}</dd>
              </div>
            )
          })}
        </dl>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
          Conclusions (ISO 9.3.3)
        </h2>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{review.conclusions || '—'}</p>
      </div>

      <ReviewDetailPanel
        reviewId={review.id}
        status={review.status}
        actions={actions.map((a) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          responsible: a.responsible,
          targetDate: a.targetDate,
          completedAt: a.completedAt ? a.completedAt.toISOString() : null,
          result: a.result,
        }))}
      />
    </div>
  )
}
