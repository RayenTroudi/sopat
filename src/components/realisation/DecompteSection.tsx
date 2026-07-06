'use client'

import { useState, useCallback, useEffect } from 'react'
import type { LineItem } from '@/lib/db/realisation-docs'

const TVA_RATE = 0.19

type Props = { projectId: string; canEdit: boolean }

function toNum(v: string | null | undefined): number { return parseFloat(v ?? '0') || 0 }

function newItem(sortOrder: number): LineItem {
  return { phaseCode: '', phaseLabel: '', designation: '', quantity: '0', unit: '', norme: '', unitPriceHtva: '0', totalHtva: '0', observation: '', sortOrder, isPhaseHeader: false }
}

function newHeader(phaseCode: string, phaseLabel: string, sortOrder: number): LineItem {
  return { phaseCode, phaseLabel, designation: phaseLabel, quantity: '0', unit: '', norme: '', unitPriceHtva: '0', totalHtva: '0', observation: '', sortOrder, isPhaseHeader: true }
}

function fmt(v: string | number | null | undefined) {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (!n && n !== 0) return '0,000'
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function numToWords(n: number): string {
  if (n === 0) return 'zéro'
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  function below100(x: number): string {
    if (x < 20) return ones[x]
    const t = Math.floor(x / 10), o = x % 10
    if (t === 7 || t === 9) return tens[t] + (o === 1 ? '-et-' : '-') + ones[o + 10]
    return tens[t] + (o ? '-' + ones[o] : (t === 8 ? 's' : ''))
  }
  function below1000(x: number): string {
    if (x < 100) return below100(x)
    const h = Math.floor(x / 100), r = x % 100
    return (h === 1 ? 'cent' : ones[h] + ' cent' + (r ? '' : 's')) + (r ? ' ' + below100(r) : '')
  }
  const int = Math.floor(n)
  const dec = Math.round((n - int) * 1000)
  const millions = Math.floor(int / 1_000_000)
  const thousands = Math.floor((int % 1_000_000) / 1000)
  const remainder = int % 1000
  let result = ''
  if (millions) result += (millions === 1 ? 'un million' : below1000(millions) + ' millions') + ' '
  if (thousands) result += (thousands === 1 ? 'mille' : below1000(thousands) + ' mille') + ' '
  if (remainder) result += below1000(remainder)
  result = result.trim() + ' dinars'
  if (dec) result += ' et ' + below1000(dec) + ' millimes'
  return result.charAt(0).toUpperCase() + result.slice(1)
}

export function DecompteSection({ projectId, canEdit }: Props) {
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<LineItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/decompte`)
    if (res.ok) { const d = await res.json() as LineItem[]; setItems(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const totalHtva = items.filter((i) => !i.isPhaseHeader).reduce((s, r) => s + toNum(r.totalHtva), 0)
  const tva = totalHtva * TVA_RATE
  const ttc = totalHtva + tva

  const draftTotalHtva = draft.filter((i) => !i.isPhaseHeader).reduce((s, r) => s + toNum(r.totalHtva), 0)
  const draftTva = draftTotalHtva * TVA_RATE
  const draftTtc = draftTotalHtva + draftTva

  function startEdit() {
    const initial: LineItem[] = items.length ? [...items] : [
      newHeader('P1', 'Plantation & engazonnement', 0),
      newItem(1),
    ]
    setDraft(initial)
    setEditing(true)
  }

  function updateItem(i: number, field: keyof LineItem, val: string | number | boolean) {
    setDraft((d) => d.map((row, idx) => {
      if (idx !== i) return row
      const updated: LineItem = { ...row, [field]: val }
      if ((field === 'quantity' || field === 'unitPriceHtva') && !row.isPhaseHeader) {
        const q = toNum(field === 'quantity' ? String(val) : updated.quantity)
        const p = toNum(field === 'unitPriceHtva' ? String(val) : updated.unitPriceHtva)
        updated.totalHtva = String(q * p)
      }
      return updated
    }))
  }

  function addRow(afterIndex: number) {
    setDraft((d) => {
      const next = [...d]
      next.splice(afterIndex + 1, 0, newItem(afterIndex + 1))
      return next.map((r, idx) => ({ ...r, sortOrder: idx }))
    })
  }

  function addPhase() {
    setDraft((d) => [...d, newHeader(`P${Date.now()}`, 'Nouvelle phase', d.length)])
  }

  function removeRow(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, sortOrder: idx })))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/decompte`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    if (res.ok) { const d = await res.json() as LineItem[]; setItems(d); setEditing(false) }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Décompte Définitif</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-RE-15 · TVA 19%
            {items.length > 0 && <> · Total TTC: <strong>{fmt(ttc)} DT</strong></>}
          </p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {items.length ? 'Modifier' : 'Saisir le décompte'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[800px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Désignation', 'Qté', 'Unité', 'Norme', 'P.U HTVA (DT)', 'Total HTVA (DT)', 'Observation', ''].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)', background: row.isPhaseHeader ? 'var(--admin-blue-dim)' : undefined }}>
                      {row.isPhaseHeader ? (
                        <>
                          <td colSpan={6} className="px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <input value={row.phaseCode ?? ''} onChange={(e) => updateItem(i, 'phaseCode', e.target.value)} placeholder="Code" className="input-xs w-16" />
                              <input value={row.phaseLabel ?? ''} onChange={(e) => { updateItem(i, 'phaseLabel', e.target.value); updateItem(i, 'designation', e.target.value) }} placeholder="Titre de la phase" className="input-xs flex-1 font-medium" />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              <button type="button" onClick={() => addRow(i)} className="text-[10px] underline" style={{ color: 'var(--admin-text-muted)' }}>+ligne</button>
                              <button type="button" onClick={() => removeRow(i)} className="text-[10px]" style={{ color: 'var(--admin-red)' }}>✕</button>
                            </div>
                          </td>
                          <td />
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5"><input value={row.designation ?? ''} onChange={(e) => updateItem(i, 'designation', e.target.value)} className="input-xs w-full" /></td>
                          <td className="px-2 py-1.5"><input type="number" step="0.001" value={row.quantity ?? '0'} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="input-xs w-20" /></td>
                          <td className="px-2 py-1.5"><input value={row.unit ?? ''} onChange={(e) => updateItem(i, 'unit', e.target.value)} placeholder="m², ml…" className="input-xs w-16" /></td>
                          <td className="px-2 py-1.5"><input value={row.norme ?? ''} onChange={(e) => updateItem(i, 'norme', e.target.value)} className="input-xs w-20" /></td>
                          <td className="px-2 py-1.5"><input type="number" step="0.001" value={row.unitPriceHtva ?? '0'} onChange={(e) => updateItem(i, 'unitPriceHtva', e.target.value)} className="input-xs w-24 text-right" /></td>
                          <td className="px-2 py-1.5 text-right font-medium" style={{ color: 'var(--admin-text)' }}>{fmt(row.totalHtva)}</td>
                          <td className="px-2 py-1.5"><input value={row.observation ?? ''} onChange={(e) => updateItem(i, 'observation', e.target.value)} className="input-xs w-full" /></td>
                          <td className="px-2 py-1.5"><button type="button" onClick={() => removeRow(i)} className="text-[10px]" style={{ color: 'var(--admin-red)' }}>✕</button></td>
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
            <TotalsBox htva={draftTotalHtva} tva={draftTva} ttc={draftTtc} />
            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun décompte.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Saisir</button></>}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Désignation', 'Qté', 'Unité', 'P.U HTVA', 'Total HTVA', 'Observation'].map((h) => (
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
                      <td className="px-2 py-2 text-right" style={{ color: 'var(--admin-text-muted)' }}>{row.isPhaseHeader ? '' : fmt(row.unitPriceHtva)}</td>
                      <td className="px-2 py-2 text-right font-medium" style={{ color: 'var(--admin-text)' }}>{row.isPhaseHeader ? '' : fmt(row.totalHtva)}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{row.observation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TotalsBox htva={totalHtva} tva={tva} ttc={ttc} />
          </div>
        )}
      </div>
    </div>
  )
}

function TotalsBox({ htva, tva, ttc }: { htva: number; tva: number; ttc: number }) {
  return (
    <div className="ml-auto w-fit min-w-[280px] rounded-lg border p-3 space-y-1.5 text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
      <div className="flex justify-between gap-6">
        <span style={{ color: 'var(--admin-text-muted)' }}>Total HTVA</span>
        <span className="font-medium tabular-nums" style={{ color: 'var(--admin-text)' }}>{htva.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT</span>
      </div>
      <div className="flex justify-between gap-6">
        <span style={{ color: 'var(--admin-text-muted)' }}>TVA 19%</span>
        <span className="tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{tva.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT</span>
      </div>
      <div className="flex justify-between gap-6 pt-1.5 border-t font-semibold" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
        <span>Total TTC</span>
        <span className="tabular-nums">{ttc.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT</span>
      </div>
      <p className="text-[10px] italic pt-1" style={{ color: 'var(--admin-text-muted)' }}>Arrêté à la somme de : {numToWords(ttc)}</p>
    </div>
  )
}
