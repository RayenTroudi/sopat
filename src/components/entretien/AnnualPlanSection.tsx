'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AnnualPlanRow, MonthData } from '@/lib/db/entretien-plans'

type Props = { projectId: string; canEdit: boolean }

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function emptyMonth(month: number): MonthData {
  return { month, frequence: '', jours: '0', nbrePrevu: 0, nbreRealise: 0 }
}

function emptyMonthlyData(): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => emptyMonth(i + 1))
}

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return parseFloat(String(v)) || 0
}

function fmt(v: string | number | null | undefined) {
  const n = toNum(v)
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export function AnnualPlanSection({ projectId, canEdit }: Props) {
  const [plans, setPlans] = useState<AnnualPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<AnnualPlanRow>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/annual-plan`)
    if (res.ok) { const d = await res.json() as AnnualPlanRow[]; setPlans(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const current = plans.find((p) => p.annee === selectedYear)

  function startEdit() {
    setDraft({
      updatedDate: current?.updatedDate ?? new Date().toISOString().slice(0, 10),
      taciteReconduction: current?.taciteReconduction ?? false,
      majorationTaux: current?.majorationTaux ?? '0',
      montantContrat: current?.montantContrat ?? '0',
      montantPrevu: current?.montantPrevu ?? '0',
      montantFacture: current?.montantFacture ?? '0',
      monthlyData: current?.monthlyData?.length === 12 ? [...current.monthlyData] : emptyMonthlyData(),
    })
    setEditing(true)
  }

  function updateMonth(i: number, field: keyof MonthData, val: string | number) {
    setDraft((d) => ({
      ...d,
      monthlyData: d.monthlyData?.map((m, idx) => idx === i ? { ...m, [field]: val } : m),
    }))
  }

  async function save() {
    setSaving(true)
    const body = { annee: selectedYear, ...draft }
    const res = await fetch(`/api/projects/${projectId}/annual-plan`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) { await load(); setEditing(false) }
    setSaving(false)
  }

  const totalPrevu = current?.monthlyData?.reduce((s, m) => s + (m.nbrePrevu ?? 0), 0) ?? 0
  const totalRealise = current?.monthlyData?.reduce((s, m) => s + (m.nbreRealise ?? 0), 0) ?? 0
  const draftTotalPrevu = draft.monthlyData?.reduce((s, m) => s + (m.nbrePrevu ?? 0), 0) ?? 0
  const draftTotalRealise = draft.monthlyData?.reduce((s, m) => s + (m.nbreRealise ?? 0), 0) ?? 0

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-start justify-between px-5 py-3 border-b gap-4" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Planning annuel d'entretien</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>PLA-RE-01</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setEditing(false) }} className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date de mise à jour</label>
                <input type="date" value={draft.updatedDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, updatedDate: e.target.value }))} className="input-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>Montant contrat (DT)</label>
                <input type="number" step="0.001" value={draft.montantContrat ?? '0'} onChange={(e) => setDraft((d) => ({ ...d, montantContrat: e.target.value }))} className="input-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>Montant prévu (DT)</label>
                <input type="number" step="0.001" value={draft.montantPrevu ?? '0'} onChange={(e) => setDraft((d) => ({ ...d, montantPrevu: e.target.value }))} className="input-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>Montant facturé (DT)</label>
                <input type="number" step="0.001" value={draft.montantFacture ?? '0'} onChange={(e) => setDraft((d) => ({ ...d, montantFacture: e.target.value }))} className="input-xs" />
              </div>
              <div className="space-y-1">
                <label className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>Majoration (%)</label>
                <input type="number" step="0.1" value={draft.majorationTaux ?? '0'} onChange={(e) => setDraft((d) => ({ ...d, majorationTaux: e.target.value }))} className="input-xs" />
              </div>
              <div className="flex items-center gap-2 text-xs col-span-1">
                <input type="checkbox" checked={draft.taciteReconduction ?? false} onChange={(e) => setDraft((d) => ({ ...d, taciteReconduction: e.target.checked }))} />
                <label style={{ color: 'var(--admin-text-muted)' }}>Tacite reconduction</label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Mois</th>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Fréquence</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Jours/interv.</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Nbre prévu</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Nbre réalisé</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.monthlyData?.map((m, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text)' }}>{MONTHS_FR[i]}</td>
                      <td className="px-2 py-1.5"><input value={m.frequence ?? ''} onChange={(e) => updateMonth(i, 'frequence', e.target.value)} placeholder="1× / semaine" className="input-xs w-28" /></td>
                      <td className="px-2 py-1.5 text-center"><input type="text" value={m.jours ?? ''} onChange={(e) => updateMonth(i, 'jours', e.target.value)} className="input-xs w-16 text-center" placeholder="0" /></td>
                      <td className="px-2 py-1.5 text-center"><input type="number" min={0} value={m.nbrePrevu ?? 0} onChange={(e) => updateMonth(i, 'nbrePrevu', parseInt(e.target.value) || 0)} className="input-xs w-16 text-center" /></td>
                      <td className="px-2 py-1.5 text-center"><input type="number" min={0} value={m.nbreRealise ?? 0} onChange={(e) => updateMonth(i, 'nbreRealise', parseInt(e.target.value) || 0)} className="input-xs w-16 text-center" /></td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--admin-border)' }}>
                    <td className="px-2 py-2 font-bold" colSpan={3} style={{ color: 'var(--admin-text)' }}>Total</td>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: 'var(--admin-text)' }}>{draftTotalPrevu}</td>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: 'var(--admin-emerald)' }}>{draftTotalRealise}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : !current ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun planning pour {selectedYear}.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Créer</button></>}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><p style={{ color: 'var(--admin-text-muted)' }}>Contrat</p><p className="font-medium" style={{ color: 'var(--admin-text)' }}>{fmt(current.montantContrat)} DT</p></div>
              <div><p style={{ color: 'var(--admin-text-muted)' }}>Prévu</p><p className="font-medium" style={{ color: 'var(--admin-text)' }}>{fmt(current.montantPrevu)} DT</p></div>
              <div><p style={{ color: 'var(--admin-text-muted)' }}>Facturé</p><p className="font-medium" style={{ color: 'var(--admin-text)' }}>{fmt(current.montantFacture)} DT</p></div>
              <div><p style={{ color: 'var(--admin-text-muted)' }}>Interventions</p><p className="font-medium" style={{ color: 'var(--admin-text)' }}>{totalRealise}/{totalPrevu} réalisées</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Mois', 'Fréquence', 'Jours', 'Prévu', 'Réalisé'].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.monthlyData?.map((m, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-2 py-2 font-medium" style={{ color: 'var(--admin-text)' }}>{MONTHS_FR[i]}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{m.frequence || '—'}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{m.jours || '—'}</td>
                      <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{m.nbrePrevu ?? 0}</td>
                      <td className="px-2 py-2 font-medium" style={{ color: m.nbreRealise ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{m.nbreRealise ?? 0}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--admin-border)' }}>
                    <td className="px-2 py-2 font-bold" colSpan={3} style={{ color: 'var(--admin-text)' }}>Total</td>
                    <td className="px-2 py-2 font-bold" style={{ color: 'var(--admin-text)' }}>{totalPrevu}</td>
                    <td className="px-2 py-2 font-bold" style={{ color: 'var(--admin-emerald)' }}>{totalRealise}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
