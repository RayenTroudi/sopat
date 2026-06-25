'use client'

import { useState } from 'react'
import type { WizardDraft } from '../EventWizard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TEAM_NAMES = [
  { value: 'rse', label: 'RSE' },
  { value: 'rh_communication', label: 'RH & Communication' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'communication_marketing', label: 'Communication & Marketing' },
  { value: 'direction', label: 'Direction' },
]

type Team = {
  teamName: string
  teamLeaderId: string | null
  missions: string[]
  notes: string
}

export function Step2Teams({
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
  const [teams, setTeams] = useState<Team[]>(
    (draft.teams ?? []) as Team[]
  )
  const [newMissions, setNewMissions] = useState<Record<string, string>>({})

  function updateTeam(idx: number, patch: Partial<Team>) {
    setTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  function addTeam() {
    setTeams((prev) => [
      ...prev,
      { teamName: TEAM_NAMES[0].value, teamLeaderId: null, missions: [], notes: '' },
    ])
  }

  function removeTeam(idx: number) {
    setTeams((prev) => prev.filter((_, i) => i !== idx))
  }

  function addMission(idx: number) {
    const text = (newMissions[idx] ?? '').trim()
    if (!text) return
    updateTeam(idx, { missions: [...teams[idx].missions, text] })
    setNewMissions((prev) => ({ ...prev, [idx]: '' }))
  }

  function removeMission(teamIdx: number, missionIdx: number) {
    const missions = teams[teamIdx].missions.filter((_, i) => i !== missionIdx)
    updateTeam(teamIdx, { missions })
  }

  const fieldStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Étape 2 — Équipes impliquées
      </h2>

      {teams.map((team, idx) => (
        <div
          key={idx}
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              Équipe {idx + 1}
            </span>
            <button
              onClick={() => removeTeam(idx)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--admin-red)', background: 'var(--admin-red-dim)' }}
            >
              Supprimer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Nom de l&apos;équipe</label>
              <Select value={team.teamName} onValueChange={(v) => updateTeam(idx, { teamName: v })}>
                <SelectTrigger className="h-9 text-sm bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  {TEAM_NAMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Chef d&apos;équipe</label>
              <Select
                value={team.teamLeaderId ?? '__none__'}
                onValueChange={(v) => updateTeam(idx, { teamLeaderId: v === '__none__' ? null : v })}
              >
                <SelectTrigger className="h-9 text-sm bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Missions</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {team.missions.map((m, mi) => (
                <span
                  key={mi}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                >
                  {m}
                  <button onClick={() => removeMission(idx, mi)} className="ml-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMissions[idx] ?? ''}
                onChange={(e) => setNewMissions((prev) => ({ ...prev, [idx]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMission(idx) } }}
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm"
                style={fieldStyle}
                placeholder="Ajouter une mission…"
              />
              <button
                onClick={() => addMission(idx)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--admin-emerald)', color: '#fff' }}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
            <input
              type="text"
              value={team.notes}
              onChange={(e) => updateTeam(idx, { notes: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg border text-sm"
              style={fieldStyle}
            />
          </div>
        </div>
      ))}

      <button
        onClick={addTeam}
        className="w-full py-2 rounded-lg border text-sm font-medium border-dashed"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
      >
        + Ajouter une équipe
      </button>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext({ teams })}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
