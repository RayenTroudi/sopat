import { prisma } from '@/lib/db'
import { Card, Empty } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bons de commande – SOPAT Admin' }

export default async function PurchaseOrdersPage() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { orderDate: 'desc' },
    include: { supplier: { select: { name: true } } },
  })

  const totalValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.amount, 0)

  const statusStyle: Record<string, { color: string; bg: string }> = {
    Draft:    { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
    Approved: { color: 'var(--admin-emerald)',     bg: 'var(--admin-emerald-dim)' },
    Sent:     { color: 'var(--admin-blue)',        bg: 'var(--admin-blue-dim)' },
    Received: { color: 'var(--admin-accent)',      bg: 'var(--admin-accent-dim)' },
    Cancelled:{ color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
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
            Bons de commande
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Total engagé</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-playfair)' }}>{tnd(totalValue)}</p>
        </div>
      </div>

      <Card>
        {orders.length === 0 ? <Empty message="Aucun bon de commande" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['N° Commande', 'Titre', 'Fournisseur', 'Date', 'Livraison', 'Montant', 'Statut'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 6 ? '1.25rem' : '1rem',
                        textAlign: i >= 5 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const s = statusStyle[o.status]
                  return (
                    <tr key={o.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <span className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                          {o.poNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{o.title}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{o.supplier.name}</td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(o.orderDate).toLocaleDateString('fr-TN')}
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString('fr-TN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--admin-text)' }}>
                        {tnd(o.amount)}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: s?.bg, color: s?.color }}>
                          {o.status}
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
