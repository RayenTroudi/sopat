'use client'

import { useState, useCallback, useEffect } from 'react'
import type { PvProvisioreRow, PvDefinitiveRow, ChecklistItem, Signatory } from '@/lib/db/realisation-docs'

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { designation: 'Travaux de plantations', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
  { designation: 'Engazonnement', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
  { designation: 'Matière décorative', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
  { designation: "Réseau d'arrosage", observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
  { designation: 'Maçonnerie paysagère', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
  { designation: 'Nettoyage du chantier', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false },
]

const DEFAULT_SIGNATORIES_PROV: Signatory[] = [
  { name: '', role: 'Project Manager', organisation: 'SOPAT', signed: false },
  { name: '', role: 'Maître d\'ouvrage', organisation: '', signed: false },
]

const DEFAULT_SIGNATORIES_DEF: Signatory[] = [
  { name: 'Mohamed MRABET', role: 'Représentant', organisation: 'SOPAT', signed: false },
  { name: '', role: 'Représentant', organisation: '', signed: false },
]

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Props = { projectId: string; canEdit: boolean }

// ─── PV Provisoire ────────────────────────────────────────────────────────────

export function PvProvisioreSection({ projectId, canEdit }: Props) {
  const [pv, setPv] = useState<PvProvisioreRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<PvProvisioreRow>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/pv-provisoire`)
    if (res.ok) { const d = await res.json() as PvProvisioreRow | null; setPv(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    setDraft({
      date: pv?.date ?? '',
      maitreOuvrage: pv?.maitreOuvrage ?? '',
      startDate: pv?.startDate ?? '',
      endDate: pv?.endDate ?? '',
      reserves: pv?.reserves ?? '',
      hasReserves: pv?.hasReserves ?? false,
      checklistItems: pv?.checklistItems?.length ? [...pv.checklistItems] : DEFAULT_CHECKLIST,
      signatories: pv?.signatories?.length ? [...pv.signatories] : DEFAULT_SIGNATORIES_PROV,
    })
    setEditing(true)
  }

  function updateChecklist(i: number, field: keyof ChecklistItem, val: string | boolean) {
    setDraft((d) => ({ ...d, checklistItems: d.checklistItems?.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))
  }

  function updateSignatory(i: number, field: keyof Signatory, val: string | boolean) {
    setDraft((d) => ({ ...d, signatories: d.signatories?.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/pv-provisoire`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    if (res.ok) { const d = await res.json() as PvProvisioreRow; setPv(d); setEditing(false) }
    setSaving(false)
  }

  const reserveCount = pv?.checklistItems?.filter((c) => c.reserve).length ?? 0

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>PV de Réception Provisoire</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-RE-05
            {pv && ` · ${fmtDate(pv.date)}`}
            {reserveCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>{reserveCount} réserve{reserveCount > 1 ? 's' : ''}</span>}
            {pv?.isFinalized && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Finalisé</span>}
          </p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {pv ? 'Modifier' : 'Créer le PV'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : editing ? (
          <div className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Date du PV"><input type="date" value={draft.date ?? ''} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} className="input-xs" /></Field>
              <Field label="Maître d'ouvrage"><input value={draft.maitreOuvrage ?? ''} onChange={(e) => setDraft((d) => ({ ...d, maitreOuvrage: e.target.value }))} className="input-xs" /></Field>
              <Field label="Date démarrage"><input type="date" value={draft.startDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} className="input-xs" /></Field>
              <Field label="Date fin"><input type="date" value={draft.endDate ?? ''} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} className="input-xs" /></Field>
            </div>

            {/* Checklist */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--admin-text-muted)' }}>Points à vérifier</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {['Désignation', 'Observations', 'Décision', 'Action', 'Responsable', 'Délai', 'Réserve'].map((h) => (
                        <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.checklistItems?.map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                        <td className="px-2 py-1.5"><input value={item.designation} onChange={(e) => updateChecklist(i, 'designation', e.target.value)} className="input-xs w-full" /></td>
                        <td className="px-2 py-1.5"><input value={item.observation} onChange={(e) => updateChecklist(i, 'observation', e.target.value)} className="input-xs w-full" /></td>
                        <td className="px-2 py-1.5"><input value={item.decision} onChange={(e) => updateChecklist(i, 'decision', e.target.value)} className="input-xs w-full" /></td>
                        <td className="px-2 py-1.5"><input value={item.action} onChange={(e) => updateChecklist(i, 'action', e.target.value)} className="input-xs w-full" /></td>
                        <td className="px-2 py-1.5"><input value={item.responsable} onChange={(e) => updateChecklist(i, 'responsable', e.target.value)} className="input-xs w-full" /></td>
                        <td className="px-2 py-1.5"><input value={item.delai} onChange={(e) => updateChecklist(i, 'delai', e.target.value)} className="input-xs w-20" /></td>
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={item.reserve} onChange={(e) => updateChecklist(i, 'reserve', e.target.checked)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setDraft((d) => ({ ...d, checklistItems: [...(d.checklistItems ?? []), { designation: '', observation: '', decision: '', action: '', responsable: '', delai: '', reserve: false }] }))} className="mt-2 text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>+ Ajouter un point</button>
            </div>

            {/* Reserves */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                <input type="checkbox" checked={draft.hasReserves ?? false} onChange={(e) => setDraft((d) => ({ ...d, hasReserves: e.target.checked }))} />
                Des réserves ont été émises
              </label>
              {draft.hasReserves && (
                <textarea value={draft.reserves ?? ''} onChange={(e) => setDraft((d) => ({ ...d, reserves: e.target.value }))} rows={3} placeholder="Détail des réserves…" className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              )}
            </div>

            {/* Signatories */}
            <SignatoriesEditor signatories={draft.signatories ?? []} onChange={(s) => setDraft((d) => ({ ...d, signatories: s }))} />

            {/* Finalize */}
            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              <input type="checkbox" checked={draft.isFinalized ?? false} onChange={(e) => setDraft((d) => ({ ...d, isFinalized: e.target.checked }))} />
              Marquer comme finalisé (verrouille le PV)
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : !pv ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun PV provisoire.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Créer</button></>}
          </p>
        ) : (
          <PvReadView
            items={[
              { label: 'Date', value: fmtDate(pv.date) },
              { label: "Maître d'ouvrage", value: pv.maitreOuvrage ?? '—' },
              { label: 'Démarrage', value: fmtDate(pv.startDate) },
              { label: 'Fin', value: fmtDate(pv.endDate) },
            ]}
            checklist={pv.checklistItems}
            signatories={pv.signatories}
            reserves={pv.hasReserves ? pv.reserves : null}
          />
        )}
      </div>
    </div>
  )
}

// ─── PV Définitif ─────────────────────────────────────────────────────────────

export function PvDefinitiveSection({ projectId, canEdit }: Props) {
  const [pv, setPv] = useState<PvDefinitiveRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<PvDefinitiveRow>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/pv-definitive`)
    if (res.ok) { const d = await res.json() as PvDefinitiveRow | null; setPv(d) }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    setDraft({
      date: pv?.date ?? '',
      titulaireDuMarche: pv?.titulaireDuMarche ?? 'SOPAT',
      dateApprobationMarche: pv?.dateApprobationMarche ?? '',
      delaiExecution: pv?.delaiExecution ?? '',
      dateDebutTravaux: pv?.dateDebutTravaux ?? '',
      dateFinTravaux: pv?.dateFinTravaux ?? '',
      attestationText: pv?.attestationText ?? '',
      signatories: pv?.signatories?.length ? [...pv.signatories] : DEFAULT_SIGNATORIES_DEF,
      isFinalized: pv?.isFinalized ?? false,
    })
    setEditing(true)
  }

  function updateSignatory(i: number, field: keyof Signatory, val: string | boolean) {
    setDraft((d) => ({ ...d, signatories: d.signatories?.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/pv-definitive`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    if (res.ok) { const d = await res.json() as PvDefinitiveRow; setPv(d); setEditing(false) }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>PV de Réception Définitive</h3>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-RE-14
            {pv && ` · ${fmtDate(pv.date)}`}
            {pv?.isFinalized && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Finalisé</span>}
          </p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {pv ? 'Modifier' : 'Créer le PV'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
        ) : editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Date du PV"><input type="date" value={draft.date ?? ''} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} className="input-xs" /></Field>
              <Field label="Titulaire du marché"><input value={draft.titulaireDuMarche ?? ''} onChange={(e) => setDraft((d) => ({ ...d, titulaireDuMarche: e.target.value }))} className="input-xs" /></Field>
              <Field label="Délai d'exécution"><input value={draft.delaiExecution ?? ''} onChange={(e) => setDraft((d) => ({ ...d, delaiExecution: e.target.value }))} placeholder="Ex: 3 mois" className="input-xs" /></Field>
              <Field label="Date approbation marché"><input type="date" value={draft.dateApprobationMarche ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateApprobationMarche: e.target.value }))} className="input-xs" /></Field>
              <Field label="Date début travaux"><input type="date" value={draft.dateDebutTravaux ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateDebutTravaux: e.target.value }))} className="input-xs" /></Field>
              <Field label="Date fin travaux"><input type="date" value={draft.dateFinTravaux ?? ''} onChange={(e) => setDraft((d) => ({ ...d, dateFinTravaux: e.target.value }))} className="input-xs" /></Field>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Texte d'attestation</label>
              <textarea value={draft.attestationText ?? ''} onChange={(e) => setDraft((d) => ({ ...d, attestationText: e.target.value }))} rows={3} className="w-full px-2 py-1.5 rounded border text-xs resize-none" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
            </div>

            <SignatoriesEditor signatories={draft.signatories ?? []} onChange={(s) => setDraft((d) => ({ ...d, signatories: s }))} />

            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              <input type="checkbox" checked={draft.isFinalized ?? false} onChange={(e) => setDraft((d) => ({ ...d, isFinalized: e.target.checked }))} />
              Marquer comme finalisé
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
            </div>
          </div>
        ) : !pv ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun PV définitif.{canEdit && <> <button type="button" onClick={startEdit} className="underline" style={{ color: 'var(--admin-accent)' }}>Créer</button></>}
          </p>
        ) : (
          <PvReadView
            items={[
              { label: 'Date', value: fmtDate(pv.date) },
              { label: 'Titulaire', value: pv.titulaireDuMarche ?? '—' },
              { label: "Délai d'exécution", value: pv.delaiExecution ?? '—' },
              { label: 'Début travaux', value: fmtDate(pv.dateDebutTravaux) },
              { label: 'Fin travaux', value: fmtDate(pv.dateFinTravaux) },
            ]}
            checklist={[]}
            signatories={pv.signatories}
            reserves={null}
            attestation={pv.attestationText}
          />
        )}
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function SignatoriesEditor({ signatories, onChange }: { signatories: Signatory[]; onChange: (s: Signatory[]) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--admin-text-muted)' }}>Signataires</p>
      <div className="space-y-2">
        {signatories.map((s, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 items-center">
            <input value={s.name} onChange={(e) => { const n = [...signatories]; n[i] = { ...s, name: e.target.value }; onChange(n) }} placeholder="Nom & prénom" className="input-xs col-span-1" />
            <input value={s.role} onChange={(e) => { const n = [...signatories]; n[i] = { ...s, role: e.target.value }; onChange(n) }} placeholder="Rôle" className="input-xs col-span-1" />
            <input value={s.organisation} onChange={(e) => { const n = [...signatories]; n[i] = { ...s, organisation: e.target.value }; onChange(n) }} placeholder="Organisation" className="input-xs col-span-1" />
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              <input type="checkbox" checked={s.signed} onChange={(e) => { const n = [...signatories]; n[i] = { ...s, signed: e.target.checked }; onChange(n) }} />
              Signé
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...signatories, { name: '', role: '', organisation: '', signed: false }])} className="mt-2 text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>+ Ajouter signataire</button>
    </div>
  )
}

function PvReadView({ items, checklist, signatories, reserves, attestation }: {
  items: { label: string; value: string }[]
  checklist: ChecklistItem[]
  signatories: Signatory[]
  reserves: string | null | undefined
  attestation?: string | null
}) {
  const hasReserves = checklist.some((c) => c.reserve)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {items.map(({ label, value }) => (
          <div key={label}><p style={{ color: 'var(--admin-text-muted)' }}>{label}</p><p className="font-medium mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p></div>
        ))}
      </div>
      {checklist.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Désignation', 'Observations', 'Décision', 'Action', 'Responsable', 'Délai', 'Réserve'].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{checklist.map((c, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text)' }}>{c.designation}</td>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{c.observation || '—'}</td>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{c.decision || '—'}</td>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{c.action || '—'}</td>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{c.responsable || '—'}</td>
                <td className="px-2 py-2" style={{ color: 'var(--admin-text-muted)' }}>{c.delai || '—'}</td>
                <td className="px-2 py-2 text-center">{c.reserve ? <span style={{ color: 'var(--admin-amber)' }}>⚠</span> : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {attestation && <p className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>{attestation}</p>}
      {reserves && <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>⚠ {reserves}</div>}
      {signatories.length > 0 && (
        <div className="flex gap-6 flex-wrap">
          {signatories.map((s, i) => (
            <div key={i} className="text-xs space-y-1">
              <p style={{ color: 'var(--admin-text-muted)' }}>{s.role} — {s.organisation}</p>
              <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{s.name || '—'}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: s.signed ? 'var(--admin-emerald-dim)' : 'var(--admin-border)', color: s.signed ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{s.signed ? '✓ Signé' : 'Non signé'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
