'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { GeneralTab } from './tabs/GeneralTab'
import { EquipesTab } from './tabs/EquipesTab'
import { LogistiqueTab } from './tabs/LogistiqueTab'
import { CommunicationEventTab } from './tabs/CommunicationEventTab'
import { ResultatsTab } from './tabs/ResultatsTab'

const TABS = [
  { id: 'general', label: 'Général' },
  { id: 'equipes', label: 'Équipes' },
  { id: 'logistique', label: 'Logistique' },
  { id: 'communication', label: 'Communication' },
  { id: 'resultats', label: 'Résultats' },
]

type Props = {
  event: Record<string, unknown>
  teams: unknown[]
  logistics: unknown[]
  retroplanning: unknown[]
  communication: unknown[]
  results: unknown | null
  teamMembers: Array<{ id: string; name: string; role: string }>
  activeTab: string
  canEdit: boolean
  currentUserId: string
}

export function EventTabs({
  event,
  teams,
  logistics,
  retroplanning,
  communication,
  results,
  teamMembers,
  activeTab,
  canEdit,
  currentUserId,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  function setTab(tab: string) {
    const params = new URLSearchParams(sp.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  const eventDate = new Date(event.date as string)
  const isPast = eventDate <= new Date()

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ background: 'var(--admin-bg)' }}
      >
        {TABS.map((tab) => {
          const isResults = tab.id === 'resultats'
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              disabled={isResults && !isPast}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--admin-surface)' : 'transparent',
                color: active
                  ? 'var(--admin-emerald)'
                  : isResults && !isPast
                  ? 'var(--admin-border)'
                  : 'var(--admin-text-muted)',
                cursor: isResults && !isPast ? 'not-allowed' : 'pointer',
              }}
              title={isResults && !isPast ? 'Disponible après la date de l\'événement' : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && (
        <GeneralTab event={event} teamMembers={teamMembers} canEdit={canEdit} />
      )}
      {activeTab === 'equipes' && (
        <EquipesTab
          eventId={event.id as string}
          teams={teams as never}
          teamMembers={teamMembers}
          canEdit={canEdit}
        />
      )}
      {activeTab === 'logistique' && (
        <LogistiqueTab
          eventId={event.id as string}
          logistics={logistics as never}
          canEdit={canEdit}
        />
      )}
      {activeTab === 'communication' && (
        <CommunicationEventTab
          eventId={event.id as string}
          communication={communication as never}
          teamMembers={teamMembers}
          canEdit={canEdit}
        />
      )}
      {activeTab === 'resultats' && isPast && (
        <ResultatsTab
          eventId={event.id as string}
          event={event}
          results={results as never}
          canEdit={canEdit}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
