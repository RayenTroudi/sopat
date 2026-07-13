import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMeetings } from '@/lib/db/meetings'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'PV de réunion | SOPAT Admin' }

export default async function MeetingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const rows = await getMeetings()
  const thisMonth = rows.filter(({ meeting }) => {
    const d = new Date(meeting.meetingDate)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            PV de réunion
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-04 — Procès-verbaux de réunion
          </p>
        </div>
        <Link
          href="/admin/meetings/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau PV
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        {[
          { label: 'Total', value: rows.length },
          { label: 'Ce mois-ci', value: thisMonth },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Date', 'Type', 'Lieu', 'Participants', 'Rédigé par', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ meeting, creatorName }) => (
                <tr key={meeting.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {meeting.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {new Date(meeting.meetingDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{meeting.meetingType ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{meeting.location ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{meeting.participants ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{creatorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/meetings/${meeting.id}`}
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
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun PV de réunion.{' '}
                    <Link href="/admin/meetings/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
