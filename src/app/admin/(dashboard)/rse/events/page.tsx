import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listRseEvents } from '@/lib/db/rse-events'
import { EventCard } from '@/components/rse/EventCard'
import { EventsFilterBar } from '@/components/rse/EventsFilterBar'

export default async function RseEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const sp = await searchParams
  const events = await listRseEvents({
    type: sp.type,
    status: sp.status,
    year: sp.year ? Number(sp.year) : undefined,
  })

  const canCreate = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Événements RSE
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          {events.length} événement{events.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <Suspense>
        <EventsFilterBar canCreate={canCreate} />
      </Suspense>

      {/* Grid */}
      {events.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-medium" style={{ color: 'var(--admin-text)' }}>
            Aucun événement RSE pour le moment
          </p>
          {canCreate && (
            <a
              href="/admin/rse/events/new?step=1"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--admin-emerald)', color: '#fff' }}
            >
              Créer le premier événement
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              eventReference={event.eventReference}
              title={event.title}
              eventType={event.eventType}
              date={event.date}
              location={event.location}
              partnerName={event.partnerName}
              participantCountPlanned={event.participantCountPlanned}
              status={event.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
