import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, Card, Empty } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

export const dynamic = 'force-dynamic'
export const metadata = { title: "Appels d'offres – SOPAT Admin" }

export default async function RFQsPage() {
  const rfqs = await prisma.rFQ.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: { select: { name: true } } },
  })

  const statusStyle: Record<string, { color: string; bg: string }> = {
    Draft:    { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
    Sent:     { color: 'var(--admin-blue)',        bg: 'var(--admin-blue-dim)' },
    Received: { color: 'var(--admin-amber)',       bg: 'var(--admin-amber-dim)' },
    Accepted: { color: 'var(--admin-emerald)',     bg: 'var(--admin-emerald-dim)' },
    Rejected: { color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Achats
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Appels d&apos;offres
          </h1>
        </div>
        <Link href="/admin/procurement/suppliers"
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
          Gérer les fournisseurs →
        </Link>
      </div>

      <Card>
        {rfqs.length === 0 ? <Empty message="Aucun appel d'offres" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Titre', 'Fournisseur', 'Envoyé le', 'Délai réponse', 'Montant offert', 'Statut'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 5 ? '1.25rem' : '1rem',
                        textAlign: i >= 3 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rfqs.map(r => {
                  const s = statusStyle[r.status]
                  return (
                    <tr key={r.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{r.title}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{r.supplier.name}</td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {r.sentAt ? new Date(r.sentAt).toLocaleDateString('fr-TN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {r.responseDeadline ? new Date(r.responseDeadline).toLocaleDateString('fr-TN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--admin-text)' }}>
                        {r.quotedAmount ? tnd(r.quotedAmount) : '—'}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: s?.bg ?? 'var(--admin-border)', color: s?.color ?? 'var(--admin-text-muted)' }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
