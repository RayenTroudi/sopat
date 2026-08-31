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

import { CheckCircle2, Circle, RotateCcw, Send, XCircle } from 'lucide-react'
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
  submitted:  'En revue',
  rejected:   'Refusée',
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
  canSubmit,
  busy,
  onApprove,
  onSubmit,
  onReject,
}: {
  versions: BordereauVersionRow[]
  currency: string
  canApprove: boolean
  /** Soumettre appartient à l'auteur ; approuver et refuser, au relecteur. */
  canSubmit: boolean
  busy: boolean
  onApprove: (versionId: string) => void
  onSubmit: (versionId: string) => void
  onReject: (versionId: string) => void
}) {
  if (versions.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
        Aucune version figée. Le bordereau est encore un brouillon libre.
      </p>
    )
  }

  /*
   * Deux notions distinctes, qu'il ne faut pas confondre :
   *
   * `inForce` — la version qui ENGAGE aujourd'hui : l'approuvée, ou à défaut
   *   celle qui est en revue. Après une réouverture il n'y en a AUCUNE, et
   *   c'est exactement ce qu'il faut afficher : le document est redevenu un
   *   brouillon. La version précédente en gardait le badge « Version en
   *   cours » tout en portant « Rouverte pour révision » — deux affirmations
   *   contradictoires sur un écran de maîtrise documentaire, dont la plus
   *   visible était la fausse.
   *
   * `highlighted` — celle que la chronologie met en avant, faute de mieux la
   *   plus récente. Purement visuel : ne dit rien sur ce qui engage.
   */
  const inForce =
    versions.find((v) => v.status === 'approved') ??
    versions.find((v) => v.status === 'submitted') ??
    null
  const highlighted = inForce ?? versions[0]

  return (
    <ol className="space-y-0">
      {versions.map((v, i) => {
        const isHighlighted = v.id === highlighted?.id
        const isInForce = inForce !== null && v.id === inForce.id
        const isLast = i === versions.length - 1
        const accent = v.status === 'rejected'
          ? 'var(--admin-red)'
          : isInForce
            ? (v.status === 'approved' ? 'var(--green)' : 'var(--admin-amber)')
            : 'var(--admin-border)'

        return (
          <li key={v.id} className="relative flex gap-3">
            {/* Rail : pastille + trait de liaison */}
            <div className="flex flex-col items-center shrink-0" aria-hidden>
              <span
                className="mt-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                style={{ background: isInForce ? accent : 'var(--admin-bg)', border: `1px solid ${accent}` }}
              >
                {v.status === 'approved'
                  ? <CheckCircle2 className="h-3 w-3" style={{ color: isInForce ? 'var(--ivory)' : accent }} />
                  : v.status === 'rejected'
                    ? <XCircle className="h-3 w-3" style={{ color: accent }} />
                    : v.status === 'submitted'
                      ? <Send className="h-2.5 w-2.5" style={{ color: isInForce ? 'var(--ivory)' : accent }} />
                      : <Circle className="h-2 w-2" style={{ color: isInForce ? 'var(--ivory)' : 'var(--admin-text-muted)' }} />}
              </span>
              {!isLast && <span className="w-px flex-1 my-1" style={{ background: 'var(--admin-border)' }} />}
            </div>

            <div className={`min-w-0 flex-1 pb-5 ${isHighlighted ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: isHighlighted ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
                >
                  {revisionLabel(v.versionNo)}
                </span>
                {v.label && (
                  <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>— {v.label}</span>
                )}
                {isInForce ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{
                      background: 'var(--admin-accent-dim)',
                      color: v.status === 'submitted' ? 'var(--admin-amber)' : 'var(--green)',
                    }}
                  >
                    {v.status === 'submitted' ? 'En revue' : 'Version en cours'}
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
                {v.submittedByName ? ` · soumise par ${v.submittedByName}` : ''}
                {v.approvedByName ? ` · approuvée par ${v.approvedByName}` : ''}
              </p>

              {/*
                Auteur et relecteur confondus. Ce n'est pas une faute — dans une
                PME la direction rédige et approuve — mais un auditeur doit le
                lire ici, sans recouper deux colonnes de dates.
              */}
              {v.selfReviewed && (
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--admin-amber)' }}>
                  Soumise et revue par la même personne
                </p>
              )}

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

              {/* Le motif du refus : ce que l'auteur doit corriger. */}
              {v.rejectionReason && (
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                  style={{ background: 'var(--admin-red-dim)', border: '1px solid var(--admin-border)' }}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-red)' }}>
                    <XCircle className="h-3 w-3 shrink-0" aria-hidden />
                    Refusée en revue
                    {v.reviewedAt ? ` le ${formatStamp(v.reviewedAt)}` : ''}
                    {v.reviewedByName ? ` par ${v.reviewedByName}` : ''}
                  </p>
                  <p className="mt-1" style={{ color: 'var(--admin-text)' }}>{v.rejectionReason}</p>
                </div>
              )}

              {/*
                Un brouillon se soumet ; une version soumise s'approuve ou se
                refuse. Les deux actes ne s'offrent jamais ensemble : c'est la
                séparation revue / approbation d'ISO 9001:2015 §7.5.2 b) rendue
                visible dans l'interface, pas seulement imposée en base.
              */}
              {canSubmit && v.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => onSubmit(v.id)}
                  disabled={busy}
                  className="mt-2 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-opacity disabled:opacity-40"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
                >
                  Soumettre à la revue
                </button>
              )}

              {canApprove && v.status === 'submitted' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(v.id)}
                    disabled={busy}
                    className="rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-opacity disabled:opacity-40"
                    style={{ borderColor: 'var(--admin-border)', color: 'var(--green)' }}
                  >
                    Approuver cette version
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(v.id)}
                    disabled={busy}
                    className="rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-opacity disabled:opacity-40"
                    style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
