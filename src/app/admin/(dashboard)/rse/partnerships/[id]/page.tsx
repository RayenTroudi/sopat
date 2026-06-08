import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getRsePartnership,
  listRseCommitments,
  listRseCommunications,
} from '@/lib/db/rse'
import { listUsers } from '@/lib/db/team'
import { RsePartnershipTabs } from '@/components/rse/RsePartnershipTabs'
import { RsePartnershipsBadge } from '@/components/rse/RsePartnershipsBadge'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getRsePartnership(id)
  return { title: p ? `${p.conventionReference} | SOPAT Admin` : 'Partenariat RSE' }
}

export default async function RsePartnershipDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const sp = await searchParams
  const activeTab = sp.tab ?? 'convention'

  const [partnership, commitments, communications, allUsers] = await Promise.all([
    getRsePartnership(id),
    listRseCommitments(id),
    listRseCommunications(id),
    listUsers(),
  ])

  if (!partnership) notFound()

  const isAdminOrDirection = session.user.role === 'admin' || session.user.role === 'direction'

  const now = new Date()
  const daysUntilExpiry = partnership.endDate
    ? Math.ceil((new Date(partnership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin/rse/partnerships"
              className="text-xs"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              ← Partenariats RSE
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono" style={{ color: 'var(--admin-text)' }}>
              {partnership.conventionReference}
            </h1>
            <RsePartnershipsBadge status={partnership.status} />
            {daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 60 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
              >
                Expire dans {daysUntilExpiry} jour{daysUntilExpiry !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--admin-text)' }}>
            {partnership.partnerName}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <RsePartnershipTabs
        partnership={partnership}
        commitments={commitments}
        communications={communications}
        activeTab={activeTab}
        isAdminOrDirection={isAdminOrDirection}
        currentUserId={session.user.userId}
        currentUserName={session.user.name ?? session.user.email ?? 'Inconnu'}
        allUsers={allUsers}
      />
    </div>
  )
}
