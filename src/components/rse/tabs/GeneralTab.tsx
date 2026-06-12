'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage: '🏖 Nettoyage plage',
  plantation: '🌳 Plantation',
  sensibilisation: '📢 Sensibilisation',
  team_building: '🤝 Team building',
  journee_environnement: '🌍 Journée environnement',
  autre: '⭐ Autre',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  planifie:  { label: 'Planifié',   bg: '#eff6ff', text: '#1d4ed8' },
  en_cours:  { label: 'En cours',   bg: '#fefce8', text: '#a16207' },
  termine:   { label: 'Terminé',    bg: '#f0fdf4', text: '#15803d' },
  annule:    { label: 'Annulé',     bg: '#fef2f2', text: '#b91c1c' },
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  planifie:  ['en_cours', 'annule'],
  en_cours:  ['termine', 'annule'],
  termine:   [],
  annule:    [],
}

type Props = {
  event: Record<string, unknown>
  teamMembers: Array<{ id: string; name: string }>
  canEdit: boolean
}

export function GeneralTab({ event, teamMembers, canEdit }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState((event.notes as string) ?? '')

  const status = event.status as string
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.planifie
  const transitions = STATUS_TRANSITIONS[status] ?? []

  async function changeStatus(newStatus: string) {
    const res = await fetch(`/api/rse/events/${event.id as string}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) router.refresh()
  }

  async function saveNotes() {
    setSaving(true)
    const res = await fetch(`/api/rse/events/${event.id as string}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); router.refresh() }
  }

  const date = new Date(event.date as string).toLocaleDateString('fr-FR', {
    dateStyle: 'full',
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Main info */}
      <div
        className="lg:col-span-2 rounded-xl border p-5 space-y-4"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>Détails</h3>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Type" value={EVENT_TYPE_LABELS[event.eventType as string] ?? String(event.eventType)} />
          <Info label="Date" value={date} />
          <Info label="Lieu" value={event.location as string} />
          <Info label="Coordinateur" value={event.coordinatorName as string} />
          {!!event.partnerName && <Info label="Partenariat" value={event.partnerName as string} />}
          {event.participantCountPlanned != null && (
            <Info label="Participants prévus" value={String(event.participantCountPlanned)} />
          )}
          {event.participantCountActual != null && (
            <Info label="Participants réels" value={String(event.participantCountActual)} />
          )}
        </div>

        {/* Notes */}
        <div className="border-t pt-3" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Notes</span>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs"
                style={{ color: 'var(--admin-emerald)' }}
              >
                Modifier
              </button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  background: 'var(--admin-bg)',
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-text)',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--admin-emerald)', color: '#fff' }}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: notes ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
              {notes || <span style={{ color: 'var(--admin-text-muted)' }}>Aucune note</span>}
            </p>
          )}
        </div>
      </div>

      {/* Status card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>Statut</h3>

        <span
          className="inline-block px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ background: statusConf.bg, color: statusConf.text }}
        >
          {statusConf.label}
        </span>

        {canEdit && transitions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Changer le statut :</p>
            {transitions.map((t) => {
              const conf = STATUS_CONFIG[t]
              return (
                <button
                  key={t}
                  onClick={() => changeStatus(t)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm border"
                  style={{
                    background: conf.bg,
                    borderColor: conf.text + '44',
                    color: conf.text,
                  }}
                >
                  → {conf.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="border-t pt-3 space-y-1" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Créé le {new Date(event.createdAt as string).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="font-medium mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}
