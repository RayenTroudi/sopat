'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ActionPlanItemRow } from '@/lib/db/realisation'

const DEFAULT_PHASES = [
  { phaseCode: 'I',     phaseLabel: 'Travaux préliminaires',                    isPhaseHeader: true  },
  { phaseCode: 'I.1',   phaseLabel: 'Décapage et nettoyage du sol',             isPhaseHeader: false },
  { phaseCode: 'I.2',   phaseLabel: 'Piquetage',                                isPhaseHeader: false },
  { phaseCode: 'I.3',   phaseLabel: 'Nivellement et terrassement',              isPhaseHeader: false },
  { phaseCode: 'I.4',   phaseLabel: 'Mise en place du système de drainage',     isPhaseHeader: false },
  { phaseCode: 'I.5',   phaseLabel: 'Fourniture de la terre végétale',          isPhaseHeader: false },
  { phaseCode: 'II',    phaseLabel: 'Travaux de plantations',                   isPhaseHeader: true  },
  { phaseCode: 'II.1',  phaseLabel: 'Mise en place de la terre végétale',       isPhaseHeader: false },
  { phaseCode: 'II.2',  phaseLabel: "Fourniture et mise en place de l'amendement organique", isPhaseHeader: false },
  { phaseCode: 'II.3',  phaseLabel: "Fourniture et mise en place de l'amendement minéral",  isPhaseHeader: false },
  { phaseCode: 'II.4',  phaseLabel: 'Founiture de plantes',                     isPhaseHeader: false },
  { phaseCode: 'II.5',  phaseLabel: 'Plantations',                              isPhaseHeader: false },
  { phaseCode: 'II.6',  phaseLabel: 'Transplantations',                         isPhaseHeader: false },
  { phaseCode: 'III',   phaseLabel: 'Engazonnement',                            isPhaseHeader: true  },
  { phaseCode: 'III.1', phaseLabel: 'Fourniture du gazon',                      isPhaseHeader: false },
  { phaseCode: 'III.2', phaseLabel: 'Mise en place du gazon',                   isPhaseHeader: false },
  { phaseCode: 'IV',    phaseLabel: 'Matière décorative',                       isPhaseHeader: true  },
  { phaseCode: 'IV.1',  phaseLabel: 'Fourniture de la matière décorative',      isPhaseHeader: false },
  { phaseCode: 'IV.2',  phaseLabel: 'Mise en place de la matière décorative',   isPhaseHeader: false },
  { phaseCode: 'V',     phaseLabel: 'Réseaux & Maçonnerie',                     isPhaseHeader: true  },
  { phaseCode: 'V.1',   phaseLabel: "Installation du système d'arrosage",       isPhaseHeader: false },
  { phaseCode: 'V.2',   phaseLabel: "Installation du système d'éclairage",      isPhaseHeader: false },
  { phaseCode: 'V.3',   phaseLabel: 'Fourniture des matériaux de maçonnerie paysagère', isPhaseHeader: false },
  { phaseCode: 'VI',    phaseLabel: 'Réception',                                isPhaseHeader: true  },
  { phaseCode: 'VI.1',  phaseLabel: 'Réception provisoire',                     isPhaseHeader: false },
  { phaseCode: 'VI.2',  phaseLabel: 'Réception définitive',                     isPhaseHeader: false },
]

type Props = {
  projectId: string
  canEdit: boolean
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'var(--admin-emerald)' : pct >= 50 ? 'var(--admin-amber)' : 'var(--admin-blue)'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--admin-border)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] w-7 text-right tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{pct}%</span>
    </div>
  )
}

export function PlanActionSection({ projectId, canEdit }: Props) {
  const [items, setItems] = useState<ActionPlanItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ActionPlanItemRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inlineEdit, setInlineEdit] = useState<string | null>(null)
  const [inlinePatch, setInlinePatch] = useState<Partial<ActionPlanItemRow>>({})
  const [patchSaving, setPatchSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/action-plan`)
      if (res.ok) setItems(await res.json() as ActionPlanItemRow[])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    setDraft(items.length > 0 ? items.map((i) => ({ ...i })) : DEFAULT_PHASES.map((p, idx) => ({
      id: '',
      ...p,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      progressPct: 0,
      observations: null,
      sortOrder: idx,
    })))
    setEditing(true)
    setError('')
  }

  function updateDraft(i: number, field: keyof ActionPlanItemRow, value: unknown) {
    setDraft((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/action-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: draft.map((row, i) => ({ ...row, sortOrder: i })) }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur serveur'); return }
      await load()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function openInline(item: ActionPlanItemRow) {
    setInlineEdit(item.id)
    setInlinePatch({ progressPct: item.progressPct, actualStartDate: item.actualStartDate, actualEndDate: item.actualEndDate, observations: item.observations ?? '' })
  }

  async function saveInline(itemId: string) {
    setPatchSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/action-plan/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlinePatch),
      })
      if (res.ok) {
        await load()
        setInlineEdit(null)
      }
    } finally {
      setPatchSaving(false)
    }
  }

  // Overall progress = avg of non-header items
  const taskItems = items.filter((i) => !i.isPhaseHeader)
  const overallProgress = taskItems.length > 0
    ? Math.round(taskItems.reduce((s, i) => s + i.progressPct, 0) / taskItems.length)
    : 0

  if (editing) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Plan d'Action Réalisation</h3>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-03 — Mode édition</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
              Annuler
            </button>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          {error && <p className="text-xs mb-3" style={{ color: 'var(--admin-red)' }}>{error}</p>}
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Code', 'Phase / Étape', 'Début prévu', 'Fin prévue', 'Début réel', 'Fin réelle', '%'].map((h) => (
                  <th key={h} className="text-left px-2 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--admin-border)', background: row.isPhaseHeader ? 'var(--admin-bg)' : undefined }}>
                  <td className="px-2 py-1.5">
                    <input value={row.phaseCode} onChange={(e) => updateDraft(i, 'phaseCode', e.target.value)}
                      className="w-16 px-1.5 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.phaseLabel} onChange={(e) => updateDraft(i, 'phaseLabel', e.target.value)}
                      className="w-full min-w-[200px] px-1.5 py-1 rounded border text-xs font-medium" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)', fontWeight: row.isPhaseHeader ? 600 : undefined }} />
                  </td>
                  {['plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate'].map((field) => (
                    <td key={field} className="px-2 py-1.5">
                      <input type="date" value={(row as Record<string, unknown>)[field] as string ?? ''}
                        onChange={(e) => updateDraft(i, field as keyof ActionPlanItemRow, e.target.value || null)}
                        className="px-1.5 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    {!row.isPhaseHeader && (
                      <input type="number" min="0" max="100" value={row.progressPct}
                        onChange={(e) => updateDraft(i, 'progressPct', parseInt(e.target.value) || 0)}
                        className="w-14 px-1.5 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Plan d'Action Réalisation</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            PLA-RE-03 — {taskItems.length} tâche{taskItems.length !== 1 ? 's' : ''} · Avancement global : {overallProgress}%
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {items.length === 0 ? 'Initialiser le plan' : 'Modifier le plan'}
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Global progress bar */}
        {taskItems.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
              <span>Avancement global du chantier</span>
              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{overallProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full" style={{ background: 'var(--admin-border)' }}>
              <div className="h-2.5 rounded-full transition-all" style={{ width: `${overallProgress}%`, background: 'var(--admin-emerald)' }} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-6 flex justify-center">
            <span className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun plan d'action.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Initialiser avec les phases standards</button></>}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Phase', 'Désignation', 'Prévu', 'Réalisé', 'Progression'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                  {canEdit && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      style={{
                        borderTop: '1px solid var(--admin-border)',
                        background: item.isPhaseHeader ? 'var(--admin-bg)' : undefined,
                      }}
                    >
                      <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{item.phaseCode}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--admin-text)', fontWeight: item.isPhaseHeader ? 600 : undefined }}>
                        {item.phaseLabel}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>
                        {item.plannedStartDate ? fmtDate(item.plannedStartDate) : '—'}
                        {item.plannedEndDate && ` → ${fmtDate(item.plannedEndDate)}`}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>
                        {item.actualStartDate ? fmtDate(item.actualStartDate) : '—'}
                        {item.actualEndDate && ` → ${fmtDate(item.actualEndDate)}`}
                      </td>
                      <td className="px-3 py-2 w-32">
                        {!item.isPhaseHeader && <ProgressBar pct={item.progressPct} />}
                      </td>
                      {canEdit && (
                        <td className="px-2 py-2">
                          {!item.isPhaseHeader && (
                            <button type="button" onClick={() => openInline(item)} className="p-1 rounded hover:bg-[var(--admin-border)]" style={{ color: 'var(--admin-text-muted)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Inline edit row */}
                    {inlineEdit === item.id && (
                      <tr key={`${item.id}-edit`} style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-emerald-dim)' }}>
                        <td colSpan={canEdit ? 6 : 5} className="px-3 py-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Début réel</label>
                              <input type="date" value={inlinePatch.actualStartDate ?? ''} onChange={(e) => setInlinePatch((p) => ({ ...p, actualStartDate: e.target.value || null }))}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Fin réelle</label>
                              <input type="date" value={inlinePatch.actualEndDate ?? ''} onChange={(e) => setInlinePatch((p) => ({ ...p, actualEndDate: e.target.value || null }))}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Avancement (%)</label>
                              <input type="number" min="0" max="100" value={inlinePatch.progressPct ?? 0}
                                onChange={(e) => setInlinePatch((p) => ({ ...p, progressPct: parseInt(e.target.value) || 0 }))}
                                className="w-16 px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => void saveInline(item.id)} disabled={patchSaving}
                                className="px-3 py-1 rounded text-xs font-medium text-white disabled:opacity-50"
                                style={{ background: 'var(--admin-emerald)' }}>
                                {patchSaving ? '…' : 'OK'}
                              </button>
                              <button type="button" onClick={() => setInlineEdit(null)}
                                className="px-3 py-1 rounded text-xs font-medium"
                                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
