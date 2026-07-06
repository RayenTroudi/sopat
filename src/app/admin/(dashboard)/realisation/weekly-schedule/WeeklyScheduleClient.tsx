'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { WeeklyPlanRow, WeeklyRow } from '@/lib/db/realisation-docs'

type DayKey = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi'
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
]

function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return copy
}

function fmtWeek(start: string) {
  const d = new Date(start)
  const end = new Date(d)
  end.setDate(d.getDate() + 5)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} → ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function emptyRow(): WeeklyRow {
  return { equipe: '', lundi: '', mardi: '', mercredi: '', jeudi: '', vendredi: '', samedi: '', realise: false, causeNon: '', suivi: '' }
}

type Props = { canEdit: boolean }

export function WeeklyScheduleClient({ canEdit }: Props) {
  const [weekStart, setWeekStart] = useState(isoDate(getMonday(new Date())))
  const [plans, setPlans] = useState<WeeklyPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<WeeklyPlanRow>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/weekly-plans')
    if (res.ok) { const d = await res.json() as WeeklyPlanRow[]; setPlans(d) }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const weekEnd = isoDate(new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 5)))
  const weekPlans = plans.filter((p) => p.weekStartDate === weekStart)

  function startNew() {
    setDraft({ region: '', chefEquipe: '', weekStartDate: weekStart, weekEndDate: weekEnd, rows: [emptyRow()], nombreActionsPrevues: 0, pourcentageRealisation: '0' })
    setEditing('new')
  }

  function startEdit(p: WeeklyPlanRow) {
    setDraft({ ...p, rows: p.rows?.length ? [...p.rows] : [emptyRow()] })
    setEditing(p.id)
  }

  function updateDraftRow(i: number, field: keyof WeeklyRow, val: string | boolean) {
    setDraft((d) => ({ ...d, rows: d.rows?.map((row, idx) => idx === i ? { ...row, [field]: val } : row) }))
  }

  function addRow() {
    setDraft((d) => ({ ...d, rows: [...(d.rows ?? []), emptyRow()] }))
  }

  function removeRow(i: number) {
    setDraft((d) => ({ ...d, rows: d.rows?.filter((_, idx) => idx !== i) }))
  }

  function recalcProgress(rows: WeeklyRow[]): { nombreActionsPrevues: number; pourcentageRealisation: string } {
    const prevues = rows.reduce((s, r) => s + DAYS.filter(({ key }) => r[key] !== '').length, 0)
    const realise = rows.filter((r) => r.realise).length
    const pct = prevues > 0 ? Math.round((realise / rows.length) * 100) : 0
    return { nombreActionsPrevues: prevues, pourcentageRealisation: pct.toString() }
  }

  async function save() {
    setSaving(true)
    const rows = draft.rows ?? []
    const progress = recalcProgress(rows)
    const body = { ...draft, ...progress, weekStartDate: weekStart, weekEndDate: weekEnd }
    const url = editing === 'new' ? '/api/weekly-plans' : `/api/weekly-plans/${editing}`
    const method = editing === 'new' ? 'POST' : 'PATCH'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { await load(); setEditing(null) }
    setSaving(false)
  }

  async function deletePlan(id: string) {
    if (!confirm('Supprimer ce planning ?')) return
    setDeleting(id)
    await fetch(`/api/weekly-plans/${id}`, { method: 'DELETE' })
    setPlans((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(isoDate(d))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/realisation" className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>← Registre réalisation</Link>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>Planning hebdomadaire</h1>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-02 · {fmtWeek(weekStart)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shiftWeek(-1)} className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)' }}>←</button>
            <input type="date" value={weekStart} onChange={(e) => { const d = new Date(e.target.value); setWeekStart(isoDate(getMonday(d))) }} className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
            <button type="button" onClick={() => shiftWeek(1)} className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)' }}>→</button>
          </div>
          {canEdit && !editing && (
            <button type="button" onClick={startNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--admin-emerald)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Nouveau planning
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><span className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
      ) : editing ? (
        <PlanEditor
          draft={draft}
          onUpdate={(f, v) => setDraft((d) => ({ ...d, [f]: v }))}
          onUpdateRow={updateDraftRow}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onSave={() => void save()}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      ) : weekPlans.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun planning pour cette semaine.</p>
          {canEdit && <button type="button" onClick={startNew} className="mt-3 underline text-sm" style={{ color: 'var(--admin-emerald)' }}>Créer un planning</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {weekPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} canEdit={canEdit} onEdit={() => startEdit(plan)} onDelete={() => void deletePlan(plan.id)} deleting={deleting === plan.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, canEdit, onEdit, onDelete, deleting }: { plan: WeeklyPlanRow; canEdit: boolean; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const pct = parseFloat(plan.pourcentageRealisation ?? '0')
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{plan.region || 'Région —'} · {plan.chefEquipe || 'Chef équipe —'}</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{plan.nombreActionsPrevues ?? 0} actions prévues · {pct}% réalisé</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} className="px-2.5 py-1 rounded text-xs" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Modifier</button>
            <button type="button" onClick={onDelete} disabled={deleting} className="px-2.5 py-1 rounded text-xs disabled:opacity-50" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>Supprimer</button>
          </div>
        )}
      </div>
      <div className="px-5 py-3">
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--admin-border)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--admin-emerald)' : pct >= 50 ? 'var(--admin-amber)' : 'var(--admin-red)' }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Équipe</th>
                {DAYS.map(({ label }) => <th key={label} className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label.slice(0, 3)}</th>)}
                <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>✓</th>
                <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Suivi</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows?.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-2 py-2 font-medium" style={{ color: 'var(--admin-text)' }}>{row.equipe || '—'}</td>
                  {DAYS.map(({ key }) => <td key={key} className="px-2 py-2 text-center" style={{ color: 'var(--admin-text-muted)' }}>{row[key] || '—'}</td>)}
                  <td className="px-2 py-2 text-center" style={{ color: row.realise ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{row.realise ? '✓' : '—'}</td>
                  <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.suivi || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PlanEditor({ draft, onUpdate, onUpdateRow, onAddRow, onRemoveRow, onSave, onCancel, saving }: {
  draft: Partial<WeeklyPlanRow>
  onUpdate: (field: string, val: string) => void
  onUpdateRow: (i: number, field: keyof WeeklyRow, val: string | boolean) => void
  onAddRow: () => void
  onRemoveRow: (i: number) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Édition planning</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Région</label>
            <input value={draft.region ?? ''} onChange={(e) => onUpdate('region', e.target.value)} placeholder="Tunis Sud, Sfax…" className="input-xs w-full" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Chef d'équipe</label>
            <input value={draft.chefEquipe ?? ''} onChange={(e) => onUpdate('chefEquipe', e.target.value)} className="input-xs w-full" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Équipe / Projet</th>
                {DAYS.map(({ label }) => (
                  <th key={label} className="text-center px-1 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label.slice(0, 3)}</th>
                ))}
                <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Réalisé</th>
                <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Cause non-réal.</th>
                <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Suivi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.rows?.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-1 py-1.5"><input value={row.equipe} onChange={(e) => onUpdateRow(i, 'equipe', e.target.value)} placeholder="Équipe / projet" className="input-xs w-28" /></td>
                  {DAYS.map(({ key }) => (
                    <td key={key} className="px-1 py-1.5 text-center">
                      <input value={row[key]} onChange={(e) => onUpdateRow(i, key, e.target.value)} placeholder="tâche" className="input-xs w-14 text-center" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={row.realise} onChange={(e) => onUpdateRow(i, 'realise', e.target.checked)} />
                  </td>
                  <td className="px-1 py-1.5"><input value={row.causeNon} onChange={(e) => onUpdateRow(i, 'causeNon', e.target.value)} className="input-xs w-24" /></td>
                  <td className="px-1 py-1.5"><input value={row.suivi} onChange={(e) => onUpdateRow(i, 'suivi', e.target.value)} className="input-xs w-20" /></td>
                  <td className="px-1 py-1.5"><button type="button" onClick={() => onRemoveRow(i)} className="text-[10px]" style={{ color: 'var(--admin-red)' }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={onAddRow} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>+ Ajouter une ligne</button>
        <div className="flex gap-2">
          <button type="button" onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
