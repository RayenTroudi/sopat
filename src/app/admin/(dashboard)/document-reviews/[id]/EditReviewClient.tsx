'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveDocumentReview } from '@/lib/actions/document-reviews'

// Redéfinis ici plutôt qu'importés de '@/lib/db/document-reviews' : ce module
// touche la base, et l'importer depuis un composant client le ferait entrer
// dans le bundle navigateur.
const DOC_REVIEW_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
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

/** Les processus du SMQ, tels que l'en-tête « Processus: » du FOR-MI-01. */
const PROCESS_CODES = [
  { value: '',    label: '—' },
  { value: 'MI',  label: 'MI — Management Intégré' },
  { value: 'MI1', label: 'MI1 — Qualité' },
  { value: 'MI2', label: 'MI2 — Environnement' },
  { value: 'CO',  label: 'CO — Commercial' },
  { value: 'ET',  label: 'ET — Étude' },
  { value: 'AC',  label: 'AC — Achat' },
  { value: 'RE1', label: 'RE1 — Réalisation 1' },
  { value: 'RE2', label: 'RE2 — Réalisation 2' },
  { value: 'RH',  label: 'RH — Ressources Humaines' },
]

type Line = {
  id?: string
  documentCode: string | null
  documentId: string | null
  title: string | null
  dmsTitle?: string | null
  changeNeeded: boolean | null
  changeDescription: string | null
  riskReviewNeeded: boolean | null
  riskReviewDescription: string | null
  comments: string | null
  sortOrder: number
}

type Review = {
  id: string
  reference: string
  reviewDate: string
  processCode: string | null
  scope: string | null
  documentsCount: number | null
  findings: string | null
  decisions: string | null
  nextReviewDate: string | null
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
  documentCode: '',
  documentId: null,
  title: '',
  changeNeeded: null,
  changeDescription: '',
  riskReviewNeeded: null,
  riskReviewDescription: '',
  comments: '',
  sortOrder,
})

/** Sélecteur Oui / Non / non renseigné — la colonne « Oui/ Non » du formulaire. */
function YesNo({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null
  onChange: (v: boolean | null) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value === null ? '' : value ? 'oui' : 'non'}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'oui')}
      disabled={disabled}
      className={cellClass}
      style={inputStyle}
    >
      <option value="">—</option>
      <option value="oui">Oui</option>
      <option value="non">Non</option>
    </select>
  )
}

export default function EditReviewClient({
  review,
  trail,
}: {
  review: Review
  trail: TrailEntry[]
}) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>(review.lines)
  const [changeReason, setChangeReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Une revue terminée ne se modifie pas comme un brouillon : le motif devient
   * obligatoire et l'enregistrement passera en révision suivante. Le serveur
   * applique la même règle — celle d'ici n'est qu'un raccourci d'affichage.
   */
  const isLocked = review.status === 'completed'

  function patchLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await saveDocumentReview(review.id, {
      reviewDate:     fd.get('reviewDate') as string,
      processCode:    (fd.get('processCode') as string) || null,
      scope:          (fd.get('scope') as string) || null,
      documentsCount: fd.get('documentsCount') ? Number(fd.get('documentsCount')) : null,
      findings:       (fd.get('findings') as string) || null,
      decisions:      (fd.get('decisions') as string) || null,
      nextReviewDate: (fd.get('nextReviewDate') as string) || null,
      status:         fd.get('status') as Review['status'],
      lines: lines.map((l, i) => ({
        id: l.id,
        documentCode: l.documentCode || null,
        documentId: l.documentId,
        title: l.title || null,
        changeNeeded: l.changeNeeded,
        changeDescription: l.changeDescription || null,
        riskReviewNeeded: l.riskReviewNeeded,
        riskReviewDescription: l.riskReviewDescription || null,
        comments: l.comments || null,
        sortOrder: i,
      })),
      changeReason: changeReason.trim() || undefined,
    })

    if (result.success) {
      router.push('/admin/document-reviews')
      router.refresh()
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/document-reviews"
          className="text-[13px] hover:opacity-70 transition-opacity"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          ← Retour
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
            {review.reference}
          </h1>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-01 — Rapport de revue documentaire · Rév. {review.revisionNumber}
            {review.creatorName ? ` · créée par ${review.creatorName}` : ''}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
        >
          {DOC_REVIEW_STATUS_LABELS[review.status]}
        </span>
      </div>

      {isLocked && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-[13px]"
          style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
        >
          Cette revue est terminée. Toute modification crée la révision{' '}
          <strong>{review.revisionNumber + 1}</strong> et exige un motif, conservé au journal de
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
        {/* En-tête du formulaire officiel */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Date de revue *
              </label>
              <input
                type="date"
                name="reviewDate"
                required
                defaultValue={review.reviewDate}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Processus
              </label>
              <select
                name="processCode"
                defaultValue={review.processCode ?? ''}
                className={inputClass}
                style={inputStyle}
              >
                {PROCESS_CODES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Nb documents revus
              </label>
              <input
                type="number"
                min="0"
                name="documentsCount"
                defaultValue={review.documentsCount ?? ''}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Prochaine revue
              </label>
              <input
                type="date"
                name="nextReviewDate"
                defaultValue={review.nextReviewDate ?? ''}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
                Périmètre
              </label>
              <input
                type="text"
                name="scope"
                defaultValue={review.scope ?? ''}
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
                defaultValue={review.status}
                className={inputClass}
                style={inputStyle}
              >
                {Object.entries(DOC_REVIEW_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* La grille : une ligne par document revu */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--admin-border)' }}
          >
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Documents revus ({lines.length})
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
            <table className="w-full text-sm" style={{ minWidth: 1100 }}>
              <thead>
                <tr style={{ background: 'var(--admin-bg)' }}>
                  {[
                    'Réf. document',
                    'Titre de document',
                    'Création / modif. / élim.',
                    'Description',
                    'Revue risques & opportunités',
                    'Description',
                    'Commentaires',
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 text-[11px] font-medium"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={line.id ?? `new-${i}`} style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2 w-32">
                      <input
                        value={line.documentCode ?? ''}
                        onChange={(e) => patchLine(i, { documentCode: e.target.value })}
                        placeholder="FOR-MI-01"
                        className={`${cellClass} font-mono`}
                        style={inputStyle}
                      />
                    </td>
                    <td className="px-3 py-2 w-56">
                      <input
                        value={line.title ?? ''}
                        onChange={(e) => patchLine(i, { title: e.target.value })}
                        placeholder={line.dmsTitle ?? 'Titre du document'}
                        className={cellClass}
                        style={inputStyle}
                      />
                    </td>
                    <td className="px-3 py-2 w-24">
                      <YesNo value={line.changeNeeded} onChange={(v) => patchLine(i, { changeNeeded: v })} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={line.changeDescription ?? ''}
                        onChange={(e) => patchLine(i, { changeDescription: e.target.value })}
                        className={cellClass}
                        style={inputStyle}
                      />
                    </td>
                    <td className="px-3 py-2 w-24">
                      <YesNo
                        value={line.riskReviewNeeded}
                        onChange={(v) => patchLine(i, { riskReviewNeeded: v })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={line.riskReviewDescription ?? ''}
                        onChange={(e) => patchLine(i, { riskReviewDescription: e.target.value })}
                        className={cellClass}
                        style={inputStyle}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={line.comments ?? ''}
                        onChange={(e) => patchLine(i, { comments: e.target.value })}
                        className={cellClass}
                        style={inputStyle}
                      />
                    </td>
                    <td className="px-3 py-2 w-10">
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
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      Aucun document dans cette revue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Synthèse */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
              Constats
            </label>
            <textarea
              name="findings"
              rows={3}
              defaultValue={review.findings ?? ''}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>
              Décisions
            </label>
            <textarea
              name="decisions"
              rows={3}
              defaultValue={review.decisions ?? ''}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Motif : obligatoire dès que la revue est close */}
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
                ? 'Ex. : constat omis sur PRS-AC-01, ajouté après relecture du pilote.'
                : 'Facultatif tant que la revue n’est pas terminée.'
            }
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/document-reviews"
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
                ? `Enregistrer en révision ${review.revisionNumber + 1}`
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
