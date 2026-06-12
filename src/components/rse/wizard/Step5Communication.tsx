'use client'

import { useState } from 'react'
import type { WizardDraft } from '../EventWizard'

const PHASES = [
  { value: 'avant', label: 'Avant l\'événement' },
  { value: 'pendant', label: 'Pendant l\'événement' },
  { value: 'apres', label: 'Après l\'événement' },
]

const CHANNELS = [
  { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
  { value: 'email_interne', label: 'Email interne' },
  { value: 'presse', label: 'Presse' },
  { value: 'affichage', label: 'Affichage' },
  { value: 'autre', label: 'Autre' },
]

type CommAction = {
  phase: string
  actionDescription: string
  channel: string
  responsibleId: string | null
  notes: string
}

const emptyAction = (phase: string): CommAction => ({
  phase,
  actionDescription: '',
  channel: 'reseaux_sociaux',
  responsibleId: null,
  notes: '',
})

export function Step5Communication({
  draft,
  teamMembers,
  onBack,
  onNext,
}: {
  draft: WizardDraft
  teamMembers: Array<{ id: string; name: string }>
  onBack: () => void
  onNext: (data: Partial<WizardDraft>) => void
}) {
  const [actions, setActions] = useState<CommAction[]>(
    (draft.communication ?? []) as CommAction[]
  )

  function addAction(phase: string) {
    setActions((prev) => [...prev, emptyAction(phase)])
  }

  function updateAction(idx: number, patch: Partial<CommAction>) {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }

  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx))
  }

  const fieldStyle = {
    background: 'var(--admin-surface)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Étape 5 — Plan de communication
      </h2>

      {PHASES.map((phase) => {
        const phaseIndices = actions
          .map((a, i) => ({ a, i }))
          .filter(({ a }) => a.phase === phase.value)
          .map(({ i }) => i)

        return (
          <div key={phase.value} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                {phase.label}
              </h3>
              <button
                onClick={() => addAction(phase.value)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
              >
                + Ajouter
              </button>
            </div>

            {phaseIndices.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucune action</p>
            )}

            {phaseIndices.map((absIdx) => {
              const action = actions[absIdx]
              return (
                <div
                  key={absIdx}
                  className="rounded-lg border p-3 space-y-2"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Action {absIdx + 1}</span>
                    <button
                      onClick={() => removeAction(absIdx)}
                      className="text-xs"
                      style={{ color: 'var(--admin-red)' }}
                    >
                      ×
                    </button>
                  </div>

                  <input
                    value={action.actionDescription}
                    onChange={(e) => updateAction(absIdx, { actionDescription: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border text-sm"
                    style={fieldStyle}
                    placeholder="Description de l'action…"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={action.channel}
                      onChange={(e) => updateAction(absIdx, { channel: e.target.value })}
                      className="px-2 py-1.5 rounded border text-sm"
                      style={fieldStyle}
                    >
                      {CHANNELS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <select
                      value={action.responsibleId ?? ''}
                      onChange={(e) => updateAction(absIdx, { responsibleId: e.target.value || null })}
                      className="px-2 py-1.5 rounded border text-sm"
                      style={fieldStyle}
                    >
                      <option value="">Responsable (optionnel)</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext({ communication: actions })}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          Réviser →
        </button>
      </div>
    </div>
  )
}
