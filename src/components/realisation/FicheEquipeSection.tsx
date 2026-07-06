'use client'

import { useState } from 'react'
import type { TeamMemberRow } from '@/lib/db/realisation'

const DEFAULT_POSTES = [
  'Project Manager',
  'Site Manager',
  'Technical Manager',
  'Gardener 1',
  'Gardener 2',
  'Gardener 3',
  'Gardener 4',
  'Gardener 5',
]

type Props = {
  projectId: string
  initialMembers: TeamMemberRow[]
  canEdit: boolean
}

export function FicheEquipeSection({ projectId, initialMembers, canEdit }: Props) {
  const [members, setMembers] = useState<TeamMemberRow[]>(initialMembers)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TeamMemberRow[]>(initialMembers)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit() {
    setDraft(members.length > 0 ? members : DEFAULT_POSTES.map((p, i) => ({
      id: '',
      poste: p,
      titulaire: '',
      suppleant: '',
      isSubcontractor: false,
      subcontractorName: null,
      userId: null,
      phaseStartDate: null,
      phaseEndDate: null,
      sortOrder: i,
    })))
    setEditing(true)
    setError('')
  }

  function updateMember(i: number, field: keyof TeamMemberRow, value: string | boolean | null) {
    setDraft((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function addMember() {
    setDraft((prev) => [...prev, {
      id: '',
      poste: '',
      titulaire: '',
      suppleant: '',
      isSubcontractor: false,
      subcontractorName: null,
      userId: null,
      phaseStartDate: null,
      phaseEndDate: null,
      sortOrder: prev.length,
    }])
  }

  function removeMember(i: number) {
    setDraft((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/team-members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: draft.map((m, i) => ({ ...m, sortOrder: i })) }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur serveur')
        return
      }
      const saved = await res.json() as TeamMemberRow[]
      setMembers(saved.length > 0 ? saved : draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const subcontractors = members.filter((m) => m.isSubcontractor)
  const teamMembers = members.filter((m) => !m.isSubcontractor)

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Fiche Équipe Projet</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>FOR-RE-03 — {members.length} membre{members.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </button>
        )}
      </div>

      <div className="p-5">
        {editing ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Poste', 'Titulaire', 'Suppléant', 'Sous-traitant', 'Nom sous-traitant', ''].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-2 py-1.5">
                        <input
                          value={m.poste}
                          onChange={(e) => updateMember(i, 'poste', e.target.value)}
                          placeholder="Poste"
                          className="w-full px-2 py-1 rounded border text-xs"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={m.titulaire ?? ''}
                          onChange={(e) => updateMember(i, 'titulaire', e.target.value)}
                          placeholder="Nom"
                          className="w-full px-2 py-1 rounded border text-xs"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={m.suppleant ?? ''}
                          onChange={(e) => updateMember(i, 'suppleant', e.target.value)}
                          placeholder="Suppléant"
                          className="w-full px-2 py-1 rounded border text-xs"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={m.isSubcontractor}
                          onChange={(e) => updateMember(i, 'isSubcontractor', e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {m.isSubcontractor && (
                          <input
                            value={m.subcontractorName ?? ''}
                            onChange={(e) => updateMember(i, 'subcontractorName', e.target.value)}
                            placeholder="Nom entreprise"
                            className="w-full px-2 py-1 rounded border text-xs"
                            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeMember(i)} className="p-1 rounded hover:bg-[var(--admin-red-dim)]" style={{ color: 'var(--admin-text-muted)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={addMember} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>
              + Ajouter un membre
            </button>

            {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--admin-emerald)' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun membre. {canEdit && <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Compléter la fiche équipe</button>}
          </p>
        ) : (
          <div className="space-y-4">
            {teamMembers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {['Poste', 'Titulaire', 'Suppléant'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((m) => (
                      <tr key={m.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                        <td className="px-3 py-2 font-medium" style={{ color: 'var(--admin-text)' }}>{m.poste}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--admin-text)' }}>{m.titulaire ?? '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{m.suppleant ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {subcontractors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                  Sous-traitants ({subcontractors.length})
                </p>
                <div className="space-y-1">
                  {subcontractors.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                      <span className="font-medium text-xs" style={{ color: 'var(--admin-text)' }}>{m.subcontractorName ?? m.poste}</span>
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>· {m.titulaire ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
