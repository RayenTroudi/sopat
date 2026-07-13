import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDocumentReviews, DOC_REVIEW_STATUS_LABELS } from '@/lib/db/document-reviews'
import Link from 'next/link'
import ReviewStatusSelect from './ReviewStatusSelect'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revues documentaires | SOPAT Admin' }

const statusColors: Record<string, string> = {
  planned: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  in_progress: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
  completed: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
}

export default async function DocumentReviewsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const rows = await getDocumentReviews()
  const planned = rows.filter(({ review }) => review.status === 'planned').length
  const completed = rows.filter(({ review }) => review.status === 'completed').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Revues documentaires
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-01 / PRC-MI-01 — Revue périodique des informations documentées
          </p>
        </div>
        <Link
          href="/admin/document-reviews/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle revue
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Planifiées', value: planned, color: 'var(--admin-amber)' },
          { label: 'Terminées', value: completed, color: 'var(--admin-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Date', 'Périmètre', 'Docs revus', 'Constats', 'Prochaine revue', 'Statut'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ review }) => (
                <tr key={review.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {review.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {new Date(review.reviewDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{review.scope ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{review.documentsCount ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{review.findings ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {review.nextReviewDate ? new Date(review.nextReviewDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[review.status]}`}>
                        {DOC_REVIEW_STATUS_LABELS[review.status]}
                      </span>
                      <ReviewStatusSelect reviewId={review.id} status={review.status} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune revue documentaire.{' '}
                    <Link href="/admin/document-reviews/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
