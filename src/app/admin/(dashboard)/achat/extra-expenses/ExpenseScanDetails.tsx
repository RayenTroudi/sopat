'use client'

// Détails d'une dépense scannée via l'app mobile : photo du justificatif +
// comparaison valeurs suggérées par l'OCR vs valeurs validées par l'agent.

import { useState } from 'react'

type OcrSuggested = {
  amount?: string
  expenseDate?: string
  description?: string
} | null

export default function ExpenseScanDetails({
  reference,
  imageUrl,
  ocrRawText,
  ocrSuggested,
  validated,
}: {
  reference: string
  imageUrl: string | null
  ocrRawText: string | null
  ocrSuggested: OcrSuggested
  validated: { amount: string; expenseDate: string; description: string }
}) {
  const [open, setOpen] = useState(false)

  if (!imageUrl && !ocrRawText) return <span style={{ color: 'var(--admin-text-muted)' }}>—</span>

  const comparisons: { label: string; suggested?: string; kept: string }[] = [
    { label: 'Montant', suggested: ocrSuggested?.amount, kept: validated.amount },
    { label: 'Date', suggested: ocrSuggested?.expenseDate, kept: validated.expenseDate },
    { label: 'Description', suggested: ocrSuggested?.description, kept: validated.description },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-1.5 rounded-lg border p-0.5 pr-2 transition-colors hover:bg-[var(--admin-bg)]"
        style={{ borderColor: 'var(--admin-border)' }}
        title="Voir le scan et les données extraites"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Justificatif ${reference}`}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded text-sm" style={{ background: 'var(--admin-accent-dim)' }}>
            📄
          </span>
        )}
        <span className="text-[11px] font-medium" style={{ color: 'var(--admin-accent)' }}>
          Scan
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Scan de la dépense ${reference}`}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border p-5"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                Dépense {reference} — scan mobile
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm transition-colors hover:bg-[var(--admin-bg)]"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                ✕ Fermer
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                  Photo du justificatif
                </p>
                {imageUrl ? (
                  <a href={imageUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`Justificatif ${reference}`}
                      className="w-full rounded-lg border object-contain"
                      style={{ borderColor: 'var(--admin-border)', maxHeight: '60vh' }}
                    />
                  </a>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune photo jointe.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                    Données extraites (OCR) vs validées
                  </p>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ color: 'var(--admin-text-muted)' }}>
                        <th className="pb-1 text-left font-medium">Champ</th>
                        <th className="pb-1 text-left font-medium">Suggéré (IA)</th>
                        <th className="pb-1 text-left font-medium">Validé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map(({ label, suggested, kept }) => {
                        const changed = suggested !== undefined && suggested !== kept
                        return (
                          <tr key={label} style={{ borderTop: '1px solid var(--admin-border)' }}>
                            <td className="py-1.5 pr-2 font-medium" style={{ color: 'var(--admin-text)' }}>{label}</td>
                            <td className="py-1.5 pr-2" style={{ color: 'var(--admin-text-muted)' }}>
                              {suggested ?? '—'}
                            </td>
                            <td
                              className="py-1.5"
                              style={{ color: changed ? 'var(--admin-amber)' : 'var(--admin-text)' }}
                              title={changed ? 'Modifié par l’agent après suggestion OCR' : undefined}
                            >
                              {kept}{changed ? ' *' : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                    * valeur corrigée par l’agent par rapport à la suggestion OCR
                  </p>
                </div>

                {ocrRawText && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      Texte OCR brut
                    </p>
                    <pre
                      className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-[12px]"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                    >
                      {ocrRawText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
