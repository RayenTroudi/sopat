'use client'

import type { WizardDraft } from '../EventWizard'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage: 'Nettoyage plage',
  plantation: 'Plantation',
  sensibilisation: 'Sensibilisation',
  team_building: 'Team building',
  journee_environnement: 'Journée environnement',
  autre: 'Autre',
}

const TEAM_LABELS: Record<string, string> = {
  rse: 'RSE',
  rh_communication: 'RH & Communication',
  logistique: 'Logistique',
  communication_marketing: 'Communication & Marketing',
  direction: 'Direction',
}

const CHANNEL_LABELS: Record<string, string> = {
  reseaux_sociaux: 'Réseaux sociaux',
  email_interne: 'Email interne',
  presse: 'Presse',
  affichage: 'Affichage',
  autre: 'Autre',
}

export function StepReview({
  draft,
  teamMembers,
  partnerships,
  onBack,
  onSubmit,
  submitting,
}: {
  draft: WizardDraft
  teamMembers: Array<{ id: string; name: string }>
  partnerships: Array<{ id: string; partnerName: string }>
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const coordinator = teamMembers.find((m) => m.id === draft.sopatCoordinatorId)
  const partner = partnerships.find((p) => p.id === draft.partnerId)

  const sectionStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Révision — Récapitulatif
      </h2>

      {/* General */}
      <div className="rounded-lg border p-4 space-y-1.5" style={sectionStyle}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>Général</h3>
        <Row label="Titre" value={draft.title} />
        <Row label="Type" value={EVENT_TYPE_LABELS[draft.eventType ?? ''] ?? draft.eventType} />
        <Row label="Date" value={draft.date ? new Date(draft.date).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined} />
        <Row label="Lieu" value={draft.location} />
        <Row label="Coordinateur" value={coordinator?.name} />
        <Row label="Partenariat" value={partner?.partnerName} />
        <Row label="Participants prévus" value={draft.participantCountPlanned} />
        {draft.notes && <Row label="Notes" value={draft.notes} />}
      </div>

      {/* Teams */}
      {(draft.teams ?? []).length > 0 && (
        <div className="rounded-lg border p-4" style={sectionStyle}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            Équipes ({draft.teams!.length})
          </h3>
          {draft.teams!.map((t, i) => {
            const leader = teamMembers.find((m) => m.id === t.teamLeaderId)
            return (
              <div key={i} className="mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                  {TEAM_LABELS[t.teamName] ?? t.teamName}
                </span>
                {leader && <span className="text-xs ml-2" style={{ color: 'var(--admin-text-muted)' }}>({leader.name})</span>}
                {t.missions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.missions.map((m, mi) => (
                      <span key={mi} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Logistics */}
      {(draft.logistics ?? []).length > 0 && (
        <div className="rounded-lg border p-4" style={sectionStyle}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            Logistique ({draft.logistics!.length} article{draft.logistics!.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-1">
            {draft.logistics!.map((it, i) => (
              <div key={i} className="text-xs flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                <span>•</span>
                <span className="font-medium" style={{ color: 'var(--admin-text)' }}>{it.itemName}</span>
                {it.quantityPlanned && <span>× {it.quantityPlanned} {it.unit}</span>}
                {it.cost && <span className="ml-auto">{it.cost} DT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retroplanning */}
      {(draft.retroplanning ?? []).length > 0 && (
        <div className="rounded-lg border p-4" style={sectionStyle}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            Rétro-planning ({draft.retroplanning!.length} tâche{draft.retroplanning!.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-1">
            {draft.retroplanning!.map((t, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span style={{ color: 'var(--admin-text)' }}>• {t.taskDescription}</span>
                {t.deadline && <span style={{ color: 'var(--admin-text-muted)' }}>— {new Date(t.deadline).toLocaleDateString('fr-FR')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication */}
      {(draft.communication ?? []).length > 0 && (
        <div className="rounded-lg border p-4" style={sectionStyle}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
            Plan de communication ({draft.communication!.length} action{draft.communication!.length !== 1 ? 's' : ''})
          </h3>
          <div className="space-y-1">
            {draft.communication!.map((a, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span style={{ color: 'var(--admin-text-muted)' }}>[{a.phase}]</span>
                <span style={{ color: 'var(--admin-text)' }}>{a.actionDescription}</span>
                <span style={{ color: 'var(--admin-text-muted)' }}>— {CHANNEL_LABELS[a.channel] ?? a.channel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          ← Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || !draft.title || !draft.eventType}
          className="px-6 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: submitting ? 'var(--admin-border)' : 'var(--admin-emerald)',
            color: '#fff',
            opacity: !draft.title || !draft.eventType ? 0.5 : 1,
          }}
        >
          {submitting ? 'Création…' : 'Créer l\'événement'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-36 shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}
