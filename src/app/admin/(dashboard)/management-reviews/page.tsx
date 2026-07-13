import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getManagementReviews } from '@/lib/db/management-reviews'
import Link from 'next/link'
import ExportExcelButton from '@/components/ExportExcelButton'
import DirectionReportButtons from '@/components/DirectionReportButtons'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revues de direction | SOPAT Admin' }

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  held: 'Tenue',
  closed: 'Clôturée',
}

const statusColors: Record<string, string> = {
  planned: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  held: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
  closed: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ManagementReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const status = typeof sp.status === 'string' ? sp.status : undefined
  const rows = await getManagementReviews({ status })

  const planned = rows.filter(({ review }) => review.status === 'planned').length
  const held = rows.filter(({ review }) => review.status === 'held').length
  const closed = rows.filter(({ review }) => review.status === 'closed').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Revues de direction
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MQ-15 / PRC-MI-10 — ISO 9001:2015 §9.3
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DirectionReportButtons />
          <ExportExcelButton register="management-reviews" />
          <Link
            href="/admin/management-reviews/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouvelle revue
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Planifiées', value: planned, color: 'var(--admin-amber)' },
          { label: 'Tenues', value: held, color: 'var(--admin-accent)' },
          { label: 'Clôturées', value: closed, color: 'var(--admin-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Toutes', value: undefined },
          { label: 'Planifiées', value: 'planned' },
          { label: 'Tenues', value: 'held' },
          { label: 'Clôturées', value: 'closed' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/management-reviews?status=${value}` : '/admin/management-reviews'}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={status === value
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Date', 'Statut', 'Participants', 'Créée par', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ review, creatorName }) => (
                <tr key={review.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {review.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {new Date(review.reviewDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[review.status]}`}>
                      {STATUS_LABELS[review.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{review.participants ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{creatorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/management-reviews/${review.id}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune revue de direction.{' '}
                    <Link href="/admin/management-reviews/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
