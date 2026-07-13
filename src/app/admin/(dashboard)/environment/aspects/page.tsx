import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getEnvironmentalAspects,
  AES_CONDITION_LABELS,
  AES_STATUS_LABELS,
  AES_SIGNIFICANCE_THRESHOLD,
} from '@/lib/db/environmental-aspects'
import Link from 'next/link'
import ExportExcelButton from '@/components/ExportExcelButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Aspects environnementaux | SOPAT Admin' }

const statusColors: Record<string, string> = {
  identified: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  controlled: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
  closed: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AspectsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const significantOnly = sp.significant === '1'
  const rows = await getEnvironmentalAspects({ significantOnly })

  const significant = rows.filter(({ aspect }) => aspect.isSignificant).length
  const controlled = rows.filter(({ aspect }) => aspect.status === 'controlled').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Aspects environnementaux (AES)
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            PLA-MI-04/05 / PRC-MI-11 — Identification et évaluation (Fréquence × Gravité, significatif ≥ {AES_SIGNIFICANCE_THRESHOLD})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton register="aspects" />
          <Link
            href="/admin/environment/aspects/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouvel aspect
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Significatifs', value: significant, color: significant > 0 ? 'var(--admin-red)' : 'var(--admin-text)' },
          { label: 'Maîtrisés', value: controlled, color: 'var(--admin-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/environment/aspects"
          className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
          style={!significantOnly
            ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
            : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
          }
        >
          Tous
        </Link>
        <Link
          href="/admin/environment/aspects?significant=1"
          className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
          style={significantOnly
            ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
            : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
          }
        >
          Significatifs uniquement
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Activité', 'Aspect', 'Condition', 'F×G', 'Significatif', 'Statut', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ aspect }) => (
                <tr key={aspect.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {aspect.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{aspect.activity}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{aspect.aspect}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {AES_CONDITION_LABELS[aspect.condition]}
                  </td>
                  <td className="px-4 py-3 font-bold text-[13px]" style={{
                    color: aspect.significance != null && aspect.significance >= AES_SIGNIFICANCE_THRESHOLD
                      ? 'var(--admin-red)'
                      : 'var(--admin-emerald)',
                  }}>
                    {aspect.significance ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {aspect.isSignificant ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--admin-red-dim)] text-[var(--admin-red)]">Oui</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[aspect.status]}`}>
                      {AES_STATUS_LABELS[aspect.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/environment/aspects/${aspect.id}`}
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
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun aspect environnemental.{' '}
                    <Link href="/admin/environment/aspects/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer le premier
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
