'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PHASES = [
  { value: 'avant', label: 'Avant l\'événement' },
  { value: 'pendant', label: 'Pendant l\'événement' },
  { value: 'apres', label: 'Après l\'événement' },
]

const CHANNEL_ICONS: Record<string, string> = {
  reseaux_sociaux: '📱',
  email_interne: '📧',
  presse: '📰',
  affichage: '🪧',
  autre: '📌',
}

const CHANNEL_LABELS: Record<string, string> = {
  reseaux_sociaux: 'Réseaux sociaux',
  email_interne: 'Email interne',
  presse: 'Presse',
  affichage: 'Affichage',
  autre: 'Autre',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  planifie: { label: 'Planifié', bg: '#eff6ff', text: '#1d4ed8' },
  publie:   { label: 'Publié',   bg: '#f0fdf4', text: '#15803d' },
  annule:   { label: 'Annulé',   bg: '#fef2f2', text: '#b91c1c' },
}

type CommAction = {
  id: string
  phase: string
  actionDescription: string
  channel: string
  responsibleId: string | null
  responsibleName: string | null
  status: string
  publishedAt: Date | string | null
  assetCloudinaryId: string | null
  notes: string | null
}

export function CommunicationEventTab({
  eventId,
  communication,
  teamMembers,
  canEdit,
}: {
  eventId: string
  communication: CommAction[]
  teamMembers: Array<{ id: string; name: string }>
  canEdit: boolean
}) {
  const router = useRouter()
  const [publishing, setPublishing] = useState<string | null>(null)

  async function markPublished(actionId: string) {
    setPublishing(actionId)
    const res = await fetch(`/api/rse/events/${eventId}/communication`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionId,
        status: 'publie',
        publishedAt: new Date().toISOString(),
      }),
    })
    setPublishing(null)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-6">
      {PHASES.map((phase) => {
        const actions = communication.filter((a) => a.phase === phase.value)
        return (
          <div key={phase.value}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
              {phase.label}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--admin-text-muted)' }}>
                ({actions.length})
              </span>
            </h3>

            {actions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune action planifiée</p>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => {
                  const statusConf = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.planifie
                  return (
                    <div
                      key={action.id}
                      className="rounded-xl border p-4"
                      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CHANNEL_ICONS[action.channel] ?? '📌'}</span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                              {action.actionDescription}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              {CHANNEL_LABELS[action.channel] ?? action.channel}
                              {action.responsibleName && ` • ${action.responsibleName}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: statusConf.bg, color: statusConf.text }}
                          >
                            {statusConf.label}
                          </span>

                          {canEdit && action.status === 'planifie' && (
                            <button
                              onClick={() => markPublished(action.id)}
                              disabled={publishing === action.id}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                            >
                              {publishing === action.id ? '…' : '✓ Publié'}
                            </button>
                          )}
                        </div>
                      </div>

                      {action.publishedAt && (
                        <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
                          Publié le {new Date(action.publishedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
