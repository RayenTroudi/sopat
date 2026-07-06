'use client'

import { useState } from 'react'
import { upsertProjectStudyAction } from '@/lib/actions/etude'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

type DocumentReceived = {
  name: string
  receivedDate?: string
  required?: boolean
  observation?: string
}

type StudyPhase = {
  phase: string
  plannedDays?: number
  actualDays?: number
  progressState?: string
  validationMeans?: string
  validationDate?: string
  observations?: string
}

type AmenagementType = 'amenagement' | 'reamenagement' | 'autre'

type Props = {
  projectId: string
  canEdit: boolean
  initial: {
    updatedDate?: string | null
    projectTitle?: string | null
    location?: string | null
    clientName?: string | null
    reference?: string | null
    projectDetails?: string | null
    amenagementType?: AmenagementType | null
    deadlineProposed?: string | null
    documentsReceived?: DocumentReceived[]
    clientRequests?: string | null
    durationPlannedDays?: number | null
    durationActualDays?: number | null
    startDatePlanned?: string | null
    startDateActual?: string | null
    endDatePlanned?: string | null
    endDateActual?: string | null
    phases?: StudyPhase[]
    droughtResistantRate?: string | null
    droughtResistantNote?: string | null
    responsableEtude?: string | null
  }
}

const DEFAULT_DOCS: DocumentReceived[] = [
  { name: 'Plan AutoCAD' },
  { name: 'Plan PDF' },
  { name: 'Plan Version Papier' },
  { name: 'Photos réelles' },
  { name: 'Simulations 3D' },
  { name: 'Références souhaitées' },
  { name: "Cahier de charges" },
  { name: 'Autre(s)' },
]

const DEFAULT_PHASES: StudyPhase[] = [
  { phase: 'Avant-Projet Sommaire (APS)' },
  { phase: 'Avant-Projet Détaillé (APD)' },
]

export function FicheProjetSection({ projectId, canEdit, initial }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amenagementType, setAmenagementType] = useState<AmenagementType | ''>(
    initial.amenagementType ?? ''
  )
  const [docs, setDocs] = useState<DocumentReceived[]>(
    initial.documentsReceived?.length ? initial.documentsReceived : DEFAULT_DOCS
  )
  const [phases, setPhases] = useState<StudyPhase[]>(
    initial.phases?.length ? initial.phases : DEFAULT_PHASES
  )

  function updateDoc(index: number, field: keyof DocumentReceived, value: string | boolean) {
    setDocs((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  function updatePhase(index: number, field: keyof StudyPhase, value: string | number) {
    setPhases((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const fd = new FormData(e.currentTarget)

    const result = await upsertProjectStudyAction(projectId, {
      updatedDate: fd.get('updatedDate') as string || undefined,
      projectTitle: fd.get('projectTitle') as string || undefined,
      location: fd.get('location') as string || undefined,
      clientName: fd.get('clientName') as string || undefined,
      reference: fd.get('reference') as string || undefined,
      projectDetails: fd.get('projectDetails') as string || undefined,
      deadlineProposed: fd.get('deadlineProposed') as string || undefined,
      clientRequests: fd.get('clientRequests') as string || undefined,
      durationPlannedDays: fd.get('durationPlannedDays') ? parseInt(fd.get('durationPlannedDays') as string) : undefined,
      durationActualDays: fd.get('durationActualDays') ? parseInt(fd.get('durationActualDays') as string) : undefined,
      startDatePlanned: fd.get('startDatePlanned') as string || undefined,
      startDateActual: fd.get('startDateActual') as string || undefined,
      endDatePlanned: fd.get('endDatePlanned') as string || undefined,
      endDateActual: fd.get('endDateActual') as string || undefined,
      droughtResistantRate: fd.get('droughtResistantRate') as string || undefined,
      droughtResistantNote: fd.get('droughtResistantNote') as string || undefined,
      responsableEtude: fd.get('responsableEtude') as string || undefined,
      documentsReceived: docs,
      phases,
    })

    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(result.error ?? 'Erreur inconnue')
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Fiche Projet</h2>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>FOR-ET-02</p>
        </div>
        {saved && <span className="text-[12px] font-medium" style={{ color: 'var(--admin-emerald)' }}>✓ Sauvegardé</span>}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Date de MAJ */}
        <div className="flex justify-end">
          <div className="w-48">
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date de mise à jour</label>
            <input name="updatedDate" type="date" defaultValue={initial.updatedDate ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
        </div>

        {/* Header info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Intitulé du projet</label>
            <input name="projectTitle" type="text" defaultValue={initial.projectTitle ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Localisation</label>
            <input name="location" type="text" defaultValue={initial.location ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Client</label>
            <input name="clientName" type="text" defaultValue={initial.clientName ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Référence</label>
            <input name="reference" type="text" defaultValue={initial.reference ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Deadline proposé</label>
            <input name="deadlineProposed" type="date" defaultValue={initial.deadlineProposed ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Responsable d'étude</label>
            <input name="responsableEtude" type="text" defaultValue={initial.responsableEtude ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
        </div>

        {/* Type d'aménagement */}
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type d'aménagement</label>
          <div className="flex gap-4 mt-1">
            {([
              { value: 'amenagement',   label: 'Aménagement' },
              { value: 'reamenagement', label: 'Réaménagement' },
              { value: 'autre',         label: 'Autre(s)' },
            ] as { value: AmenagementType; label: string }[]).map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                <input
                  type="radio"
                  name="amenagementType"
                  value={opt.value}
                  checked={amenagementType === opt.value}
                  onChange={() => canEdit && setAmenagementType(opt.value)}
                  disabled={!canEdit}
                  style={{ accentColor: 'var(--green)' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Détails du projet / Observations</label>
          <textarea name="projectDetails" rows={2} defaultValue={initial.projectDetails ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
        </div>

        {/* Documents reçus du client */}
        <div>
          <h3 className="text-[12px] font-semibold mb-3" style={{ color: 'var(--admin-text-muted)' }}>Documents reçus par le client</h3>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                  {['Document', 'Date de réception', 'Nécessaire', 'Observation'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--admin-text)' }}>{doc.name}</td>
                    <td className="px-3 py-2">
                      <input type="date" value={doc.receivedDate ?? ''} disabled={!canEdit}
                        onChange={(e) => updateDoc(i, 'receivedDate', e.target.value)}
                        className="px-2 py-1 rounded border text-[11px] focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', width: '130px' }} />
                    </td>
                    <td className="px-3 py-2">
                      <select value={doc.required === undefined ? '' : String(doc.required)} disabled={!canEdit}
                        onChange={(e) => updateDoc(i, 'required', e.target.value === 'true')}
                        className="px-2 py-1 rounded border text-[11px] focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
                        <option value="">—</option>
                        <option value="true">Oui</option>
                        <option value="false">Non</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={doc.observation ?? ''} disabled={!canEdit}
                        onChange={(e) => updateDoc(i, 'observation', e.target.value)}
                        className="px-2 py-1 rounded border text-[11px] w-full focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demandes spécifiques */}
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Demandes spécifiques par le client</label>
          <textarea name="clientRequests" rows={2} defaultValue={initial.clientRequests ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
        </div>

        {/* Plan d'action / Timeline */}
        <div>
          <h3 className="text-[12px] font-semibold mb-3" style={{ color: 'var(--admin-text-muted)' }}>Plan d'action</h3>
          {/* Duration row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Durée prévue (jours)</label>
              <input name="durationPlannedDays" type="number" min="0" defaultValue={initial.durationPlannedDays ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Durée réalisée (jours)</label>
              <input name="durationActualDays" type="number" min="0" defaultValue={initial.durationActualDays ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
          </div>
          {/* Dates grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Début prévu</label>
              <input name="startDatePlanned" type="date" defaultValue={initial.startDatePlanned ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Début réel</label>
              <input name="startDateActual" type="date" defaultValue={initial.startDateActual ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Fin prévue</label>
              <input name="endDatePlanned" type="date" defaultValue={initial.endDatePlanned ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Fin réalisée</label>
              <input name="endDateActual" type="date" defaultValue={initial.endDateActual ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
            </div>
          </div>

          {/* Phases */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                  {['Phase', 'Jours prévus', 'Jours réalisés', 'Avancement', 'Moyen validation', 'Date valid.', 'Observations'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phases.map((phase, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2 text-[12px] font-medium" style={{ color: 'var(--admin-text)', minWidth: '160px' }}>{phase.phase}</td>
                    {[
                      { key: 'plannedDays', type: 'number' },
                      { key: 'actualDays', type: 'number' },
                      { key: 'progressState', type: 'text' },
                      { key: 'validationMeans', type: 'text' },
                      { key: 'validationDate', type: 'date' },
                      { key: 'observations', type: 'text' },
                    ].map(({ key, type }) => (
                      <td key={key} className="px-3 py-2">
                        <input
                          type={type}
                          value={(phase as any)[key] ?? ''}
                          disabled={!canEdit}
                          onChange={(e) => updatePhase(i, key as keyof StudyPhase, e.target.value)}
                          className="px-2 py-1 rounded border text-[11px] focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)', width: type === 'date' ? '130px' : '90px' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPI Indicateur */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>% plantes résistantes au stress hydrique</label>
            <input name="droughtResistantRate" type="number" step="0.1" min="0" max="100"
              defaultValue={initial.droughtResistantRate ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Cause de non-atteinte de l'objectif</label>
            <input name="droughtResistantNote" type="text" defaultValue={initial.droughtResistantNote ?? ''} className={inputClass} style={inputStyle} disabled={!canEdit} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        {canEdit && (
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >{saving ? 'Enregistrement…' : 'Sauvegarder la fiche projet'}</button>
        )}
      </form>
    </div>
  )
}
