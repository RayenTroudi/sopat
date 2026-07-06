'use client'

import { useState, useCallback, useEffect } from 'react'
import type { MonthlyPlanRow, MonthlyTask } from '@/lib/db/entretien-plans'
import { STANDARD_MAINTENANCE_TASKS } from '@/lib/db/entretien-plans'

type Props = { projectId: string; canEdit: boolean }

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function currentMoisAnnee() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMoisAnnee(ma: string) {
  const [y, m] = ma.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

export function MonthlyPlanSection({ projectId, canEdit }: Props) {
  const [plans, setPlans] = useState<MonthlyPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMois, setSelectedMois] = useState<string>(currentMoisAnnee())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<MonthlyPlanRow>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/monthly-plan`)
    if (res.ok) { const d = await res.json() as MonthlyPlanRow[]; setPlans(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const current = plans.find((p) => p.moisAnnee === selectedMois)

  function startEdit() {
    const tasks: MonthlyTask[] = current?.tasks?.length
      ? current.tasks
      : STANDARD_MAINTENANCE_TASKS.map((t) => ({ ...t, frequency: '', prevu: false, realise: false, observation: '' }))
    setDraft({
      nombreInterventions: current?.nombreInterventions ?? 1,
      tasks,
      fournitures: current?.fournitures ?? '',
      clientIntervenants: current?.clientIntervenants ?? '',
      clientObservations: current?.clientObservations ?? '',
      clientBesoins: current?.clientBesoins ?? '',
      pmSignedDate: current?.pmSignedDate ?? '',
      clientSignedDate: current?.clientSignedDate ?? '',
    })
    setEditing(true)
  }

  function updateTask(i: number, field: keyof MonthlyTask, val: string | boolean) {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks?.map((t, idx) => idx === i ? { ...t, [field]: val } : t),
    }))
  }

  async function save() {
    setSaving(true)
    const body = { moisAnnee: selectedMois, ...draft }
    const res = await fetch(`/api/projects/${projectId}/monthly-plan`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) { await load(); setEditing(false) }
    setSaving(false)
  }

  const doneTasks = current?.tasks?.filter((t) => t.realise).length ?? 0
  const totalTasks = current?.tasks?.length ?? 0

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-start justify-between px-5 py-3 border-b gap-4" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Plan d'action mensuel d'entretien</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-04</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={selectedMois} onChange={(e) => { setSelectedMois(e.target.value); setEditing(false) }} className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
          {canEdit && !editing && (
            <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              {current ? 'Modifier' : 'Créer'}
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : editing ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{fmtMoisAnnee(selectedMois)}</span>
              <div className="flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                Nbre interventions:
                <input type="number" min={0} value={draft.nombreInterventions ?? 1} onChange={(e) => setDraft((d) => ({ ...d, nombreInterventions: parseInt(e.target.value) || 1 }))} className="input-xs w-16 text-center" />
              </div>
            </div>

            {/* Task checklist */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Tâche</th>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Fréquence</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Prévu</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Réalisé</th>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Outil</th>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.tasks?.map((task, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-2 py-1.5" style={{ color: 'var(--admin-text)' }}>{task.taskLabel}</td>
                      <td className="px-2 py-1.5"><input value={task.frequency ?? ''} onChange={(e) => updateTask(i, 'frequency', e.target.value)} placeholder="1× / semaine" className="input-xs w-28" /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={task.prevu} onChange={(e) => updateTask(i, 'prevu', e.target.checked)} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={task.realise} onChange={(e) => updateTask(i, 'realise', e.target.checked)} /></td>
                      <td className="px-2 py-1.5"><input value={task.outil ?? ''} onChange={(e) => updateTask(i, 'outil', e.target.value)} className="input-xs w-full" /></td>
                      <td className="px-2 py-1.5"><input value={task.observation ?? ''} onChange={(e) => updateTask(i, 'observation', e.target.value)} className="input-xs w-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Client feedback */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Fournitures utilisées</label>
                <textarea value={draft.fournitures ?? ''} onChange={(e) => setDraft((d) => ({ ...d, fournitures: e.target.value }))} rows={2} className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Intervenants client</label>
                <textarea value={draft.clientIntervenants ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientIntervenants: e.target.value }))} rows={2} className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Observations client</label>
                <textarea value={draft.clientObservations ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientObservations: e.target.value }))} rows={2} className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Besoins client</label>
                <textarea value={draft.clientBesoins ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientBesoins: e.target.value }))} rows={2} className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date signature PM</label>
                <input type="date" value={draft.pmSignedDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, pmSignedDate: e.target.value }))} className="input-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date signature client</label>
                <input type="date" value={draft.clientSignedDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientSignedDate: e.target.value }))} className="input-xs" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : !current ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun plan pour {fmtMoisAnnee(selectedMois)}.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Créer</button></>}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{fmtMoisAnnee(selectedMois)} · {current.nombreInterventions} intervention{current.nombreInterventions !== 1 ? 's' : ''}</span>
              <span style={{ color: 'var(--admin-text-muted)' }}>{doneTasks}/{totalTasks} tâches réalisées</span>
            </div>
            {totalTasks > 0 && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                <div className="h-full rounded-full" style={{ width: `${(doneTasks / totalTasks) * 100}%`, background: 'var(--admin-emerald)' }} />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Tâche', 'Fréquence', 'Prévu', 'Réalisé', 'Outil', 'Observation'].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.tasks?.map((t, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text)' }}>{t.taskLabel}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{t.frequency || '—'}</td>
                      <td className="px-2 py-2 text-center">{t.prevu ? '✓' : '—'}</td>
                      <td className="px-2 py-2 text-center" style={{ color: t.realise ? 'var(--admin-emerald)' : undefined }}>{t.realise ? '✓' : '—'}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{t.outil || '—'}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{t.observation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(current.pmSignedDate || current.clientSignedDate) && (
              <div className="flex gap-6 text-xs">
                <div><span style={{ color: 'var(--admin-text-muted)' }}>Signé PM: </span><span style={{ color: 'var(--admin-text)' }}>{current.pmSignedDate ? new Date(current.pmSignedDate).toLocaleDateString('fr-FR') : '—'}</span></div>
                <div><span style={{ color: 'var(--admin-text-muted)' }}>Signé client: </span><span style={{ color: 'var(--admin-text)' }}>{current.clientSignedDate ? new Date(current.clientSignedDate).toLocaleDateString('fr-FR') : '—'}</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Month navigator */}
      {plans.length > 0 && (
        <div className="px-5 py-2 border-t flex gap-2 flex-wrap" style={{ borderColor: 'var(--admin-border)' }}>
          {plans.map((p) => (
            <button key={p.moisAnnee} type="button" onClick={() => { setSelectedMois(p.moisAnnee); setEditing(false) }} className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: p.moisAnnee === selectedMois ? 'var(--admin-emerald-dim)' : 'var(--admin-border)', color: p.moisAnnee === selectedMois ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
              {fmtMoisAnnee(p.moisAnnee)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
