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

function seedTasks(existing: MonthlyTask[]): MonthlyTask[] {
  return STANDARD_MAINTENANCE_TASKS.map((def) => {
    const found = existing.find((t) => t.taskLabel === def.taskLabel)
    return found ?? { ...def, frequency: '', prevu: false, realise: false, observation: '' }
  })
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
    setDraft({
      nombreInterventions: current?.nombreInterventions ?? 1,
      tasks: seedTasks(current?.tasks ?? []),
      fournitures: current?.fournitures ?? '',
      intervenants: current?.intervenants ?? '',
      clientIntervenants: current?.clientIntervenants ?? '',
      clientObservations: current?.clientObservations ?? '',
      clientBesoins: current?.clientBesoins ?? '',
      clientName: current?.clientName ?? '',
      pmObservations: current?.pmObservations ?? '',
      pmName: current?.pmName ?? '',
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

  function toggleNonApplicable(i: number) {
    setDraft((d) => ({
      ...d,
      tasks: d.tasks?.map((t, idx) => idx === i ? { ...t, nonApplicable: !t.nonApplicable } : t),
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

  const displayTasks = editing ? (draft.tasks ?? []) : seedTasks(current?.tasks ?? [])
  const applicableTasks = displayTasks.filter((t) => !t.nonApplicable)
  const doneTasks = applicableTasks.filter((t) => t.realise).length
  const prevuTasks = applicableTasks.filter((t) => t.prevu).length

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 py-3 border-b gap-4 flex-wrap" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Plan d'action mensuel d'entretien</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-04</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMois}
            onChange={(e) => { setSelectedMois(e.target.value); setEditing(false) }}
            className="px-2 py-1 rounded border text-xs"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
          />
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
          <div className="py-4 flex justify-center">
            <span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : editing ? (
          <EditView
            draft={draft}
            setDraft={setDraft}
            selectedMois={selectedMois}
            updateTask={updateTask}
            toggleNonApplicable={toggleNonApplicable}
            saving={saving}
            onSave={() => void save()}
            onCancel={() => setEditing(false)}
          />
        ) : !current ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun plan pour {fmtMoisAnnee(selectedMois)}.
            {canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-emerald)' }}>Créer</button></>}
          </p>
        ) : (
          <ReadView
            current={current}
            selectedMois={selectedMois}
            displayTasks={displayTasks}
            doneTasks={doneTasks}
            prevuTasks={prevuTasks}
            applicableTasks={applicableTasks}
          />
        )}
      </div>

      {/* ── Month navigator ── */}
      {plans.length > 0 && (
        <div className="px-5 py-2 border-t flex gap-2 flex-wrap" style={{ borderColor: 'var(--admin-border)' }}>
          {plans.map((p) => (
            <button key={p.moisAnnee} type="button" onClick={() => { setSelectedMois(p.moisAnnee); setEditing(false) }}
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{ background: p.moisAnnee === selectedMois ? 'var(--admin-emerald-dim)' : 'color-mix(in srgb, var(--admin-border) 50%, transparent)', color: p.moisAnnee === selectedMois ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
              {fmtMoisAnnee(p.moisAnnee)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Read View ─────────────────────────────────────────────────────────────────

function ReadView({ current, selectedMois, displayTasks, doneTasks, prevuTasks, applicableTasks }: {
  current: MonthlyPlanRow
  selectedMois: string
  displayTasks: MonthlyTask[]
  doneTasks: number
  prevuTasks: number
  applicableTasks: MonthlyTask[]
}) {
  return (
    <div className="space-y-5">
      {/* Doc header info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs px-4 py-3 rounded-lg" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
        <div><p style={{ color: 'var(--admin-text-muted)' }}>Mois et Année</p><p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{fmtMoisAnnee(selectedMois)}</p></div>
        <div><p style={{ color: 'var(--admin-text-muted)' }}>Nbre interventions — Prévu</p><p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{prevuTasks}</p></div>
        <div><p style={{ color: 'var(--admin-text-muted)' }}>Nbre interventions — Réalisé</p><p className="font-semibold" style={{ color: 'var(--admin-emerald)' }}>{doneTasks}</p></div>
        <div><p style={{ color: 'var(--admin-text-muted)' }}>Progression</p>
          <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{applicableTasks.length > 0 ? Math.round((doneTasks / applicableTasks.length) * 100) : 0}%</p>
        </div>
      </div>

      {/* Progress bar */}
      {applicableTasks.length > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(doneTasks / applicableTasks.length) * 100}%`, background: 'var(--admin-emerald)' }} />
        </div>
      )}

      {/* Tasks table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--admin-border)' }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
              <th className="text-left px-3 py-2 font-medium w-6" style={{ color: 'var(--admin-text-muted)' }}>N°</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Tâches des interventions</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Fourniture(s) / Équipement(s)</th>
              <th className="text-left px-3 py-2 font-medium w-28" style={{ color: 'var(--admin-text-muted)' }}>Fréquence</th>
              <th className="text-center px-3 py-2 font-medium w-14" style={{ color: 'var(--admin-text-muted)' }}>Prévu</th>
              <th className="text-center px-3 py-2 font-medium w-14" style={{ color: 'var(--admin-text-muted)' }}>Réalisé</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Observation(s)</th>
            </tr>
          </thead>
          <tbody>
            {displayTasks.map((task, i) => (
              <tr key={i} style={{
                borderTop: '1px solid var(--admin-border)',
                background: task.nonApplicable ? 'color-mix(in srgb, var(--admin-border) 20%, transparent)' : task.realise ? 'color-mix(in srgb, var(--admin-emerald) 5%, transparent)' : 'transparent',
                opacity: task.nonApplicable ? 0.55 : 1,
              }}>
                <td className="px-3 py-2 text-center" style={{ color: 'var(--admin-text-muted)' }}>{i + 1}</td>
                <td className="px-3 py-2" style={{ color: 'var(--admin-text)' }}>
                  {task.taskLabel}
                  {task.nonApplicable && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Non applicable</span>}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{task.outil || '—'}</td>
                <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{task.frequency || '—'}</td>
                <td className="px-3 py-2 text-center" style={{ color: task.prevu ? 'var(--admin-blue)' : 'var(--admin-text-muted)' }}>{task.nonApplicable ? '—' : task.prevu ? '✓' : '○'}</td>
                <td className="px-3 py-2 text-center" style={{ color: task.realise ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{task.nonApplicable ? '—' : task.realise ? '✓' : '○'}</td>
                <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{task.observation || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Intervenants */}
      {current.intervenants && (
        <InfoBlock label="Intervenant(s) / Intervenants externe(s)" value={current.intervenants} />
      )}

      {/* Two-column bottom: Client + SOPAT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client side */}
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Partie réservée au Client</p>
          {current.clientObservations && <InfoBlock label="Feedbacks (réclamation, proposition…)" value={current.clientObservations} />}
          {current.clientBesoins && <InfoBlock label="Besoins" value={current.clientBesoins} />}
          {current.clientIntervenants && <InfoBlock label="Intervenants client" value={current.clientIntervenants} />}
          <SignatureBlock name={current.clientName} date={current.clientSignedDate} label="Nom & visa du client" />
        </div>
        {/* SOPAT side */}
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Partie réservée à SOPAT</p>
          {current.fournitures && <InfoBlock label="Fourniture(s) / Équipement(s)" value={current.fournitures} />}
          {current.pmObservations && <InfoBlock label="Observation(s)" value={current.pmObservations} />}
          <SignatureBlock name={current.pmName} date={current.pmSignedDate} label="Nom & visa du Project Manager" />
        </div>
      </div>
    </div>
  )
}

// ─── Edit View ─────────────────────────────────────────────────────────────────

function EditView({ draft, setDraft, selectedMois, updateTask, toggleNonApplicable, saving, onSave, onCancel }: {
  draft: Partial<MonthlyPlanRow>
  setDraft: React.Dispatch<React.SetStateAction<Partial<MonthlyPlanRow>>>
  selectedMois: string
  updateTask: (i: number, field: keyof MonthlyTask, val: string | boolean) => void
  toggleNonApplicable: (i: number) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Doc header */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="col-span-2 font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>{fmtMoisAnnee(selectedMois)}</div>
        <div className="space-y-1">
          <label style={{ color: 'var(--admin-text-muted)' }}>Nombre d'interventions prévu</label>
          <input type="number" min={0} value={draft.nombreInterventions ?? 1}
            onChange={(e) => setDraft((d) => ({ ...d, nombreInterventions: parseInt(e.target.value) || 1 }))}
            className="input-xs w-20" />
        </div>
      </div>

      {/* Tasks table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--admin-border)' }}>
        <table className="w-full text-xs border-collapse" style={{ minWidth: '820px' }}>
          <thead>
            <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
              <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--admin-text-muted)', width: '32px' }}>N°</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--admin-text-muted)' }}>Tâches des interventions</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--admin-text-muted)', width: '150px' }}>Fourniture(s) / Équip.</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--admin-text-muted)', width: '110px' }}>Fréquence</th>
              <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--admin-blue)', width: '52px' }}>Prévu</th>
              <th className="px-3 py-2 text-center font-medium" style={{ color: 'var(--admin-emerald)', width: '60px' }}>Réalisé</th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--admin-text-muted)' }}>Observation(s) / Réclamation</th>
              <th className="px-3 py-2 text-center font-medium text-[10px]" style={{ color: 'var(--admin-text-muted)', width: '68px' }}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {draft.tasks?.map((task, i) => (
              <tr key={i} style={{
                borderTop: '1px solid var(--admin-border)',
                background: task.nonApplicable ? 'color-mix(in srgb, var(--admin-border) 20%, transparent)' : 'transparent',
                opacity: task.nonApplicable ? 0.6 : 1,
              }}>
                <td className="px-3 py-1.5 text-center" style={{ color: 'var(--admin-text-muted)' }}>{i + 1}</td>
                <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--admin-text)' }}>{task.taskLabel}</td>
                <td className="px-2 py-1.5">
                  <input value={task.outil ?? ''} onChange={(e) => updateTask(i, 'outil', e.target.value)}
                    disabled={task.nonApplicable}
                    className="input-xs w-full" style={{ opacity: task.nonApplicable ? 0.4 : 1 }} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={task.frequency ?? ''} onChange={(e) => updateTask(i, 'frequency', e.target.value)}
                    placeholder="ex: 1×/sem."
                    disabled={task.nonApplicable}
                    className="input-xs w-full" style={{ opacity: task.nonApplicable ? 0.4 : 1 }} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={task.prevu} onChange={(e) => updateTask(i, 'prevu', e.target.checked)}
                    disabled={task.nonApplicable} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={task.realise} onChange={(e) => updateTask(i, 'realise', e.target.checked)}
                    disabled={task.nonApplicable} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={task.observation ?? ''} onChange={(e) => updateTask(i, 'observation', e.target.value)}
                    disabled={task.nonApplicable}
                    className="input-xs w-full" style={{ opacity: task.nonApplicable ? 0.4 : 1 }} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={task.nonApplicable ?? false}
                    onChange={() => toggleNonApplicable(i)}
                    title="Non applicable pour ce projet"
                    className="accent-amber-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Intervenants */}
      <div className="space-y-1">
        <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Intervenant(s) / Intervenants externe(s)</label>
        <textarea value={draft.intervenants ?? ''} onChange={(e) => setDraft((d) => ({ ...d, intervenants: e.target.value }))}
          rows={2} placeholder="Noms et rôles des intervenants sur ce chantier ce mois-ci…"
          className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
      </div>

      {/* Two-column bottom: Client + SOPAT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client section */}
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Partie réservée au Client</p>
          <TextAreaField label="Feedbacks (réclamation, proposition…)" value={draft.clientObservations ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, clientObservations: v }))} />
          <TextAreaField label="Besoins" value={draft.clientBesoins ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, clientBesoins: v }))} />
          <TextAreaField label="Intervenants client" value={draft.clientIntervenants ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, clientIntervenants: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>Nom & visa du client</label>
              <input value={draft.clientName ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                placeholder="Nom complet…" className="input-xs w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>Date signature</label>
              <input type="date" value={draft.clientSignedDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, clientSignedDate: e.target.value }))}
                className="input-xs w-full" />
            </div>
          </div>
        </div>

        {/* SOPAT section */}
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Partie réservée à SOPAT</p>
          <TextAreaField label="Fourniture(s) / Équipement(s) utilisés" value={draft.fournitures ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, fournitures: v }))} />
          <TextAreaField label="Observation(s)" value={draft.pmObservations ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, pmObservations: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>Nom & visa du Project Manager</label>
              <input value={draft.pmName ?? ''} onChange={(e) => setDraft((d) => ({ ...d, pmName: e.target.value }))}
                placeholder="Nom complet…" className="input-xs w-full" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>Date signature</label>
              <input type="date" value={draft.pmSignedDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, pmSignedDate: e.target.value }))}
                className="input-xs w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button type="button" onClick={onSave} disabled={saving}
          className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--admin-emerald)' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-medium"
          style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-xs mt-0.5 whitespace-pre-line" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}

function SignatureBlock({ name, date, label }: { name: string | null; date: string | null; label: string }) {
  return (
    <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--admin-border)' }}>
      <p className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="mt-0.5" style={{ color: 'var(--admin-text)' }}>{name || '—'}</p>
      {date && <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{new Date(date).toLocaleDateString('fr-FR')}</p>}
    </div>
  )
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full px-2 py-1.5 rounded border text-xs resize-none"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
    </div>
  )
}
