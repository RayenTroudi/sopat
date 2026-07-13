import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRisksOpportunities } from '@/lib/db/risks-opportunities'
import Link from 'next/link'
import ExportExcelButton from '@/components/ExportExcelButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Risques & Opportunités | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function RisksOpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const type = typeof sp.type === 'string' ? (sp.type as 'risk' | 'opportunity') : undefined
  const status = typeof sp.status === 'string' ? sp.status : undefined

  const rows = await getRisksOpportunities({ type, status })

  const risks = rows.filter(({ ro }) => ro.type === 'risk')
  const opps = rows.filter(({ ro }) => ro.type === 'opportunity')
  const highCriticality = risks.filter(({ ro }) => (ro.criticality ?? 0) >= 12).length

  const statusColors: Record<string, string> = {
    identified: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
    treated: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
    monitored: 'bg-[var(--admin-blue-dim,#e8f0fe)] text-[var(--admin-blue,#3b5bdb)]',
    closed: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Risques &amp; Opportunités
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-07 — Registre des risques et opportunités
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton register="risks-opportunities" />
          <Link
            href="/admin/risks-opportunities/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouveau
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Risques', value: risks.length, color: 'var(--admin-red)' },
          { label: 'Opportunités', value: opps.length, color: 'var(--admin-emerald)' },
          { label: 'Criticité élevée (≥12)', value: highCriticality, color: highCriticality > 0 ? 'var(--admin-red)' : 'var(--admin-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Risques', value: 'risk' },
          { label: 'Opportunités', value: 'opportunity' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/risks-opportunities?type=${value}` : '/admin/risks-opportunities'}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={type === value
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
                {['Réf.', 'Type', 'Catégorie', 'Description', 'Score', 'Statut', 'Responsable', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ ro }) => {
                const displayScore = ro.type === 'risk' ? ro.criticality : ro.score
                const scoreColor =
                  displayScore != null && displayScore >= 12
                    ? 'var(--admin-red)'
                    : displayScore != null && displayScore >= 6
                    ? 'var(--admin-amber)'
                    : 'var(--admin-emerald)'
                return (
                  <tr key={ro.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                        {ro.reference}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ro.type === 'risk'
                          ? 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]'
                          : 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
                      }`}>
                        {ro.type === 'risk' ? 'Risque' : 'Opportunité'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{ro.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{ro.description}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-[13px]" style={{ color: scoreColor }}>
                      {displayScore ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border-transparent ${statusColors[ro.status] ?? 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'}`}>
                        {ro.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{ro.owner ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/risks-opportunities/${ro.id}`}
                        className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--admin-accent)' }}
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun enregistrement.{' '}
                    <Link href="/admin/risks-opportunities/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
