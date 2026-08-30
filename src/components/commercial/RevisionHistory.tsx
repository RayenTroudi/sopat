'use client'

/**
 * Historique de révision d'un bordereau FOR-CO-02.
 *
 * Chaque version figée est un enregistrement : le montant engagé, qui l'a
 * produit, quand, et pourquoi. Quand une version approuvée est rouverte, le
 * motif de la réouverture s'inscrit sur elle — c'est l'information documentée
 * qu'ISO 9001:2015 §8.2.3.2 demande de conserver sur les modifications
 * d'exigences.
 *
 * La chronologie descend de la version en cours vers les plus anciennes.
 * L'entrée courante est mise en avant ; les versions remplacées s'estompent
 * sans jamais disparaître — rien n'est supprimé, la base le refuse.
 */

import { CheckCircle2, Circle, RotateCcw } from 'lucide-react'
import { formatMoney } from '@/lib/bordereau-calc'
import type { BordereauVersionRow } from '@/lib/db/bordereau'

/** « Rev 00 », « Rev 07 » — le format imprimé sur le formulaire. */
export function revisionLabel(versionNo: number): string {
  return `Rev ${String(versionNo).padStart(2, '0')}`
}

const STATUS_LABEL: Record<BordereauVersionRow['status'], string> = {
  approved:   'Approuvée',
  superseded: 'Remplacée',
  draft:      'Brouillon',
}

function formatStamp(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function RevisionHistory({
  versions,
  currency,
  canApprove,
  busy,
  onApprove,
}: {
  versions: BordereauVersionRow[]
  currency: string
  canApprove: boolean
  busy: boolean
  onApprove: (versionId: string) => void
}) {
  if (versions.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
        Aucune version figée. Le bordereau est encore un brouillon libre.
      </p>
    )
  }

  // La version en cours est l'approuvée s'il y en a une, sinon la plus récente.
  // `versions` arrive déjà triée du plus grand numéro au plus petit.
  const current = versions.find((v) => v.status === 'approved') ?? versions[0]

  return (
    <ol className="space-y-0">
      {versions.map((v, i) => {
        const isCurrent = v.id === current.id
        const isLast = i === versions.length - 1
        const accent = isCurrent
          ? (v.status === 'approved' ? 'var(--green)' : 'var(--admin-amber)')
          : 'var(--admin-border)'

        return (
          <li key={v.id} className="relative flex gap-3">
            {/* Rail : pastille + trait de liaison */}
            <div className="flex flex-col items-center shrink-0" aria-hidden>
              <span
                className="mt-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                style={{ background: isCurrent ? accent : 'var(--admin-bg)', border: `1px solid ${accent}` }}
              >
                {v.status === 'approved'
                  ? <CheckCircle2 className="h-3 w-3" style={{ color: isCurrent ? 'var(--ivory)' : accent }} />
                  : <Circle className="h-2 w-2" style={{ color: isCurrent ? 'var(--ivory)' : 'var(--admin-text-muted)' }} />}
              </span>
              {!isLast && <span className="w-px flex-1 my-1" style={{ background: 'var(--admin-border)' }} />}
            </div>

            <div className={`min-w-0 flex-1 pb-5 ${isCurrent ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: isCurrent ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
                >
                  {revisionLabel(v.versionNo)}
                </span>
                {v.label && (
                  <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>— {v.label}</span>
                )}
                {isCurrent ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: 'var(--admin-accent-dim)', color: 'var(--green)' }}
                  >
                    Version en cours
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                    {STATUS_LABEL[v.status]}
                  </span>
                )}
                <span className="ml-auto text-[13px] font-medium tabular-nums" style={{ color: 'var(--admin-text)' }}>
                  {formatMoney(v.totalTtc)} {currency}
                </span>
              </div>

              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {formatStamp(v.createdAt)} · {v.createdByName ?? 'Utilisateur inconnu'}
                {v.approvedByName ? ` · approuvée par ${v.approvedByName}` : ''}
              </p>

              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>Motif : </span>
                {v.changeSummary}
              </p>

              {/* Le motif de réouverture : pourquoi cet engagement a été repris. */}
              {v.reopenReason && (
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                  style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-amber)' }}>
                    <RotateCcw className="h-3 w-3 shrink-0" aria-hidden />
                    Rouverte pour révision
                    {v.reopenedAt ? ` le ${formatStamp(v.reopenedAt)}` : ''}
                    {v.reopenedByName ? ` par ${v.reopenedByName}` : ''}
                  </p>
                  <p className="mt-1" style={{ color: 'var(--admin-text)' }}>{v.reopenReason}</p>
                </div>
              )}

              {canApprove && v.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => onApprove(v.id)}
                  disabled={busy}
                  className="mt-2 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-opacity disabled:opacity-40"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--green)' }}
                >
                  Approuver cette version
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
