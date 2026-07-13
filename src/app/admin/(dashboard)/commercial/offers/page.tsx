import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOffers, OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'
import Link from 'next/link'
import ExportExcelButton from '@/components/ExportExcelButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suivi des offres | SOPAT Admin' }

const statusColors: Record<string, string> = {
  en_preparation: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
  envoyee: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  en_negociation: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
  gagnee: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  perdue: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  annulee: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const status = typeof sp.status === 'string' ? (sp.status as OfferStatus) : undefined
  const rows = await getOffers({ status })

  const open = rows.filter(({ offer }) => ['en_preparation', 'envoyee', 'en_negociation'].includes(offer.status)).length
  const won = rows.filter(({ offer }) => offer.status === 'gagnee').length
  const lost = rows.filter(({ offer }) => offer.status === 'perdue').length
  const decided = won + lost
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Suivi des offres
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-CO-01 — Tableau de suivi des offres commerciales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton register="offers" />
          <Link
            href="/admin/commercial/offers/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouvelle offre
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'En cours', value: open, color: 'var(--admin-amber)' },
          { label: 'Gagnées', value: won, color: 'var(--admin-emerald)' },
          { label: 'Perdues', value: lost, color: 'var(--admin-red)' },
          { label: 'Taux de réussite', value: winRate != null ? `${winRate}%` : '—', color: 'var(--admin-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/commercial/offers"
          className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
          style={!status
            ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
            : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
          }
        >
          Toutes
        </Link>
        {(Object.keys(OFFER_STATUS_LABELS) as OfferStatus[]).map((value) => (
          <Link
            key={value}
            href={`/admin/commercial/offers?status=${value}`}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={status === value
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {OFFER_STATUS_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Client', 'Projet', 'Montant', 'Envoyée le', 'Statut', 'Responsable', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ offer, clientCompany }) => (
                <tr key={offer.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {offer.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {clientCompany ?? offer.clientName ?? '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{offer.projectTitle}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                    {offer.amount != null
                      ? `${Number(offer.amount).toLocaleString('fr-FR')} ${offer.currency}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {offer.sentDate ? new Date(offer.sentDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>
                      {OFFER_STATUS_LABELS[offer.status as OfferStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{offer.responsible ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commercial/offers/${offer.id}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune offre.{' '}
                    <Link href="/admin/commercial/offers/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
