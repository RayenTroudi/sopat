import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getMeetingById } from '@/lib/db/meetings'
import Link from 'next/link'
import MeetingActionsPanel from './MeetingActionsPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'PV de réunion | SOPAT Admin' }

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const data = await getMeetingById(id)
  if (!data) notFound()
  const { meeting, actions } = data

  const fields: { label: string; value: string | null }[] = [
    { label: 'Participants', value: meeting.participants },
    { label: 'Absents excusés', value: meeting.absentees },
    { label: 'Ordre du jour', value: meeting.agenda },
    { label: 'Points discutés', value: meeting.discussions },
    { label: 'Décisions prises', value: meeting.decisions },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/meetings" className="text-[13px] hover:opacity-70" style={{ color: 'var(--admin-text-muted)' }}>
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            PV {meeting.reference}
          </h1>
          {meeting.meetingType && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
              {meeting.meetingType}
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(meeting.meetingDate).toLocaleDateString('fr-FR')}
          {meeting.location ? ` · ${meeting.location}` : ''}
        </p>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <dl className="space-y-4">
          {fields.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value || '—'}</dd>
            </div>
          ))}
          {meeting.nextMeetingDate && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Prochaine réunion</dt>
              <dd className="col-span-2" style={{ color: 'var(--admin-text)' }}>
                {new Date(meeting.nextMeetingDate).toLocaleDateString('fr-FR')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <MeetingActionsPanel
        meetingId={meeting.id}
        actions={actions.map((a) => ({
          id: a.id,
          description: a.description,
          responsible: a.responsible,
          targetDate: a.targetDate,
          completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        }))}
      />
    </div>
  )
}
