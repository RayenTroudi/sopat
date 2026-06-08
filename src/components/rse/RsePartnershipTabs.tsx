'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ConventionTab } from './tabs/ConventionTab'
import { EngagementsTab } from './tabs/EngagementsTab'
import { CommunicationTab } from './tabs/CommunicationTab'
import type { RsePartnershipDetail, RseCommitment, RseCommunication } from '@/lib/db/rse'
import type { TeamMemberRow } from '@/lib/db/team'

const TABS = [
  { key: 'convention', label: 'Convention' },
  { key: 'engagements', label: 'Engagements' },
  { key: 'communication', label: 'Communication' },
]

type Props = {
  partnership: RsePartnershipDetail
  commitments: RseCommitment[]
  communications: RseCommunication[]
  activeTab: string
  isAdminOrDirection: boolean
  currentUserId: string
  currentUserName: string
  allUsers: TeamMemberRow[]
}

export function RsePartnershipTabs({
  partnership,
  commitments,
  communications,
  activeTab,
  isAdminOrDirection,
  currentUserId,
  currentUserName,
  allUsers,
}: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function tabHref(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={{
                color: active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                borderBottom: active ? '2px solid var(--admin-emerald)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="pt-5">
        {activeTab === 'convention' && (
          <ConventionTab
            partnership={partnership}
            isAdminOrDirection={isAdminOrDirection}
            allUsers={allUsers}
          />
        )}
        {activeTab === 'engagements' && (
          <EngagementsTab
            partnershipId={partnership.id}
            commitments={commitments}
            isAdminOrDirection={isAdminOrDirection}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        )}
        {activeTab === 'communication' && (
          <CommunicationTab
            partnershipId={partnership.id}
            communications={communications}
            isAdminOrDirection={isAdminOrDirection}
            currentUserId={currentUserId}
            sopatReferentId={partnership.sopatReferentId}
          />
        )}
      </div>
    </div>
  )
}
