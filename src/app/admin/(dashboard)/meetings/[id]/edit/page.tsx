import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getMeetingById } from '@/lib/db/meetings'
import { getProjectsForSelect } from '@/lib/db/achat'
import { getRecordAuditTrail } from '@/lib/audit'
import EditMeetingClient from './EditMeetingClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Éditer le PV | SOPAT Admin' }

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const data = await getMeetingById(id)
  if (!data) notFound()

  const [projectList, auditTrail] = await Promise.all([
    getProjectsForSelect(),
    getRecordAuditTrail('meeting_minute', id),
  ])

  const { meeting, participants, agenda, actions } = data

  return (
    <EditMeetingClient
      meeting={{
        id: meeting.id,
        reference: meeting.reference,
        meetingDate: meeting.meetingDate,
        meetingType: meeting.meetingType,
        location: meeting.location,
        projectId: meeting.projectId,
        status: meeting.status,
        revisionNumber: meeting.revisionNumber,
        recommendations: meeting.recommendations,
        nextMeetingDate: meeting.nextMeetingDate,
        nextMeetingTime: meeting.nextMeetingTime,
      }}
      projects={projectList}
      participants={participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        position: p.position,
        present: p.present,
      }))}
      agenda={agenda.map((a) => ({
        id: a.id,
        plannedItem: a.plannedItem,
        discussedPoints: a.discussedPoints,
      }))}
      actions={actions.map((a) => ({
        id: a.id,
        description: a.description,
        responsible: a.responsible,
        targetDate: a.targetDate,
        actualDate: a.actualDate,
        followUp: a.followUp,
        comments: a.comments,
      }))}
      auditTrail={auditTrail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorName: entry.actorName,
        occurredAt: entry.occurredAt.toISOString(),
        metadata: entry.metadata as Record<string, unknown> | null,
      }))}
    />
  )
}
