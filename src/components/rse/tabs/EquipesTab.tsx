'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TEAM_LABELS: Record<string, string> = {
  rse: 'RSE',
  rh_communication: 'RH & Communication',
  logistique: 'Logistique',
  communication_marketing: 'Communication & Marketing',
  direction: 'Direction',
}

const TEAM_COLORS: Record<string, string> = {
  rse: '#22c55e',
  rh_communication: '#8b5cf6',
  logistique: '#f59e0b',
  communication_marketing: '#0ea5e9',
  direction: '#ef4444',
}

type Team = {
  id: string
  teamName: string
  teamLeaderId: string | null
  leaderName: string | null
  missions: string[] | null
  notes: string | null
}

export function EquipesTab({
  eventId,
  teams,
  teamMembers,
  canEdit,
}: {
  eventId: string
  teams: Team[]
  teamMembers: Array<{ id: string; name: string }>
  canEdit: boolean
}) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [localTeams, setLocalTeams] = useState(teams)
  const [newMissions, setNewMissions] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  function updateTeam(idx: number, patch: Partial<Team>) {
    setLocalTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  function addMission(idx: number) {
    const text = (newMissions[idx] ?? '').trim()
    if (!text) return
    const existing = localTeams[idx].missions ?? []
    updateTeam(idx, { missions: [...existing, text] })
    setNewMissions((prev) => ({ ...prev, [idx]: '' }))
  }

  function removeMission(teamIdx: number, missionIdx: number) {
    const missions = (localTeams[teamIdx].missions ?? []).filter((_, i) => i !== missionIdx)
    updateTeam(teamIdx, { missions })
  }

  function addTeam() {
    setLocalTeams((prev) => [
      ...prev,
      { id: '', teamName: 'rse', teamLeaderId: null, leaderName: null, missions: [], notes: null },
    ])
  }

  function removeTeam(idx: number) {
    setLocalTeams((prev) => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/rse/events/${eventId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teams: localTeams.map((t) => ({
          teamName: t.teamName,
          teamLeaderId: t.teamLeaderId,
          missions: t.missions ?? [],
          notes: t.notes,
        })),
      }),
    })
    setSaving(false)
    if (res.ok) { setEditMode(false); router.refresh() }
  }

  const fieldStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  if (editMode) {
    return (
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>Modifier les équipes</h3>
        </div>

        {localTeams.map((team, idx) => (
          <div key={idx} className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center justify-between">
              <Select value={team.teamName} onValueChange={(v) => updateTeam(idx, { teamName: v })}>
                <SelectTrigger className="h-9 text-sm bg-[#F4F8F5] w-52" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  {Object.entries(TEAM_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={() => removeTeam(idx)} className="text-xs" style={{ color: 'var(--admin-red)' }}>
                Supprimer
              </button>
            </div>
            <Select
              value={team.teamLeaderId ?? '__none__'}
              onValueChange={(v) => updateTeam(idx, { teamLeaderId: v === '__none__' ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectValue placeholder="Aucun chef" />
              </SelectTrigger>
              <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectItem value="__none__">Aucun chef</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(team.missions ?? []).map((m, mi) => (
                  <span key={mi} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                    {m}
                    <button onClick={() => removeMission(idx, mi)}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newMissions[idx] ?? ''}
                  onChange={(e) => setNewMissions((p) => ({ ...p, [idx]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMission(idx) } }}
                  className="flex-1 px-2 py-1.5 rounded border text-xs"
                  style={fieldStyle}
                  placeholder="Ajouter une mission…"
                />
                <button onClick={() => addMission(idx)} className="px-2 py-1.5 rounded text-xs" style={{ background: 'var(--admin-emerald)', color: '#fff' }}>+</button>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addTeam} className="w-full py-2 rounded-lg border border-dashed text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          + Ajouter une équipe
        </button>

        <div className="flex gap-2 justify-end">
          <button onClick={() => { setLocalTeams(teams); setEditMode(false) }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--admin-emerald)', color: '#fff' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {localTeams.length} équipe{localTeams.length !== 1 ? 's' : ''}
        </p>
        {canEdit && (
          <button onClick={() => setEditMode(true)} className="text-sm" style={{ color: 'var(--admin-emerald)' }}>
            Modifier
          </button>
        )}
      </div>

      {localTeams.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune équipe configurée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {localTeams.map((team, idx) => {
            const color = TEAM_COLORS[team.teamName] ?? '#6b7280'
            return (
              <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
                <div className="h-1" style={{ background: color }} />
                <div className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
                    {TEAM_LABELS[team.teamName] ?? team.teamName}
                  </h4>
                  {team.leaderName && (
                    <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      Chef : {team.leaderName}
                    </p>
                  )}
                  {(team.missions ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(team.missions ?? []).map((m, mi) => (
                        <span key={mi} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
