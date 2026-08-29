'use client'

/**
 * FOR-CO-02 « Bordereau des prix » — the document, as the ERP holds it.
 *
 * Sections, categories and priced lines, with every subtotal, the general
 * total, the VAT, the TTC and the « RECAPITULATIF GENERAL » computed by
 * `bordereau-calc` from the tree. Nothing shown here is a stored duplicate of
 * a figure printed above it, so the recap can never disagree with the body.
 *
 * An approved document is read-only: it is the commercial commitment a client
 * was given, and reopening it is a deliberate, audited act.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addOfferLineItem, deleteOfferLineItem } from '@/lib/actions/commercial'
import { BordereauImportPanel } from '@/components/commercial/BordereauImportPanel'
import { formatMoney, formatQuantity, formatVatRate } from '@/lib/bordereau-calc'
import type { BordereauLineRow, BordereauRow } from '@/lib/db/bordereau'

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
} as const

const cellMuted = { color: 'var(--admin-text-muted)' } as const
const cellText = { color: 'var(--admin-text)' } as const

/** Depth-first list of the nodes a new line may be attached to. */
function parentOptions(sections: BordereauLineRow[]) {
  const out: { id: string; label: string }[] = []
  const walk = (node: BordereauLineRow, depth: number) => {
    if (node.lineType === 'section' || node.lineType === 'category') {
      const code = node.displayCode ?? node.sourceCode
      out.push({
        id: node.id,
        label: `${'— '.repeat(depth)}${code ? `${code} ` : ''}${node.designation}`,
      })
      node.children.forEach((c) => walk(c, depth + 1))
    }
  }
  sections.forEach((s) => walk(s, 0))
  return out
}

export default function BordereauPanel({
  document,
  canEdit,
  canApprove,
}: {
  document: BordereauRow
  canEdit: boolean
  canApprove: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { offer, sections, totals, milestones, milestoneSummary, versions, locked } = document
  const editable = canEdit && !locked
  const parents = parentOptions(sections)
  // A legacy flat bordereau has one synthetic root that owns no real id.
  const attachable = parents.filter((p) => p.id !== '__legacy__')

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const res = await addOfferLineItem({
      offerId: offer.id,
      parentId: (fd.get('parentId') as string) || null,
      designation: fd.get('designation') as string,
      unit: (fd.get('unit') as string) || 'U',
      quantity: fd.get('quantity') as string,
      unitPrice: fd.get('unitPrice') as string,
    })
    if (res.success) { form.reset(); router.refresh() } else setError(res.error ?? 'Erreur')
    setLoading(false)
  }

  async function handleDelete(lineId: string) {
    setLoading(true)
    const res = await deleteOfferLineItem(lineId, offer.id)
    if (!res.success) setError(res.error ?? 'Erreur')
    router.refresh()
    setLoading(false)
  }

  async function versionAction(body: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/commercial/offers/${offer.id}/bordereau/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError((data as { error?: string }).error ?? 'Action refusée')
    else router.refresh()
    setLoading(false)
  }

  async function useTemplate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/commercial/offers/${offer.id}/bordereau/from-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmReplace: totals.lineCount > 0 }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError((data as { error?: string }).error ?? 'Action refusée')
    else router.refresh()
    setLoading(false)
  }

  const renderRows = (node: BordereauLineRow, depth: number): React.ReactNode[] => {
    const code = node.sourceCode ?? ''
    const isHeader = node.lineType === 'section' || node.lineType === 'category'
    const rows: React.ReactNode[] = []

    rows.push(
      <tr
        key={node.id}
        style={{
          borderTop: '1px solid var(--admin-border)',
          background: node.lineType === 'section'
            ? 'var(--admin-accent-dim)'
            : node.lineType === 'category' ? 'var(--admin-bg)' : undefined,
        }}
      >
        <td className="px-3 py-2 text-xs tabular-nums align-top" style={cellMuted}>
          {node.displayCode && node.displayCode !== code ? (
            <span title={`Numérotation du corps du document : ${code}`}>
              {node.displayCode}
              <span className="opacity-50"> ({code})</span>
            </span>
          ) : code}
        </td>
        <td
          className="px-3 py-2 text-[13px] align-top"
          style={{ ...cellText, paddingLeft: `${12 + depth * 16}px`, fontWeight: isHeader ? 600 : 400 }}
        >
          {node.designation}
          {node.description && (
            <p className="mt-1 text-[11px] whitespace-pre-wrap" style={cellMuted}>
              {node.description}
            </p>
          )}
        </td>
        <td className="px-3 py-2 text-xs align-top" style={cellMuted}>{node.norme ?? ''}</td>
        <td className="px-3 py-2 text-xs align-top" style={cellMuted}>{node.unit ?? ''}</td>
        <td className="px-3 py-2 text-[13px] tabular-nums align-top" style={cellText}>
          {node.quantity !== null ? formatQuantity(node.quantity) : ''}
        </td>
        <td className="px-3 py-2 text-[13px] tabular-nums align-top" style={cellText}>
          {node.unitPrice !== null ? formatMoney(node.unitPrice) : ''}
        </td>
        <td className="px-3 py-2 text-[13px] tabular-nums font-medium align-top" style={cellText}>
          {isHeader ? formatMoney(node.subtotal) : node.total !== null ? formatMoney(node.total) : '—'}
        </td>
        <td className="px-3 py-2 align-top">
          {editable && node.id !== '__legacy__' && (
            <button
              onClick={() => handleDelete(node.id)}
              disabled={loading}
              className="text-xs disabled:opacity-30"
              style={{ color: 'var(--admin-red)' }}
              aria-label={`Supprimer ${node.designation}`}
            >
              ✕
            </button>
          )}
        </td>
      </tr>,
    )

    node.children.forEach((child) => rows.push(...renderRows(child, depth + 1)))

    if (node.lineType === 'category') {
      rows.push(
        <tr key={`${node.id}-subtotal`} style={{ background: 'var(--admin-bg)' }}>
          <td />
          <td className="px-3 py-1.5 text-[12px] font-medium" colSpan={5} style={cellMuted}>
            TOTAL PARTIEL HTVA
          </td>
          <td className="px-3 py-1.5 text-[13px] tabular-nums font-semibold" style={cellText}>
            {formatMoney(node.subtotal)}
          </td>
          <td />
        </tr>,
      )
    }
    return rows
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={cellText}>
              Bordereau des prix ({offer.documentCode}
              {offer.formRevision !== null ? ` — rév. ${offer.formRevision}` : ''})
            </h2>
            <p className="text-[11px] mt-0.5" style={cellMuted}>
              {totals.sectionCount} section(s) · {totals.categoryCount} catégorie(s) ·{' '}
              {totals.lineCount} ligne(s), dont {totals.pricedCount} chiffrée(s)
              {locked && ' · document approuvé et verrouillé'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold" style={cellText}>
              {formatMoney(totals.totalTtc)} {offer.currency} TTC
            </p>
            <p className="text-[11px]" style={cellMuted}>
              {formatMoney(totals.totalHtva)} HTVA + {formatMoney(totals.totalVat)} TVA{' '}
              ({formatVatRate(offer.vatRate)})
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['N°', 'Désignation des prestations', 'Norme', 'Unité', 'Qté', 'P.U.', 'Montant', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] font-medium" style={cellMuted}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.flatMap((s) => renderRows(s, 0))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm" style={cellMuted}>
                    Aucune ligne — importez un FOR-CO-02, partez du modèle vierge, ou ajoutez les postes ci-dessous.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <form onSubmit={handleAdd} className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_70px_80px_100px_auto] gap-2" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <select name="parentId" className={inputClass} style={inputStyle} defaultValue="">
              <option value="">Racine du document</option>
              {attachable.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <input name="designation" required placeholder="Désignation" className={inputClass} style={inputStyle} />
            <input name="unit" placeholder="Unité" defaultValue="U" className={inputClass} style={inputStyle} />
            <input name="quantity" type="number" step="0.01" min="0" required placeholder="Qté" className={inputClass} style={inputStyle} />
            <input name="unitPrice" type="number" step="0.001" min="0" required placeholder="P.U." className={inputClass} style={inputStyle} />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}
            >
              Ajouter
            </button>
          </form>
        )}
      </div>

      {/* ── RECAPITULATIF GENERAL — generated, never a stored duplicate ── */}
      {totals.sections.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h3 className="text-[13px] font-semibold" style={cellText}>Récapitulatif général</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {totals.sections.map((s) => (
                <tr key={s.sourceCode ?? s.designation} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2 text-xs" style={cellMuted}>{s.sourceCode ?? ''}</td>
                  <td className="px-4 py-2 text-[13px]" style={cellText}>{s.designation}</td>
                  <td className="px-4 py-2 text-[13px] tabular-nums text-right font-medium" style={cellText}>
                    {formatMoney(s.subtotal)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <td />
                <td className="px-4 py-2 text-[13px] font-semibold" style={cellText}>Total général HTVA</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right font-semibold" style={cellText}>
                  {formatMoney(totals.totalHtva)}
                </td>
              </tr>
              <tr style={{ background: 'var(--admin-bg)' }}>
                <td />
                <td className="px-4 py-2 text-[13px]" style={cellMuted}>TVA ({formatVatRate(offer.vatRate)})</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right" style={cellText}>
                  {formatMoney(totals.totalVat)}
                </td>
              </tr>
              <tr style={{ background: 'var(--admin-accent-dim)' }}>
                <td />
                <td className="px-4 py-2 text-[13px] font-bold" style={cellText}>Total général T.T.C</td>
                <td className="px-4 py-2 text-[13px] tabular-nums text-right font-bold" style={cellText}>
                  {formatMoney(totals.totalTtc)} {offer.currency}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Payment milestones — planning data only ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h3 className="text-[13px] font-semibold" style={cellText}>Modalités de paiement</h3>
          <span className="text-[11px]" style={milestoneSummary.complete ? cellMuted : { color: 'var(--admin-red)' }}>
            {milestoneSummary.totalPercentage} %
            {!milestoneSummary.complete && ' — le plan ne totalise pas 100 %'}
          </span>
        </div>
        {milestones.length === 0 ? (
          <p className="px-5 py-4 text-[13px]" style={cellMuted}>
            Aucune échéance enregistrée. Ce sont des données de planification : aucune facture ni
            écriture de solde client n&apos;en découle automatiquement.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2 text-[13px] tabular-nums w-20" style={cellText}>{m.percentage} %</td>
                  <td className="px-4 py-2 text-[13px]" style={cellText}>{m.label}</td>
                  <td className="px-4 py-2 text-xs" style={cellMuted}>{m.basis.toUpperCase()}</td>
                  <td className="px-4 py-2 text-[13px] tabular-nums text-right font-medium" style={cellText}>
                    {formatMoney(m.amount)} {offer.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Document control ── */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/commercial/offers/${offer.id}/bordereau/export`}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Exporter en FOR-CO-02
          </a>
          {canEdit && (
            <>
              <BordereauImportPanel offerId={offer.id} disabled={locked} onImported={() => router.refresh()} />
              <button
                onClick={useTemplate}
                disabled={loading || locked}
                className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-40"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                Partir du modèle vierge
              </button>
              <button
                onClick={() => {
                  const changeSummary = window.prompt('Motif de la nouvelle version ?')
                  if (changeSummary) versionAction({ action: 'create', changeSummary })
                }}
                disabled={loading || locked}
                className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-40"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                Figer une version
              </button>
            </>
          )}
          {canApprove && locked && (
            <button
              onClick={() => {
                const reason = window.prompt('Motif de réouverture ?')
                if (reason) versionAction({ action: 'reopen', reason })
              }}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border text-[13px] font-medium disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
            >
              Rouvrir pour révision
            </button>
          )}
        </div>

        {versions.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Version', 'Statut', 'Total TTC', 'Motif', 'Créée par', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] font-medium" style={cellMuted}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-3 py-2 text-[13px] tabular-nums" style={cellText}>
                    v{v.versionNo}{v.label ? ` — ${v.label}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs" style={cellMuted}>
                    {v.status === 'approved' ? 'Approuvée' : v.status === 'superseded' ? 'Remplacée' : 'Brouillon'}
                    {v.approvedByName ? ` · ${v.approvedByName}` : ''}
                  </td>
                  <td className="px-3 py-2 text-[13px] tabular-nums" style={cellText}>{formatMoney(v.totalTtc)}</td>
                  <td className="px-3 py-2 text-xs" style={cellMuted}>{v.changeSummary}</td>
                  <td className="px-3 py-2 text-xs" style={cellMuted}>
                    {v.createdByName ?? '—'} · {new Date(v.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 py-2">
                    {canApprove && v.status === 'draft' && !locked && (
                      <button
                        onClick={() => versionAction({ action: 'approve', versionId: v.id })}
                        disabled={loading}
                        className="text-xs font-medium disabled:opacity-40"
                        style={{ color: 'var(--green)' }}
                      >
                        Approuver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
