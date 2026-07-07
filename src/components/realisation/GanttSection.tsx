'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GanttRecord, GanttRow } from '@/lib/db/realisation-docs'

type Props = { projectId: string; projectName: string; canEdit: boolean }

// ─── Default Gantt structure from PLA-RE-05 ────────────────────────────────────

const DEFAULT_ROWS: Omit<GanttRow, 'prWeeks' | 'reWeeks'>[] = [
  { rowId: 'phase-I',        label: 'Phase I — Travaux préliminaires', type: 'phase' },
  { rowId: 'act-1',          label: 'Activité 1',                      type: 'activity' },
  { rowId: 'sub-1.1',        label: 'Sous-Activité 1.1',               type: 'subactivity' },
  { rowId: 'sub-1.2',        label: 'Sous-Activité 1.2',               type: 'subactivity' },
  { rowId: 'act-2',          label: 'Activité 2',                      type: 'activity' },
  { rowId: 'phase-II',       label: 'Phase II — Travaux principaux',   type: 'phase' },
  { rowId: 'act-3',          label: 'Activité 3',                      type: 'activity' },
  { rowId: 'sub-3.1',        label: 'Sous-Activité 3.1',               type: 'subactivity' },
  { rowId: 'sub-3.2',        label: 'Sous-Activité 3.2',               type: 'subactivity' },
  { rowId: 'act-4',          label: 'Activité 4',                      type: 'activity' },
  { rowId: 'sub-4.1',        label: 'Sous-Activité 4.1',               type: 'subactivity' },
  { rowId: 'sub-4.2',        label: 'Sous-Activité 4.2',               type: 'subactivity' },
]

// 12 months × 4 weeks = 48 week columns
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const TOTAL_WEEKS = 48

function seedRows(existing: GanttRow[]): GanttRow[] {
  return DEFAULT_ROWS.map((def) => {
    const found = existing.find((r) => r.rowId === def.rowId)
    return found ?? { ...def, prWeeks: [], reWeeks: [] }
  })
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function GanttSection({ projectId, projectName, canEdit }: Props) {
  const [record, setRecord] = useState<GanttRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<GanttRecord> & { ganttRows: GanttRow[] }>({ ganttRows: seedRows([]) })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/gantt`)
    if (res.ok) { const d = await res.json() as GanttRecord | null; setRecord(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    setDraft({
      localisation:         record?.localisation ?? '',
      projectManager:       record?.projectManager ?? '',
      dateDemarragePrevu:   record?.dateDemarragePrevu ?? '',
      dateDemarrageReel:    record?.dateDemarrageReel ?? '',
      dateFinPrevue:        record?.dateFinPrevue ?? '',
      dateFinReelle:        record?.dateFinReelle ?? '',
      dateMaj:              new Date().toISOString().slice(0, 10),
      ganttRows:            seedRows(record?.ganttRows ?? []),
    })
    setEditing(true)
  }

  function toggleWeek(rowId: string, weekIdx: number, kind: 'pr' | 're') {
    setDraft((d) => ({
      ...d,
      ganttRows: d.ganttRows.map((r) => {
        if (r.rowId !== rowId) return r
        const field = kind === 'pr' ? 'prWeeks' : 'reWeeks'
        const cur = r[field]
        const next = cur.includes(weekIdx) ? cur.filter((w) => w !== weekIdx) : [...cur, weekIdx]
        return { ...r, [field]: next }
      }),
    }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/gantt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (res.ok) { await load(); setEditing(false) }
    setSaving(false)
  }

  const rows = editing ? draft.ganttRows : seedRows(record?.ganttRows ?? [])
  const meta = editing ? draft : record

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-3 border-b gap-4 flex-wrap" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Planning Gantt de réalisation</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-05</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {record ? 'Modifier' : 'Créer'}
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
          </div>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : (
          <div className="space-y-5">
            {/* Metadata fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <MetaField label="Projet" value={projectName} readonly />
              <MetaField label="Localisation" value={meta?.localisation ?? ''} readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, localisation: v })) : undefined} />
              <MetaField label="Project Manager" value={meta?.projectManager ?? ''} readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, projectManager: v })) : undefined} />
              <MetaField label="Date démarrage prév." value={meta?.dateDemarragePrevu ?? ''} type="date" readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, dateDemarragePrevu: v })) : undefined} />
              <MetaField label="Date démarrage réel" value={meta?.dateDemarrageReel ?? ''} type="date" readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, dateDemarrageReel: v })) : undefined} />
              <MetaField label="Date fin prév." value={meta?.dateFinPrevue ?? ''} type="date" readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, dateFinPrevue: v })) : undefined} />
              <MetaField label="Date fin réelle" value={meta?.dateFinReelle ?? ''} type="date" readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, dateFinReelle: v })) : undefined} />
              <MetaField label="Date mise à jour" value={meta?.dateMaj ?? ''} type="date" readonly={!editing}
                onChange={editing ? (v) => setDraft((d) => ({ ...d, dateMaj: v })) : undefined} />
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'var(--admin-blue)' }} />PR — Prévu</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'var(--admin-emerald)' }} />RE — Réalisé</span>
              {editing && <span style={{ color: 'var(--admin-amber)' }}>Cliquez sur une cellule pour la sélectionner/désélectionner</span>}
            </div>

            {/* Gantt grid */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: '900px' }}>
                {/* Month headers */}
                <div className="flex">
                  <div style={{ width: '180px', flexShrink: 0 }} />
                  <div style={{ width: '28px', flexShrink: 0 }} />
                  {MONTHS_FR.map((m, mi) => (
                    <div key={mi} className="flex-1 text-center text-[10px] font-semibold py-1 border-b border-l" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                      {m}
                    </div>
                  ))}
                </div>

                {/* Week sub-headers */}
                <div className="flex border-b" style={{ borderColor: 'var(--admin-border)' }}>
                  <div style={{ width: '180px', flexShrink: 0, color: 'var(--admin-text-muted)' }} className="text-[10px] px-2 py-1 font-medium" />
                  <div style={{ width: '28px', flexShrink: 0, color: 'var(--admin-text-muted)' }} className="text-[10px] text-center py-1 font-semibold">S</div>
                  {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-[9px] border-l py-0.5" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                      {(i % 4) + 1}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {rows.map((row) => (
                  <GanttRowPair
                    key={row.rowId}
                    row={row}
                    editing={editing}
                    onToggle={(weekIdx, kind) => toggleWeek(row.rowId, weekIdx, kind)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── GanttRowPair ─────────────────────────────────────────────────────────────

function GanttRowPair({ row, editing, onToggle }: {
  row: GanttRow
  editing: boolean
  onToggle: (weekIdx: number, kind: 'pr' | 're') => void
}) {
  const indent = row.type === 'subactivity' ? 24 : row.type === 'activity' ? 12 : 0
  const labelColor = row.type === 'phase' ? 'var(--admin-text)' : 'var(--admin-text-muted)'
  const labelWeight = row.type === 'phase' ? 'font-bold' : row.type === 'activity' ? 'font-medium' : ''
  const bgPhase = row.type === 'phase' ? 'var(--admin-bg)' : 'transparent'

  return (
    <div>
      {/* PR row */}
      <div className="flex border-b" style={{ borderColor: 'var(--admin-border)', background: bgPhase }}>
        <div
          className={`text-[11px] px-2 py-1 flex items-center truncate ${labelWeight}`}
          style={{ width: '180px', flexShrink: 0, color: labelColor, paddingLeft: `${8 + indent}px` }}
          title={row.label}
        >
          {row.label}
        </div>
        <div className="flex-shrink-0 w-7 text-[9px] text-center py-1 font-bold" style={{ color: 'var(--admin-blue)', width: '28px' }}>PR</div>
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
          const active = row.prWeeks.includes(i)
          return (
            <div
              key={i}
              onClick={editing ? () => onToggle(i, 'pr') : undefined}
              className={`flex-1 border-l ${editing ? 'cursor-pointer hover:opacity-80' : ''}`}
              style={{
                borderColor: 'var(--admin-border)',
                background: active ? 'var(--admin-blue)' : 'transparent',
                height: '20px',
              }}
            />
          )
        })}
      </div>
      {/* RE row */}
      <div className="flex border-b" style={{ borderColor: 'var(--admin-border)', background: bgPhase }}>
        <div style={{ width: '180px', flexShrink: 0 }} />
        <div className="flex-shrink-0 w-7 text-[9px] text-center py-1 font-bold" style={{ color: 'var(--admin-emerald)', width: '28px' }}>RE</div>
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
          const active = row.reWeeks.includes(i)
          return (
            <div
              key={i}
              onClick={editing ? () => onToggle(i, 're') : undefined}
              className={`flex-1 border-l ${editing ? 'cursor-pointer hover:opacity-80' : ''}`}
              style={{
                borderColor: 'var(--admin-border)',
                background: active ? 'var(--admin-emerald)' : 'transparent',
                height: '20px',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── MetaField ────────────────────────────────────────────────────────────────

function MetaField({ label, value, type = 'text', readonly, onChange }: {
  label: string
  value: string
  type?: 'text' | 'date'
  readonly?: boolean
  onChange?: (v: string) => void
}) {
  if (readonly) {
    return (
      <div className="space-y-0.5">
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--admin-text)' }}>{value || '—'}</p>
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      <label className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-2 py-1 rounded border text-xs"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
      />
    </div>
  )
}
