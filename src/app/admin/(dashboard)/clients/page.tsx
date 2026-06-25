import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listClients } from '@/lib/db/clients'
import { ClientCard } from '@/components/clients/ClientCard'
import { ClientsFilterBar } from '@/components/clients/ClientsFilterBar'
import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Clients
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {clientsList.length} client{clientsList.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouveau client
          </Link>
        )}
      </div>

      <Suspense>
        <ClientsFilterBar />
      </Suspense>

      {clientsList.length === 0 ? (
        <div
          className="overflow-hidden"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
        >
          <EmptyState
            icon={Building2}
            title="Aucun client pour le moment"
            description={canCreate ? 'Créez le premier client pour commencer.' : undefined}
            action={canCreate ? (
              <Link
                href="/admin/clients/new"
                className="text-[13px] font-medium px-3 py-1.5 rounded transition-opacity hover:opacity-90"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                Créer le premier client
              </Link>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
