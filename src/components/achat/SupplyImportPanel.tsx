'use client'

/**
 * FOR-AC-10 import — the preview-then-confirm flow.
 *
 * The workbook has no stable row identifiers, so an import can only replace the
 * register as a whole. That makes the preview the safety mechanism rather than
 * a convenience: nothing is written until the user has seen the parsed lines,
 * the supplier matches and the warnings, and has confirmed the replacement if
 * the register already holds data.
 */

import { useRef, useState } from 'react'
import type { SupplyRegisterRow } from '@/lib/db/supply'
import { formatMoney, formatQuantity } from '@/lib/supply-calc'

type Warning = { row: number | null; message: string }

type PreviewLine = {
  row: number
  designation: string
  norme: string | null
  plannedQuantity: number
  plannedUnitPriceHtva: number
  deliveries: { supplierName: string | null; supplierMatched: boolean; quantity: number }[]
  purchases: { supplierName: string | null; supplierMatched: boolean; quantity: number }[]
}

type PreviewResponse = {
  ok: boolean
  errors: Warning[]
  warnings: Warning[]
  lines: PreviewLine[]
  stats: {
    lineCount: number
    deliveryCount: number
    purchaseCount: number
    matchedSuppliers: number
    unmatchedSupplierNames: string[]
  }
  workbookProjectReference: string | null
  workbookProjectName: string | null
  workbookClientName: string | null
  existingItemCount: number
  willReplace: boolean
  projectReference: string
  committed: boolean
  register?: SupplyRegisterRow
  error?: string
}

const card = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' } as const

export function SupplyImportPanel({ projectId, onImported }: {
  projectId: string
  onImported: (register: SupplyRegisterRow) => void
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
      const res = await fetch(`/api/projects/${projectId}/supply/import`, { method: 'POST', body })
      const data = (await res.json()) as PreviewResponse
      setPreview(data)
      if (!res.ok) setError(data.error ?? 'Import refusé.')
      else if (data.committed && data.register) {
        onImported(data.register)
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
        className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        Importer un FOR-AC-10
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
            Importer un classeur FOR-AC-10
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Le fichier remplace l&apos;intégralité du registre : il ne peut pas être fusionné,
            faute d&apos;identifiant stable sur ses lignes. Rien n&apos;est écrit avant votre confirmation.
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); reset() }}
          className="text-[12px] font-medium"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Fermer
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Classeur FOR-AC-10"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(null) }}
          className="text-[13px]"
          style={{ color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => void send('preview')}
          disabled={!file || busy}
          className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          {busy ? 'Analyse…' : 'Analyser'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[13px]"
          style={{ borderColor: 'var(--admin-amber)', color: 'var(--admin-amber)' }}>
          {error}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          {/* What the workbook says about itself — for the user to eyeball, never
              used to pick the target project: the two reference schemes differ. */}
          <div className="rounded-lg px-3 py-2 text-[12px] space-y-0.5"
            style={{ background: 'var(--admin-bg)' }}>
            <p style={{ color: 'var(--admin-text-muted)' }}>
              En-tête du fichier : <span style={{ color: 'var(--admin-text)' }}>
                {preview.workbookProjectName ?? '—'}
              </span>
              {preview.workbookClientName ? ` · ${preview.workbookClientName}` : ''}
              {preview.workbookProjectReference ? ` · réf. ${preview.workbookProjectReference}` : ''}
            </p>
            <p style={{ color: 'var(--admin-text-muted)' }}>
              Projet de destination : <span style={{ color: 'var(--admin-text)' }}>{preview.projectReference}</span>
              {' '}— vérifiez qu&apos;il s&apos;agit bien du même chantier.
            </p>
          </div>

          {stats && (
            <div className="flex gap-x-5 gap-y-1 flex-wrap text-[12px]">
              <Stat label="Lignes du devis" value={String(stats.lineCount)} />
              <Stat label="Livraisons" value={String(stats.deliveryCount)} />
              <Stat label="Achats" value={String(stats.purchaseCount)} />
              <Stat label="Fournisseurs reconnus" value={String(stats.matchedSuppliers)} />
              <Stat label="En texte libre" value={String(stats.unmatchedSupplierNames.length)}
                tone={stats.unmatchedSupplierNames.length ? 'warn' : undefined} />
            </div>
          )}

          {preview.errors.length > 0 && (
            <Messages title="Erreurs bloquantes" tone="error" items={preview.errors} />
          )}
          {preview.warnings.length > 0 && (
            <Messages title="Avertissements" tone="warn" items={preview.warnings} />
          )}

          {preview.lines.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={card}>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0" style={{ background: 'var(--admin-bg)' }}>
                    <tr>
                      {['Ligne', 'Désignation', 'Norme', 'Qté', 'P.U.', 'Livraisons', 'Achats'].map((h) => (
                        <th key={h} className="text-left px-3 py-1.5 font-medium"
                          style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((l) => (
                      <tr key={l.row} style={{ borderTop: '1px solid var(--admin-border)' }}>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{l.row}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--admin-text)' }}>{l.designation}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--admin-text-muted)' }}>{l.norme ?? '—'}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--admin-text)' }}>
                          {formatQuantity(l.plannedQuantity)}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--admin-text)' }}>
                          {formatMoney(l.plannedUnitPriceHtva)}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                          {l.deliveries.length}
                          {l.deliveries.some((d) => !d.supplierMatched && d.supplierName) && (
                            <span style={{ color: 'var(--admin-amber)' }}> ·  texte libre</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--admin-text-muted)' }}>{l.purchases.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => void send('commit', preview.willReplace)}
              disabled={busy || blocked}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
              style={{ background: 'var(--admin-text)', color: 'var(--admin-surface)' }}
            >
              {busy
                ? 'Import…'
                : preview.willReplace
                  ? `Remplacer les ${preview.existingItemCount} ligne(s) existantes`
                  : 'Importer dans le registre'}
            </button>
            {blocked && (
              <span className="text-[12px]" style={{ color: 'var(--admin-amber)' }}>
                Corrigez les erreurs bloquantes avant d&apos;importer.
              </span>
            )}
            {!blocked && preview.willReplace && (
              <span className="text-[12px]" style={{ color: 'var(--admin-amber)' }}>
                Les lignes actuelles seront définitivement remplacées.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <span>
      <span style={{ color: 'var(--admin-text-muted)' }}>{label} : </span>
      <span className="font-medium tabular-nums"
        style={{ color: tone === 'warn' ? 'var(--admin-amber)' : 'var(--admin-text)' }}>{value}</span>
    </span>
  )
}

function Messages({ title, tone, items }: {
  title: string
  tone: 'warn' | 'error'
  items: Warning[]
}) {
  const color = tone === 'error' ? 'var(--admin-amber)' : 'var(--admin-text-muted)'
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--admin-border)' }}>
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color }}>
        {title} ({items.length})
      </p>
      <ul className="space-y-0.5">
        {items.map((w, i) => (
          <li key={i} className="text-[12px]" style={{ color: 'var(--admin-text)' }}>
            {w.row !== null && (
              <span className="tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>Ligne {w.row} — </span>
            )}
            {w.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
