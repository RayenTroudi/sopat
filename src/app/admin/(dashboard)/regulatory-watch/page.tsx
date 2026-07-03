import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRegulatoryWatchEntries } from '@/lib/db/regulatory-watch'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Veille Réglementaire | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function RegulatoryWatchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const status = typeof sp.status === 'string' ? sp.status : undefined
  const entries = await getRegulatoryWatchEntries(status)

  const applicable = entries.filter(({ entry }) => entry.status === 'applicable').length
  const enVeille = entries.filter(({ entry }) => entry.status === 'en_veille').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Veille Réglementaire
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            LIS-MI-07 — Registre des exigences légales et réglementaires
          </p>
        </div>
        <Link
          href="/admin/regulatory-watch/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau texte
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: entries.length, color: 'var(--admin-text)' },
          { label: 'Applicables', value: applicable, color: 'var(--admin-emerald)' },
          { label: 'En veille', value: enVeille, color: 'var(--admin-amber)' },
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
          { label: 'Applicable', value: 'applicable' },
          { label: 'En veille', value: 'en_veille' },
          { label: 'Non applicable', value: 'non_applicable' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/regulatory-watch?status=${value}` : '/admin/regulatory-watch'}
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
                {['Réf.', 'Titre', 'Domaine', 'Organisme', 'Date effet', 'Statut', 'Prochaine révision'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(({ entry }) => (
                <tr key={entry.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {entry.reference ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-[13px] truncate" style={{ color: 'var(--admin-text)' }}>{entry.title}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{entry.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{entry.issuingBody ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{entry.effectiveDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'applicable'
                        ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
                        : entry.status === 'en_veille'
                        ? 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'
                        : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
                    }`}>
                      {entry.status === 'applicable' ? 'Applicable' : entry.status === 'en_veille' ? 'En veille' : 'Non applicable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{entry.nextReviewDate ?? '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun texte réglementaire enregistré.{' '}
                    <Link href="/admin/regulatory-watch/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Ajouter le premier
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
