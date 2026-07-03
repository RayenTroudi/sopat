import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHseSubmissions } from '@/lib/db/hse'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Checklist HSE | SOPAT Admin' }

export default async function HseChecklistPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const submissions = await getHseSubmissions()
  const conformes = submissions.filter(({ submission }) => submission.overallStatus === 'conforme').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Checklist HSE
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-12 — Suivi hygiène, sécurité et environnement
          </p>
        </div>
        <Link
          href="/admin/environment/hse-checklist/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle soumission
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total soumissions', value: submissions.length, color: 'var(--admin-text)' },
          { label: 'Conformes', value: conformes, color: 'var(--admin-emerald)' },
          {
            label: 'Taux conformité',
            value: submissions.length > 0 ? `${Math.round((conformes / submissions.length) * 100)}%` : '—',
            color: submissions.length === 0 ? 'var(--admin-text-muted)'
              : conformes / submissions.length >= 0.9 ? 'var(--admin-emerald)'
              : 'var(--admin-amber)',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Date', 'Département', 'Statut global', 'Soumis par', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map(({ submission, creatorName }) => (
              <tr key={submission.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{submission.submittedDate}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>{submission.dept}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    submission.overallStatus === 'conforme' ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]' :
                    submission.overallStatus === 'partiel' ? 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]' :
                    'bg-[var(--admin-red-dim)] text-[var(--admin-red)]'
                  }`}>
                    {submission.overallStatus === 'conforme' ? 'Conforme' :
                     submission.overallStatus === 'partiel' ? 'Partiel' : 'Non conforme'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{creatorName}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/environment/hse-checklist/${submission.id}`}
                    className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--admin-accent)' }}
                  >
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Aucune soumission.{' '}
                  <Link href="/admin/environment/hse-checklist/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                    Créer la première
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
