import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listRsePartnerships, type RsePartnershipStatus, type RsePartnerType } from '@/lib/db/rse'
import { RsePartnershipsClient } from '@/components/rse/RsePartnershipsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partenariats RSE | SOPAT Admin' }

export default async function RsePartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const rows = await listRsePartnerships({
    status: (sp.status as RsePartnershipStatus) || undefined,
    partnerType: (sp.partnerType as RsePartnerType) || undefined,
  })

  const canCreate = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
            Partenariats RSE
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Conventions de collaboration environnementale SOPAT
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/rse/partnerships/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto"
            style={{ background: 'var(--admin-emerald)', color: '#fff' }}
          >
            + Nouveau partenariat
          </Link>
        )}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <RsePartnershipsClient
          rows={rows}
          initialStatus={sp.status ?? ''}
          initialPartnerType={sp.partnerType ?? ''}
        />
      </div>
    </div>
  )
}
