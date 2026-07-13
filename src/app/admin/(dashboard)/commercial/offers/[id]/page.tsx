import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getOfferById, OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'
import Link from 'next/link'
import OfferStatusPanel from './OfferStatusPanel'

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

  const fields: { label: string; value: string | null }[] = [
    { label: 'Client', value: clientCompany ?? offer.clientName },
    { label: 'Type de projet', value: offer.projectType },
    { label: 'Description', value: offer.description },
    {
      label: 'Montant',
      value: offer.amount != null
        ? `${Number(offer.amount).toLocaleString('fr-FR')} ${offer.currency}`
        : null,
    },
    { label: "Date d'envoi", value: offer.sentDate ? new Date(offer.sentDate).toLocaleDateString('fr-FR') : null },
    { label: 'Validité', value: offer.validityDate ? new Date(offer.validityDate).toLocaleDateString('fr-FR') : null },
    { label: 'Responsable', value: offer.responsible },
    { label: 'Notes', value: offer.notes },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
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

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <dl className="space-y-3">
          {fields.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value || '—'}</dd>
            </div>
          ))}
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

      <OfferStatusPanel offerId={offer.id} status={offer.status as OfferStatus} />
    </div>
  )
}
