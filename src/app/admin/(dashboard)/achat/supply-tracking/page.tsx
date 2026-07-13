import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getProjectsForSelect,
  getProjectSupplyTracking,
  NOTE_TYPE_LABELS,
} from '@/lib/db/achat'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suivi approvisionnement chantier | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function SupplyTrackingPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const projects = await getProjectsForSelect()
  const projectId = typeof sp.project === 'string' ? sp.project : undefined
  const data = projectId ? await getProjectSupplyTracking(projectId) : null

  const totalOrdered = data
    ? data.orders.reduce((s, { order }) => s + Number(order.totalCost), 0)
    : 0
  const deliveries = data ? data.notes.filter(({ note }) => note.noteType === 'livraison').length : 0
  const returns = data ? data.notes.filter(({ note }) => note.noteType === 'retour').length : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Suivi approvisionnement chantier
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          FOR-AC-10 — Synthèse des bons de commande et livraisons par projet
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/admin/achat/supply-tracking?project=${p.id}`}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={projectId === p.id
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {p.name}
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</p>
        )}
      </div>

      {!projectId && (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Sélectionnez un projet pour afficher sa synthèse d&apos;approvisionnement.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total commandé (TND)', value: totalOrdered.toLocaleString('fr-FR', { minimumFractionDigits: 3 }), color: 'var(--admin-text)' },
              { label: 'Livraisons', value: String(deliveries), color: 'var(--admin-emerald)' },
              { label: 'Retours', value: String(returns), color: returns > 0 ? 'var(--admin-amber)' : 'var(--admin-text)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Bons de commande</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                    {['Date', 'Article', 'Fournisseur', 'Qté', 'P.U.', 'Total', 'Statut'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map(({ order, supplierName }) => (
                    <tr key={order.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(order.purchaseDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--admin-text)' }}>{order.itemDescription}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{supplierName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--admin-text)' }}>{Number(order.quantityPurchased).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--admin-text)' }}>{Number(order.unitPricePaid).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</td>
                      <td className="px-4 py-2.5 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{Number(order.totalCost).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{order.status}</td>
                    </tr>
                  ))}
                  {data.orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        Aucun bon de commande pour ce projet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Bons de livraison &amp; retour</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                    {['Réf.', 'Type', 'Date', 'Fournisseur / Destinataire', 'Articles', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.notes.map(({ note, supplierName }) => (
                    <tr key={note.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-2.5 font-mono text-[11px]">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                          {note.reference}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{NOTE_TYPE_LABELS[note.noteType]}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(note.noteDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{supplierName ?? note.counterparty ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {(note.items ?? []).length} article{(note.items ?? []).length > 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/achat/delivery-notes/${note.id}`}
                          className="text-[13px] font-medium hover:opacity-70"
                          style={{ color: 'var(--admin-accent)' }}
                        >
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data.notes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        Aucun bon pour ce projet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
