'use client'

/**
 * FOR-CO-02 import — the preview-then-confirm flow.
 *
 * The workbook has no stable row identifiers and its « Référence projet » uses
 * a different scheme from the application, so an import can only replace the
 * document as a whole. That makes the preview the safety mechanism rather than
 * a convenience: nothing is written until the user has seen the parsed
 * structure, the recomputed totals and every warning — including how many
 * `#REF!` cells and category banner formulas were found and discarded.
 */

import { useRef, useState } from 'react'
import { formatMoney } from '@/lib/bordereau-calc'

type Warning = { row: number | null; message: string }

type PreviewResponse = {
  ok: boolean
  errors: Warning[]
  warnings: Warning[]
  header: {
    documentCode: string | null
    formRevision: number | null
    offerDate: string | null
    clientName: string | null
    projectTitle: string | null
    projectReferenceText: string | null
    siteLocation: string | null
    maitreDouvrage: string | null
    validityDays: number | null
  }
  milestones: { label: string; percentage: number }[]
  stats: {
    sectionCount: number
    categoryCount: number
    lineCount: number
    specCount: number
    pricedCount: number
    totalHtva: number
    refErrorCount: number
    bannerFormulaCount: number
    matchedSpecies: number
    matchedMaterials: number
    unmatchedNames: string[]
    milestoneCount: number
    milestonePercentageTotal: number
  }
  existingLineCount: number
  willReplace: boolean
  offerReference: string
  alreadyImported: { importedAt: string; importedByName: string | null } | null
  committed: boolean
  error?: string
}

const card = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' } as const

export function BordereauImportPanel({
  offerId,
  disabled,
  onImported,
}: {
  offerId: string
  disabled: boolean
  onImported: () => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function send(mode: 'preview' | 'commit', confirmReplace = false) {
    if (!file) return
    setBusy(true)
    setError(null)
    const body = new FormData()
    body.set('file', file)
    body.set('mode', mode)
    if (confirmReplace) body.set('confirmReplace', 'true')
    try {
      const res = await fetch(`/api/commercial/offers/${offerId}/bordereau/import`, {
        method: 'POST',
        body,
      })
      const data = (await res.json()) as PreviewResponse
      setPreview(data)
      if (!res.ok) setError(data.error ?? 'Import refusé.')
      else if (data.committed) {
        onImported()
        setOpen(false)
        reset()
      }
    } catch {
      setError('Envoi impossible.')
    }
    setBusy(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-40"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        Importer un FOR-CO-02
      </button>
    )
  }

  const stats = preview?.stats
  const blocked = preview ? !preview.ok : false

  return (
    <div className="rounded-xl border p-4 space-y-4 w-full" style={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Importer un classeur FOR-CO-02
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Le fichier remplace l&apos;intégralité du bordereau : il ne peut pas être fusionné,
            faute d&apos;identifiant stable sur ses lignes. Les totaux du classeur ne sont jamais
            repris — ils sont recalculés par l&apos;ERP. Rien n&apos;est écrit avant votre confirmation.
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); reset() }}
          className="text-[12px]"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Fermer
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xltx"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(null) }}
          className="text-[13px]"
          style={{ color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => send('preview')}
          disabled={!file || busy}
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          {busy ? 'Analyse…' : 'Analyser'}
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      {preview && stats && (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
            {([
              ['Sections', String(stats.sectionCount)],
              ['Catégories', String(stats.categoryCount)],
              ['Lignes de prix', String(stats.lineCount)],
              ['Lignes chiffrées', String(stats.pricedCount)],
              ['Total HTVA recalculé', `${formatMoney(stats.totalHtva)}`],
              ['Modalités de paiement', `${stats.milestoneCount} (${stats.milestonePercentageTotal} %)`],
              ['Fiches plantes reliées', String(stats.matchedSpecies)],
              ['Matières décoratives reliées', String(stats.matchedMaterials)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
                <dd className="font-medium tabular-nums" style={{ color: 'var(--admin-text)' }}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="text-[12px] space-y-1" style={{ color: 'var(--admin-text-muted)' }}>
            <p>
              En-tête détecté — document {preview.header.documentCode ?? '—'}
              {preview.header.formRevision !== null ? ` rév. ${preview.header.formRevision}` : ''}
              {preview.header.projectReferenceText ? ` · réf. projet « ${preview.header.projectReferenceText} »` : ''}
              {preview.header.clientName ? ` · client « ${preview.header.clientName} »` : ''}
              {preview.header.validityDays !== null ? ` · validité ${preview.header.validityDays} jours` : ''}
            </p>
            <p>
              {stats.refErrorCount} cellule(s) #REF! et {stats.bannerFormulaCount} formule(s) de
              bandeau ignorées — aucune n&apos;entre en base.
            </p>
          </div>

          {preview.errors.length > 0 && (
            <ul className="text-[12px] space-y-1" style={{ color: 'var(--admin-red)' }}>
              {preview.errors.map((w, i) => (
                <li key={i}>{w.row ? `Ligne ${w.row} — ` : ''}{w.message}</li>
              ))}
            </ul>
          )}

          {preview.warnings.length > 0 && (
            <details className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
              <summary className="cursor-pointer">{preview.warnings.length} avertissement(s)</summary>
              <ul className="mt-2 space-y-1">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w.row ? `Ligne ${w.row} — ` : ''}{w.message}</li>
                ))}
              </ul>
            </details>
          )}

          {preview.alreadyImported && (
            <p className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
              Ce fichier a déjà été importé le{' '}
              {new Date(preview.alreadyImported.importedAt).toLocaleDateString('fr-FR')} par{' '}
              {preview.alreadyImported.importedByName ?? 'un utilisateur'} : le réimporter ne crée aucun doublon.
            </p>
          )}

          {!blocked && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => send('commit', preview.willReplace)}
                disabled={busy || !!preview.alreadyImported}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-40"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                {preview.willReplace
                  ? `Remplacer les ${preview.existingLineCount} ligne(s) existantes`
                  : 'Importer'}
              </button>
              {preview.willReplace && (
                <span className="text-[12px]" style={{ color: 'var(--admin-red)' }}>
                  Le bordereau actuel sera intégralement remplacé.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
