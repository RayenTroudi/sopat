import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, KpiCard } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      payments: true,
    },
    orderBy: { date: 'desc' },
  })

  const now = new Date()

  const totalIssued = invoices.filter(i => i.status === 'Issued').reduce((s, i) => s + i.totalAmount, 0)
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.totalAmount, 0)
  const overdueCount = invoices.filter(i => i.status === 'Issued' && i.dueDate && new Date(i.dueDate) < now).length

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <p
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
        >
          SOPAT Finance
        </p>
        <h1
          className="text-3xl font-semibold"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}
        >
          Factures
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="En attente" value={tnd(totalIssued)} accent="blue" />
        <KpiCard label="Encaissé" value={tnd(totalPaid)} accent="green" />
        <KpiCard label="En retard" value={overdueCount} accent="red" />
      </div>

      <div
        className="admin-card-shine rounded-xl overflow-hidden"
        style={{
          background: 'var(--admin-card)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div className="overflow-x-auto admin-scroll">
          <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Projet', 'Client', 'Date', 'Montant HT', 'TVA', 'Total TTC', 'Échéance', 'Statut'].map((h, i) => (
                  <th
                    key={h}
                    className="py-3 text-xs uppercase tracking-widest font-medium"
                    style={{
                      color: 'var(--admin-text-dim)',
                      paddingLeft: i === 0 ? '1.25rem' : '1rem',
                      paddingRight: i === 7 ? '1.25rem' : '1rem',
                      textAlign: i >= 3 && i <= 5 ? 'right' : 'left',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm"
                    style={{ color: 'var(--admin-text-dim)' }}
                  >
                    Aucune facture
                  </td>
                </tr>
              )}
              {invoices.map(inv => {
                const isOverdue = inv.status === 'Issued' && inv.dueDate && new Date(inv.dueDate) < now
                return (
                  <tr
                    key={inv.id}
                    className="admin-tr transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                  >
                    <td className="py-3.5 pl-5 pr-4">
                      <Link
                        href={`/admin/projects/${inv.project.id}`}
                        className="font-medium text-sm transition-colors"
                        style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-sans)' }}
                      >
                        {inv.project.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {inv.project.client.name}
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(inv.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {tnd(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                      {tnd(inv.vatAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {tnd(inv.totalAmount)}
                    </td>
                    <td
                      className="py-3.5 px-4 text-sm"
                      style={{ color: isOverdue ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}
                    >
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="py-3.5 pl-4 pr-5">
                      <Badge status={isOverdue ? 'Overdue' : inv.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
