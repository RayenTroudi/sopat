'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { ClientCard } from '@/components/clients/ClientCard'
import { ClientsFilterBar } from '@/components/clients/ClientsFilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ClientRow } from '@/lib/db/clients'

type Props = {
  canCreate:         boolean
  canSeeFullPrivate: boolean
}

function ClientsContent({ canCreate, canSeeFullPrivate }: Props) {
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)

  const type     = searchParams.get('type') ?? ''
  const country  = searchParams.get('country') ?? ''
  const featured = searchParams.get('featured') ?? ''

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (type)     params.set('type', type)
    if (country)  params.set('country', country)
    if (featured) params.set('featured', featured)
    fetch(`/api/clients?${params}`)
      .then((r) => r.json())
      .then((data) => { setClients(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [type, country, featured])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Clients
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {loading ? '…' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
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

      <ClientsFilterBar />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl p-4 h-32"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
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
          {clients.map((c) => (
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
              dmsDocumentCode={c.dmsDocumentCode}
              isMasked={c.clientType === 'residentiel_prive' && !canSeeFullPrivate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ClientsClient(props: Props) {
  return (
    <Suspense>
      <ClientsContent {...props} />
    </Suspense>
  )
}
