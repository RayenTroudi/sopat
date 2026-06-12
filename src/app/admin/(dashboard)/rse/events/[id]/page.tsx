import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import {
  getRseEvent,
  getEventTeams,
  getEventLogistics,
  getEventRetroplanning,
  getEventCommunicationPlan,
  getEventResults,
} from '@/lib/db/rse-events'
import { db } from '../../../../../../../db/index'
import { users } from '../../../../../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { Suspense } from 'react'
import { EventTabs } from '@/components/rse/EventTabs'

export default async function RseEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const { id } = await params
  const sp = await searchParams

  const [event, teams, logistics, retroplanning, communication, results, teamMembers] =
    await Promise.all([
      getRseEvent(id),
      getEventTeams(id),
      getEventLogistics(id),
      getEventRetroplanning(id),
      getEventCommunicationPlan(id),
      getEventResults(id),
      db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(and(eq(users.isActive, true)))
        .orderBy(users.name),
    ])

  if (!event) notFound()

  const canEdit = session.user.role === 'admin' || session.user.role === 'direction'
  const activeTab = sp.tab ?? 'general'

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <a href="/admin/rse/events" className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            ← Événements RSE
          </a>
          <h1 className="text-xl font-bold mt-0.5" style={{ color: 'var(--admin-text)' }}>
            {event.title}
          </h1>
          <p className="text-sm font-mono" style={{ color: 'var(--admin-text-muted)' }}>
            {event.eventReference}
          </p>
        </div>
      </div>

      <Suspense>
        <EventTabs
          event={event}
          teams={teams}
          logistics={logistics}
          retroplanning={retroplanning}
          communication={communication}
          results={results}
          teamMembers={teamMembers}
          activeTab={activeTab}
          canEdit={canEdit}
          currentUserId={session.user.userId}
        />
      </Suspense>
    </div>
  )
}
