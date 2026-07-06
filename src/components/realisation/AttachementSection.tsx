'use client'

import { useState, useCallback, useEffect } from 'react'
import type { LineItem } from '@/lib/db/realisation-docs'

type Props = { projectId: string; canEdit: boolean }

function newItem(sortOrder: number): LineItem {
  return { phaseCode: '', phaseLabel: '', designation: '', quantity: '0', unit: '', norme: '', observation: '', sortOrder, isPhaseHeader: false }
}

function newHeader(phaseCode: string, phaseLabel: string, sortOrder: number): LineItem {
  return { phaseCode, phaseLabel, designation: phaseLabel, quantity: '0', unit: '', norme: '', observation: '', sortOrder, isPhaseHeader: true }
}

export function AttachementSection({ projectId, canEdit }: Props) {
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/attachement`)
    if (res.ok) { const d = await res.json() as LineItem[]; setItems(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    const initial: LineItem[] = items.length ? [...items] : [
      newHeader('P1', 'Plantation & engazonnement', 0),
      newItem(1),
      newHeader('P2', 'Arrosage', 10),
      newItem(11),
    ]
    setDraft(initial)
    setEditing(true)
  }

    function updateItem(i: number, field: keyof LineItem, val: string | number | boolean) {
    setDraft((d) => d.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function addRow(afterIndex: number) {
    setDraft((d) => {
      const next = [...d]
      next.splice(afterIndex + 1, 0, newItem(afterIndex + 1))
      return next.map((r, idx) => ({ ...r, sortOrder: idx }))
    })
  }

  function addPhase() {
    setDraft((d) => [
      ...d,
      newHeader(`P${Date.now()}`, 'Nouvelle phase', d.length),
    ])
  }

  function removeRow(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, sortOrder: idx })))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/attachement`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    if (res.ok) { const d = await res.json() as LineItem[]; setItems(d); setEditing(false) }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Attachement des Travaux</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>FOR-RE-13 · {items.filter((i) => !i.isPhaseHeader).length} ligne{items.filter((i) => !i.isPhaseHeader).length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {items.length ? 'Modifier' : 'Saisir les travaux'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Désignation', 'Qté', 'Unité', 'Norme', 'Observation', ''].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)', background: row.isPhaseHeader ? 'var(--admin-blue-dim)' : undefined }}>
                      {row.isPhaseHeader ? (
                        <>
                          <td colSpan={5} className="px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <input value={row.phaseCode ?? ''} onChange={(e) => updateItem(i, 'phaseCode', e.target.value)} placeholder="Code" className="input-xs w-16" />
                              <input value={row.phaseLabel ?? ''} onChange={(e) => { updateItem(i, 'phaseLabel', e.target.value); updateItem(i, 'designation', e.target.value) }} placeholder="Titre de la phase" className="input-xs flex-1 font-medium" />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              <button type="button" title="Ajouter ligne sous cette phase" onClick={() => addRow(i)} className="text-[10px] underline" style={{ color: 'var(--admin-text-muted)' }}>+ligne</button>
                              <button type="button" onClick={() => removeRow(i)} className="text-[10px]" style={{ color: 'var(--admin-red)' }}>✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5"><input value={row.designation ?? ''} onChange={(e) => updateItem(i, 'designation', e.target.value)} className="input-xs w-full" /></td>
                          <td className="px-2 py-1.5"><input type="number" value={row.quantity ?? '0'} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="input-xs w-20" /></td>
                          <td className="px-2 py-1.5"><input value={row.unit ?? ''} onChange={(e) => updateItem(i, 'unit', e.target.value)} placeholder="m², ml…" className="input-xs w-20" /></td>
                          <td className="px-2 py-1.5"><input value={row.norme ?? ''} onChange={(e) => updateItem(i, 'norme', e.target.value)} className="input-xs w-24" /></td>
                          <td className="px-2 py-1.5"><input value={row.observation ?? ''} onChange={(e) => updateItem(i, 'observation', e.target.value)} className="input-xs w-full" /></td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => removeRow(i)} className="text-[10px]" style={{ color: 'var(--admin-red)' }}>✕</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={addPhase} className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>+ Ajouter une phase</button>
              <button type="button" onClick={() => addRow(draft.length - 1)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>+ Ajouter une ligne</button>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun attachement.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Saisir</button></>}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Désignation', 'Qté', 'Unité', 'Norme', 'Observation'].map((h) => (
                    <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--admin-border)', background: row.isPhaseHeader ? 'var(--admin-blue-dim)' : undefined }}>
                    <td className="px-2 py-2 font-medium" style={{ color: row.isPhaseHeader ? 'var(--admin-blue)' : 'var(--admin-text)' }}>
                      {row.isPhaseHeader ? `${row.phaseCode} — ${row.phaseLabel}` : row.designation}
                    </td>
                    <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.isPhaseHeader ? '' : row.quantity}</td>
                    <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.unit}</td>
                    <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.norme}</td>
                    <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
