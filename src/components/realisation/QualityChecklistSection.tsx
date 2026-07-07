'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ChecklistRecord, ChecklistItemQuality } from '@/lib/db/realisation-docs'

// ─── Checklist definitions (FOR-RE-07 to -12) ─────────────────────────────────

type ChecklistDef = {
  type: string
  code: string
  label: string
  phase: string
  items: { itemId: string; label: string; phase?: string }[]
}

const CHECKLISTS: ChecklistDef[] = [
  {
    type: 'travaux_preliminaires',
    code: 'FOR-RE-07',
    label: 'Travaux Préliminaires',
    phase: 'Phase I',
    items: [
      { itemId: 'tp-01', label: 'Installation du chantier conforme au plan', phase: 'I.1' },
      { itemId: 'tp-02', label: 'Clôture et signalisation du chantier effectuées', phase: 'I.1' },
      { itemId: 'tp-03', label: 'Piquetage et implantation vérifiés', phase: 'I.2' },
      { itemId: 'tp-04', label: 'Nivellement du terrain exécuté', phase: 'I.2' },
      { itemId: 'tp-05', label: 'Débroussaillage et nettoyage préliminaire', phase: 'I.3' },
      { itemId: 'tp-06', label: 'Excavations et terrassements conformes aux plans', phase: 'I.3' },
      { itemId: 'tp-07', label: 'Évacuation des déblais effectuée', phase: 'I.3' },
      { itemId: 'tp-08', label: 'Essai du sol réalisé (si requis)', phase: 'I.4' },
      { itemId: 'tp-09', label: 'Rapport géotechnique disponible', phase: 'I.4' },
      { itemId: 'tp-10', label: 'Zone de stockage des matériaux délimitée', phase: 'I.1' },
    ],
  },
  {
    type: 'reseaux_maconnerie',
    code: 'FOR-RE-08',
    label: 'Réseaux & Maçonnerie',
    phase: 'Phase V–VI',
    items: [
      { itemId: 'rm-01', label: 'Tranchées pour réseaux d\'irrigation réalisées', phase: 'V' },
      { itemId: 'rm-02', label: 'Canalisation posée et jointée correctement', phase: 'V' },
      { itemId: 'rm-03', label: 'Test étanchéité du réseau effectué', phase: 'V' },
      { itemId: 'rm-04', label: 'Réseau électrique (éclairage) installé', phase: 'V' },
      { itemId: 'rm-05', label: 'Remblaiement des tranchées conforme', phase: 'V' },
      { itemId: 'rm-06', label: 'Fondations maçonnerie conformes aux plans', phase: 'VI' },
      { itemId: 'rm-07', label: 'Murs et ouvrages en béton coulés', phase: 'VI' },
      { itemId: 'rm-08', label: 'Dallages et allées réalisés', phase: 'VI' },
      { itemId: 'rm-09', label: 'Mobilier urbain ancré et fixé', phase: 'VI' },
      { itemId: 'rm-10', label: 'Inspection finale réseaux & maçonnerie', phase: 'VI' },
    ],
  },
  {
    type: 'plantations',
    code: 'FOR-RE-09',
    label: 'Plantations',
    phase: 'Phase VIII',
    items: [
      { itemId: 'pl-01', label: 'Fosses de plantation dimensionnées selon espèces', phase: 'VIII' },
      { itemId: 'pl-02', label: 'Substrat de plantation conforme aux spécifications', phase: 'VIII' },
      { itemId: 'pl-03', label: 'Amendements organiques incorporés', phase: 'VIII' },
      { itemId: 'pl-04', label: 'Arbres et arbustes plantés selon plan de masse', phase: 'VIII' },
      { itemId: 'pl-05', label: 'Tuteurage des arbres effectué', phase: 'VIII' },
      { itemId: 'pl-06', label: 'Espacement entre plants respecté', phase: 'VIII' },
      { itemId: 'pl-07', label: 'Arrosage de reprise effectué après plantation', phase: 'VIII' },
      { itemId: 'pl-08', label: 'Étiquetage des espèces réalisé', phase: 'VIII' },
      { itemId: 'pl-09', label: 'Vérification du bon état sanitaire des plants', phase: 'VIII' },
      { itemId: 'pl-10', label: 'PV de réception pépinière signé', phase: 'VIII' },
    ],
  },
  {
    type: 'engazonnement',
    code: 'FOR-RE-10',
    label: 'Engazonnement',
    phase: 'Phase IX',
    items: [
      { itemId: 'eg-01', label: 'Préparation du sol (labour, scarification)', phase: 'IX' },
      { itemId: 'eg-02', label: 'Amendements et fertilisation du sol', phase: 'IX' },
      { itemId: 'eg-03', label: 'Nivellement et planage final', phase: 'IX' },
      { itemId: 'eg-04', label: 'Semis ou pose de gazon conforme aux specs', phase: 'IX' },
      { itemId: 'eg-05', label: 'Arrosage immédiat après pose', phase: 'IX' },
      { itemId: 'eg-06', label: 'Densité de semis respectée', phase: 'IX' },
      { itemId: 'eg-07', label: 'Espèces gazon conformes aux plans', phase: 'IX' },
      { itemId: 'eg-08', label: 'Zones d\'engazonnement délimitées correctement', phase: 'IX' },
    ],
  },
  {
    type: 'matiere_decorative',
    code: 'FOR-RE-11',
    label: 'Matière Décorative',
    phase: 'Phase X',
    items: [
      { itemId: 'md-01', label: 'Graviers décoratifs posés selon plan', phase: 'X' },
      { itemId: 'md-02', label: 'Épaisseur de graviers conforme (5–10 cm)', phase: 'X' },
      { itemId: 'md-03', label: 'Géotextile posé sous les graviers', phase: 'X' },
      { itemId: 'md-04', label: 'Pierres décoratives positionnées selon plan', phase: 'X' },
      { itemId: 'md-05', label: 'Rocailles et murets décoratifs stabilisés', phase: 'X' },
      { itemId: 'md-06', label: 'Paillage organique appliqué autour des plants', phase: 'X' },
      { itemId: 'md-07', label: 'Conformité des teintes et granulométries', phase: 'X' },
      { itemId: 'md-08', label: 'Nettoyage final de la zone décorative', phase: 'X' },
    ],
  },
  {
    type: 'fourniture_plantes',
    code: 'FOR-RE-12',
    label: 'Fourniture des Plantes',
    phase: 'Phase VIII.2',
    items: [
      { itemId: 'fp-01', label: 'Bon de commande plantes émis', phase: 'VIII.2' },
      { itemId: 'fp-02', label: 'Espèces livrées conformes au BPU', phase: 'VIII.2' },
      { itemId: 'fp-03', label: 'Quantités livrées conformes au bon de commande', phase: 'VIII.2' },
      { itemId: 'fp-04', label: 'Hauteur / calibre des plants conforme aux specs', phase: 'VIII.2' },
      { itemId: 'fp-05', label: 'État sanitaire des plants vérifié à la livraison', phase: 'VIII.2' },
      { itemId: 'fp-06', label: 'Étiquetage des espèces présent', phase: 'VIII.2' },
      { itemId: 'fp-07', label: 'Motte intacte et bien hydratée', phase: 'VIII.2' },
      { itemId: 'fp-08', label: 'Facture pépinière jointe', phase: 'VIII.2' },
      { itemId: 'fp-09', label: 'Certificat phytosanitaire disponible (si requis)', phase: 'VIII.2' },
      { itemId: 'fp-10', label: 'Bon de livraison signé par le chef de chantier', phase: 'VIII.2' },
    ],
  },
]

// ─── INS-RE-01: Instruction process phases ────────────────────────────────────

const INSTRUCTION_PHASES = [
  { num: 'I',    label: 'Travaux préliminaires', responsible: 'TEM/PRM', steps: ['I.1 Installation chantier', 'I.2 Implantation piquetage', 'I.3 Terrassements', 'I.4 Essais sol'] },
  { num: 'II',   label: 'Terre végétale', responsible: 'TEM', steps: ['II.1 Fourniture terre végétale', 'II.2 Épandage et nivellement'] },
  { num: 'III',  label: 'Amendement organique', responsible: 'TEM', steps: ['III.1 Fourniture amendements', 'III.2 Incorporation au sol'] },
  { num: 'IV',   label: 'Amendement minéral', responsible: 'TEM', steps: ['IV.1 Analyse sol', 'IV.2 Apport correctif'] },
  { num: 'V',    label: 'Réseaux', responsible: 'TEM/SIM', steps: ['V.1 Tranchées réseaux', 'V.2 Pose canalisations irrigation', 'V.3 Réseau électrique', 'V.4 Tests étanchéité', 'V.5 Remblaiement'] },
  { num: 'VI',   label: 'Maçonnerie', responsible: 'TEM/SIM', steps: ['VI.1 Fondations', 'VI.2 Maçonnerie et béton', 'VI.3 Dallages et allées', 'VI.4 Mobilier urbain'] },
  { num: 'VII',  label: 'Démonstration à blanc', responsible: 'PRM/SIM', steps: ['VII.1 Test réseau irrigation', 'VII.2 Test éclairage', 'VII.3 Validation client'] },
  { num: 'VIII', label: 'Plantations', responsible: 'TEM/SIM', steps: ['VIII.1 Réception plants pépinière', 'VIII.2 Fourniture plantes', 'VIII.3 Plantation selon plan masse', 'VIII.4 Tuteurage et arrosage reprise'] },
  { num: 'IX',   label: 'Engazonnement', responsible: 'TEM', steps: ['IX.1 Préparation sol', 'IX.2 Semis / pose gazon', 'IX.3 Arrosage'] },
  { num: 'X',    label: 'Matière décorative', responsible: 'TEM', steps: ['X.1 Géotextile', 'X.2 Graviers et pierres', 'X.3 Paillage'] },
  { num: 'XI',   label: 'Plan de récolement', responsible: 'PRM/GM', steps: ['XI.1 Levé topographique as-built', 'XI.2 Mise à jour plans', 'XI.3 Remise dossier client'] },
]

const RESPONSIBLE_LABELS: Record<string, string> = {
  TEM: 'Chef Chantier',
  PRM: 'Project Manager',
  SIM: 'Inspecteur Site',
  GM: 'Direction Générale',
  LEG: 'Ingénieur Paysagiste',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = { projectId: string; canEdit: boolean }

// ─── Main Section ──────────────────────────────────────────────────────────────

export function QualityChecklistSection({ projectId, canEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'instruction' | string>('instruction')

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      {/* Header */}
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Instructions & Check-lists qualité réalisation</h3>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>INS-RE-01 · FOR-RE-07 à FOR-RE-12</p>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <TabButton active={activeTab === 'instruction'} onClick={() => setActiveTab('instruction')} label="INS-RE-01" sub="Instruction" />
        {CHECKLISTS.map((cl) => (
          <TabButton key={cl.type} active={activeTab === cl.type} onClick={() => setActiveTab(cl.type)} label={cl.code} sub={cl.label} />
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'instruction' ? (
          <InstructionView />
        ) : (
          <ChecklistView
            projectId={projectId}
            canEdit={canEdit}
            def={CHECKLISTS.find((c) => c.type === activeTab)!}
          />
        )}
      </div>
    </div>
  )
}

// ─── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 px-3 py-2 text-left border-r"
      style={{
        borderColor: 'var(--admin-border)',
        background: active ? 'var(--admin-emerald-dim)' : 'transparent',
        borderBottom: active ? '2px solid var(--admin-emerald)' : '2px solid transparent',
      }}
    >
      <p className="text-[11px] font-semibold" style={{ color: active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>{sub}</p>
    </button>
  )
}

// ─── InstructionView (INS-RE-01) ───────────────────────────────────────────────

function InstructionView() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        Document de référence — lecture seule. Les check-lists ci-contre permettent le suivi par projet.
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
        Codes responsables : {Object.entries(RESPONSIBLE_LABELS).map(([k, v]) => `${k} = ${v}`).join(' · ')}
      </div>

      <div className="space-y-2">
        {INSTRUCTION_PHASES.map((phase) => (
          <div key={phase.num} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--admin-bg)' }}>
              <div>
                <span className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Phase {phase.num} — {phase.label}</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                {phase.responsible.split('/').map((r) => RESPONSIBLE_LABELS[r] ?? r).join(' / ')}
              </span>
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1">
              {phase.steps.map((step) => (
                <span key={step} className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                  <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--admin-text-muted)', flexShrink: 0 }} />
                  {step}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ChecklistView (FOR-RE-07 to -12) ─────────────────────────────────────────

function ChecklistView({ projectId, canEdit, def }: { projectId: string; canEdit: boolean; def: ChecklistDef }) {
  const [record, setRecord] = useState<ChecklistRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ChecklistRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/quality-checklist?type=${def.type}`)
    if (res.ok) { const d = await res.json() as ChecklistRecord | null; setRecord(d) }
    setLoading(false)
  }, [projectId, def.type])

  useEffect(() => { void load() }, [load])

  function startEdit() {
    const existingItems = record?.items ?? []
    const seededItems: ChecklistItemQuality[] = def.items.map((item) => {
      const found = existingItems.find((i) => i.itemId === item.itemId)
      return found ?? { ...item, checked: false, observation: '' }
    })
    setDraft({
      id: record?.id ?? '',
      projectId,
      checklistType: def.type,
      items: seededItems,
      signedByName: record?.signedByName ?? '',
      signedDate: record?.signedDate ?? '',
      isFinalized: record?.isFinalized ?? false,
      createdAt: record?.createdAt ?? new Date(),
    })
    setEditing(true)
  }

  function toggleItem(itemId: string) {
    setDraft((d) => d ? { ...d, items: d.items.map((it) => it.itemId === itemId ? { ...it, checked: !it.checked } : it) } : d)
  }

  function setObs(itemId: string, observation: string) {
    setDraft((d) => d ? { ...d, items: d.items.map((it) => it.itemId === itemId ? { ...it, observation } : it) } : d)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}/quality-checklist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: def.type, items: draft.items, signedByName: draft.signedByName, signedDate: draft.signedDate, isFinalized: draft.isFinalized }),
    })
    if (res.ok) { await load(); setEditing(false) }
    setSaving(false)
  }

  const displayItems: ChecklistItemQuality[] = editing && draft
    ? draft.items
    : def.items.map((item) => record?.items?.find((i) => i.itemId === item.itemId) ?? { ...item, checked: false, observation: '' })

  const checkedCount = displayItems.filter((i) => i.checked).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {def.phase} · {checkedCount}/{displayItems.length} points validés
          {record?.isFinalized && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Finalisé</span>}
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            {record ? 'Modifier' : 'Remplir'}
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--admin-emerald)' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-4 flex justify-center"><span className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} /></div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${displayItems.length ? (checkedCount / displayItems.length) * 100 : 0}%`, background: 'var(--admin-emerald)' }} />
          </div>

          {/* Items table */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)', width: '36px' }}>✓</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>Point de contrôle</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)', width: '60px' }}>Phase</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--admin-text-muted)', width: '220px' }}>Observation</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => (
                  <tr key={item.itemId} style={{ borderTop: '1px solid var(--admin-border)', background: item.checked ? 'color-mix(in srgb, var(--admin-emerald) 5%, transparent)' : 'transparent' }}>
                    <td className="px-3 py-2 text-center">
                      {editing ? (
                        <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.itemId)} className="w-4 h-4" />
                      ) : (
                        <span style={{ color: item.checked ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
                          {item.checked ? '✓' : '○'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--admin-text)' }}>{item.label}</td>
                    <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{item.phase ?? '—'}</td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input
                          type="text"
                          value={item.observation}
                          onChange={(e) => setObs(item.itemId, e.target.value)}
                          placeholder="Observation…"
                          className="w-full px-2 py-1 rounded border text-xs"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--admin-text-muted)' }}>{item.observation || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature block */}
          {editing && draft ? (
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="space-y-1">
                <label style={{ color: 'var(--admin-text-muted)' }}>Signé par</label>
                <input type="text" value={draft.signedByName ?? ''} onChange={(e) => setDraft((d) => d ? { ...d, signedByName: e.target.value } : d)}
                  placeholder="Nom et qualité…"
                  className="w-full px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1">
                <label style={{ color: 'var(--admin-text-muted)' }}>Date de signature</label>
                <input type="date" value={draft.signedDate ?? ''} onChange={(e) => setDraft((d) => d ? { ...d, signedDate: e.target.value } : d)}
                  className="w-full px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={draft.isFinalized} onChange={(e) => setDraft((d) => d ? { ...d, isFinalized: e.target.checked } : d)} />
                <label style={{ color: 'var(--admin-text-muted)' }}>Marquer comme finalisé (verrouille la check-list)</label>
              </div>
            </div>
          ) : record?.signedByName ? (
            <div className="text-xs pt-2" style={{ color: 'var(--admin-text-muted)' }}>
              Signé par <strong style={{ color: 'var(--admin-text)' }}>{record.signedByName}</strong>
              {record.signedDate && <> le {new Date(record.signedDate).toLocaleDateString('fr-FR')}</>}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
