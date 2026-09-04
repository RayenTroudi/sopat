import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getOfferById, OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'
import {
  canApproveBordereau,
  canEditBordereau,
  getBordereauTemplateSummary,
  getOfferBordereau,
} from '@/lib/db/bordereau'
import Link from 'next/link'
import OfferStatusPanel from './OfferStatusPanel'
import BordereauPanel from './BordereauPanel'
import OfferHeaderPanel from './OfferHeaderPanel'
import { listClients } from '@/lib/db/clients'
import { assertEditable } from '@/lib/db/bordereau'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Offre commerciale | SOPAT Admin' }

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const row = await getOfferById(id)
  if (!row) notFound()
  const { offer, clientCompany } = row
  // Le modèle vierge est lu en résumé — sans ses 266 lignes, qui ne servent
  // qu'au clonage et n'ont rien à faire dans le rendu d'une page.
  const [bordereau, template, clientRows, lockReason] = await Promise.all([
    getOfferBordereau(id),
    getBordereauTemplateSummary(),
    listClients(),
    // Le même verrou que le bordereau : l'en-tête porte l'engagement pris.
    assertEditable(id),
  ])

  const clientOptions = clientRows.map((c) => ({
    id: c.id,
    label: c.companyName ?? c.displayName ?? 'Client',
  }))

  // `amount` est la somme HTVA des lignes dès qu'il y en a : il est alors
  // calculé, pas saisi. Le laisser modifiable produirait un chiffre que la
  // prochaine correction de prix écraserait sans le dire.
  const amountIsDerived = (bordereau?.totals.lineCount ?? 0) > 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/commercial/offers" className="text-[13px] hover:opacity-70" style={{ color: 'var(--admin-text-muted)' }}>
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            {offer.reference} — {offer.projectTitle}
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
            {OFFER_STATUS_LABELS[offer.status as OfferStatus]}
          </span>
        </div>
      </div>

      <OfferHeaderPanel
        offerId={id}
        values={{
          clientId: offer.clientId,
          clientName: offer.clientName,
          clientCompany: clientCompany ?? null,
          projectType: offer.projectType,
          description: offer.description,
          amount: offer.amount,
          currency: offer.currency,
          sentDate: offer.sentDate,
          validityDate: offer.validityDate,
          responsible: offer.responsible,
          notes: offer.notes,
        }}
        clients={clientOptions}
        canEdit={canEditBordereau(session.user.role)}
        locked={lockReason !== null}
        lockReason={lockReason}
        amountIsDerived={amountIsDerived}
      />

      {/* Décision commerciale : motif de perte et date, en lecture seule —
          ils sont écrits par le panneau de statut, pas saisis à la main. */}
      {(offer.status === 'perdue' || offer.decisionDate) && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <dl className="space-y-3">
            {offer.status === 'perdue' && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Motif de perte</dt>
                <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-red)' }}>{offer.lostReason || '—'}</dd>
              </div>
            )}
            {offer.decisionDate && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date de décision</dt>
                <dd className="col-span-2" style={{ color: 'var(--admin-text)' }}>
                  {new Date(offer.decisionDate).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {bordereau && (
        <BordereauPanel
          document={bordereau}
          canEdit={canEditBordereau(session.user.role)}
          canApprove={canApproveBordereau(session.user.role)}
          template={template}
        />
      )}

      <OfferStatusPanel offerId={offer.id} status={offer.status as OfferStatus} />
    </div>
  )
}
