import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listClients } from '@/lib/db/clients'
import { ClientCard } from '@/components/clients/ClientCard'
import { ClientsFilterBar } from '@/components/clients/ClientsFilterBar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clients | SOPAT Admin' }

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')
  if (!ALLOWED_ROLES.includes(session.user.role)) redirect('/admin')

  const sp = await searchParams
  const clientsList = await listClients({
    type: sp.type,
    country: sp.country,
    isFeatured: sp.featured === 'true' ? true : undefined,
  })

  const role = session.user.role
  const canCreate = ['admin', 'direction', 'etudes_chef'].includes(role)
  const canSeeFullPrivate = ['admin', 'direction'].includes(role)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Clients
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          {clientsList.length} client{clientsList.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Suspense>
        <ClientsFilterBar canCreate={canCreate} />
      </Suspense>

      {clientsList.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <p className="text-4xl mb-3">🏢</p>
          <p className="font-medium" style={{ color: 'var(--admin-text)' }}>
            Aucun client pour le moment
          </p>
          {canCreate && (
            <a
              href="/admin/clients/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--admin-emerald)', color: '#fff' }}
            >
              Créer le premier client
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clientsList.map((c) => (
            <ClientCard
              key={c.id}
              id={c.id}
              companyName={c.companyName}
              displayName={c.displayName}
              clientType={c.clientType}
              country={c.country}
              logoUrl={c.logoUrl}
              projectCount={c.projectCount}
              lastProjectDate={c.lastProjectDate}
              totalRevenueTND={c.totalRevenueTND}
              isMasked={c.clientType === 'residentiel_prive' && !canSeeFullPrivate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
