import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getMeetingById, MEETING_STATUS_LABELS } from '@/lib/db/meetings'
import Link from 'next/link'
import MeetingActionsPanel from './MeetingActionsPanel'
import AiMeetingPanel from './AiMeetingPanel'

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
  const { meeting, participants, agenda, actions } = data

  const fields: { label: string; value: string | null }[] = [
    // Capture libre historique : n'est affichée que si elle porte encore
    // quelque chose que la saisie structurée ne reprend pas.
    ...(participants.length === 0 ? [{ label: 'Participants', value: meeting.participants }] : []),
    { label: 'Absents excusés', value: meeting.absentees },
    ...(agenda.length === 0
      ? [
          { label: 'Ordre du jour', value: meeting.agenda },
          { label: 'Points discutés', value: meeting.discussions },
        ]
      : []),
    { label: 'Décisions prises', value: meeting.decisions },
    { label: 'Recommandations', value: meeting.recommendations },
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
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {new Date(meeting.meetingDate).toLocaleDateString('fr-FR')}
            {meeting.location ? ` · ${meeting.location}` : ''}
            {` · ${MEETING_STATUS_LABELS[meeting.status] ?? meeting.status} · rév. ${meeting.revisionNumber}`}
          </span>
          <Link
            href={`/admin/meetings/${meeting.id}/edit`}
            className="text-[13px] font-medium px-3 py-1.5 rounded border"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
          >
            Éditer
          </Link>
        </div>
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

      {participants.length > 0 && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Participant(s)
          </h2>
          <ul className="space-y-1">
            {participants.map((p) => (
              <li key={p.id} className="text-sm" style={{ color: 'var(--admin-text)' }}>
                {p.fullName}
                {p.position ? <span style={{ color: 'var(--admin-text-muted)' }}> — {p.position}</span> : null}
                {!p.present && <span style={{ color: 'var(--admin-text-muted)' }}> (absent)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {agenda.length > 0 && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Ordre du jour
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[560px]">
              <thead>
                <tr className="text-left text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                  <th className="py-1.5 pr-3 font-medium w-10">N°</th>
                  <th className="py-1.5 pr-3 font-medium">Ordre de jour prévu</th>
                  <th className="py-1.5 font-medium">Points traités</th>
                </tr>
              </thead>
              <tbody>
                {agenda.map((a, index) => (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="py-2 pr-3 align-top" style={{ color: 'var(--admin-text-muted)' }}>{index + 1}</td>
                    <td className="py-2 pr-3 align-top whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{a.plannedItem || '—'}</td>
                    <td className="py-2 align-top whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{a.discussedPoints || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Réunions assistées uniquement : un PV saisi à la main n'affiche rien
          de plus qu'avant. */}
      {meeting.source === 'ai_assistant' && <AiMeetingPanel meetingId={meeting.id} />}

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
