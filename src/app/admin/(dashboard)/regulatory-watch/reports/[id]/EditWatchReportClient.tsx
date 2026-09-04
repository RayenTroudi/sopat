'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveRegulatoryWatchReport } from '@/lib/actions/regulatory-watch'

// Redéfinis ici plutôt qu'importés de '@/lib/db/regulatory-watch' : ce module
// touche la base, et l'importer depuis un composant client le ferait entrer
// dans le bundle navigateur.
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const cellClass =
  'w-full px-2 py-1.5 rounded border text-[12px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
}
const labelClass = 'block text-[12px] font-medium mb-1'

/** Les processus du SMQ — colonne « Processus Rattaché » du FOR-MI-02. */
const PROCESS_CODES = [
  { value: '',    label: '—' },
  { value: 'MI',  label: 'MI' },
  { value: 'MI1', label: 'MI1' },
  { value: 'MI2', label: 'MI2' },
  { value: 'CO',  label: 'CO' },
  { value: 'ET',  label: 'ET' },
  { value: 'AC',  label: 'AC' },
  { value: 'RE1', label: 'RE1' },
  { value: 'RE2', label: 'RE2' },
  { value: 'RH',  label: 'RH' },
]

type Line = {
  id?: string
  watchDate: string | null
  watchType: string | null
  axis: string | null
  reference: string | null
  content: string | null
  version: string | null
  consultationSource: string | null
  results: string | null
  applicationLevel: string | null
  conformityAssessment: string | null
  associatedRisk: string | null
  processCode: string | null
  comments: string | null
  sortOrder: number
}

type Report = {
  id: string
  reference: string
  year: number
  status: 'planned' | 'in_progress' | 'completed'
  revisionNumber: number
  creatorName: string | null
  completedAt: string | null
  lines: Line[]
}

type TrailEntry = {
  id: string
  action: string
  actorName: string
  occurredAt: string
  changeReason: string | null
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
}

const emptyLine = (sortOrder: number): Line => ({
  watchDate: null,
  watchType: '',
  axis: '',
  reference: '',
  content: '',
  version: '',
  consultationSource: '',
  results: '',
  applicationLevel: '',
  conformityAssessment: '',
  associatedRisk: '',
  processCode: null,
  comments: '',
  sortOrder,
})

/** Les colonnes de la grille, dans l'ordre exact du formulaire officiel. */
const COLUMNS: { key: keyof Line; header: string; width: number; kind?: 'date' | 'process' }[] = [
  { key: 'watchDate',            header: 'Date',                             width: 130, kind: 'date' },
  { key: 'watchType',            header: 'Type',                             width: 120 },
  { key: 'axis',                 header: 'Axe',                              width: 120 },
  { key: 'reference',            header: 'Document (Référence)',             width: 160 },
  { key: 'content',              header: 'Contenu',                          width: 220 },
  { key: 'version',              header: 'Version / Edition',                width: 110 },
  { key: 'consultationSource',   header: 'Document ou site de consultation', width: 200 },
  { key: 'results',              header: 'Résultats',                        width: 200 },
  { key: 'applicationLevel',     header: 'Evaluation du degré d’application', width: 180 },
  { key: 'conformityAssessment', header: 'Evaluation de la conformité',      width: 180 },
  { key: 'associatedRisk',       header: 'Risque associé',                   width: 160 },
  { key: 'processCode',          header: 'Processus Rattaché',               width: 110, kind: 'process' },
  { key: 'comments',             header: 'Commentaires',                     width: 180 },
]

export default function EditWatchReportClient({
  report,
  trail,
}: {
  report: Report
  trail: TrailEntry[]
}) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>(report.lines)
  const [changeReason, setChangeReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Un rapport terminé ne se modifie pas comme un brouillon : le motif devient
   * obligatoire et l'enregistrement passera en révision suivante. Le serveur
   * applique la même règle — celle d'ici n'est qu'un raccourci d'affichage.
   */
  const isLocked = report.status === 'completed'

  function patchLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await saveRegulatoryWatchReport(report.id, {
      year:   Number(fd.get('year')),
      status: fd.get('status') as Report['status'],
      lines: lines.map((l, i) => ({
        id: l.id,
        watchDate: l.watchDate || null,
        watchType: l.watchType || null,
        axis: l.axis || null,
        reference: l.reference || null,
        content: l.content || null,
        version: l.version || null,
        consultationSource: l.consultationSource || null,
        results: l.results || null,
        applicationLevel: l.applicationLevel || null,
        conformityAssessment: l.conformityAssessment || null,
        associatedRisk: l.associatedRisk || null,
        processCode: l.processCode || null,
        comments: l.comments || null,
        sortOrder: i,
      })),
      changeReason: changeReason.trim() || undefined,
    })

    if (result.success) {
      router.push('/admin/regulatory-watch')
      router.refresh()
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/regulatory-watch"
          className="text-[13px] hover:opacity-70 transition-opacity"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          ← Retour
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
            {report.reference}
          </h1>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-02 — Rapport de veille normative et réglementaire · Rév. {report.revisionNumber}
            {report.creatorName ? ` · créé par ${report.creatorName}` : ''}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
        >
          {STATUS_LABELS[report.status]}
        </span>
      </div>

      {isLocked && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-[13px]"
          style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
        >
          Ce rapport est terminé. Toute modification crée la révision{' '}
          <strong>{report.revisionNumber + 1}</strong> et exige un motif, conservé au journal de
          traçabilité (ISO 9001:2015 §7.5.3.2).
        </div>
      )}

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* En-tête du formulaire officiel : « Année » */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Année *
              </label>
              <input
                type="number"
                name="year"
                required
                min={2000}
                max={2100}
                defaultValue={report.year}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Statut
              </label>
              <select
                name="status"
                defaultValue={report.status}
                className={inputClass}
                style={inputStyle}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {report.completedAt && (
              <div>
                <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                  Clôturé le
                </label>
                <p className="text-[13px] pt-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(report.completedAt).toLocaleString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* La grille : une ligne par texte consulté */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--admin-border)' }}
          >
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Textes consultés ({lines.length})
            </h2>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine(prev.length)])}
              className="text-[12px] font-medium px-2.5 py-1 rounded border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
            >
              + Ligne
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 2100 }}>
              <thead>
                <tr style={{ background: 'var(--admin-bg)' }}>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="text-left px-3 py-2 text-[11px] font-medium align-bottom"
                      style={{ color: 'var(--admin-text-muted)', minWidth: c.width }}
                    >
                      {c.header}
                    </th>
                  ))}
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={line.id ?? `new-${i}`} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-3 py-2 align-top" style={{ minWidth: c.width }}>
                        {c.kind === 'date' ? (
                          <input
                            type="date"
                            value={(line.watchDate as string | null) ?? ''}
                            onChange={(e) => patchLine(i, { watchDate: e.target.value || null })}
                            className={cellClass}
                            style={inputStyle}
                          />
                        ) : c.kind === 'process' ? (
                          <select
                            value={(line.processCode as string | null) ?? ''}
                            onChange={(e) => patchLine(i, { processCode: e.target.value || null })}
                            className={cellClass}
                            style={inputStyle}
                          >
                            {PROCESS_CODES.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={(line[c.key] as string | null) ?? ''}
                            onChange={(e) => patchLine(i, { [c.key]: e.target.value } as Partial<Line>)}
                            className={c.key === 'reference' ? `${cellClass} font-mono` : cellClass}
                            style={inputStyle}
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 w-10 align-top">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                        title="Retirer la ligne"
                        className="text-[13px] px-1.5 py-0.5 rounded hover:opacity-70"
                        style={{ color: 'var(--admin-red)' }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="px-4 py-10 text-center text-sm"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      Aucun texte dans ce rapport.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Motif : obligatoire dès que le rapport est clos */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
            Motif de la modification {isLocked && <span style={{ color: 'var(--admin-red)' }}>*</span>}
          </label>
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            rows={2}
            required={isLocked}
            placeholder={
              isLocked
                ? 'Ex. : parution du décret 2026-118 omise, ajoutée après relecture du pilote MI.'
                : 'Facultatif tant que le rapport n’est pas terminé.'
            }
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/regulatory-watch"
            className="px-4 py-2 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading || (isLocked && !changeReason.trim())}
            className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading
              ? 'Enregistrement…'
              : isLocked
                ? `Enregistrer en révision ${report.revisionNumber + 1}`
                : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Journal de traçabilité */}
      <div
        className="mt-8 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Historique ({trail.length})
          </h2>
        </div>
        <ul>
          {trail.map((entry) => (
            <li key={entry.id} className="px-5 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-medium" style={{ color: 'var(--admin-text)' }}>
                  {entry.actorName}
                </span>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(entry.occurredAt).toLocaleString('fr-FR')}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
                >
                  {entry.action}
                </span>
              </div>
              {entry.changeReason && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--admin-text)' }}>
                  Motif : {entry.changeReason}
                </p>
              )}
              {entry.newState && Object.keys(entry.newState).length > 0 && (
                <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                  {Object.keys(entry.newState)
                    .map(
                      (k) =>
                        `${k}: ${String(entry.previousState?.[k] ?? '—')} → ${String(entry.newState?.[k] ?? '—')}`,
                    )
                    .join(' · ')}
                </p>
              )}
            </li>
          ))}
          {trail.length === 0 && (
            <li className="px-5 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune modification enregistrée.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
