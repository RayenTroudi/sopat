import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Opportunités – SOPAT Admin' }

export default async function OpportunitiesPage() {
  const leads = await prisma.lead.findMany({
    where: { status: { in: ['Qualified', 'Proposal'] } },
    orderBy: { updatedAt: 'desc' },
    include: { client: { select: { name: true } } },
  })

  const totalValue = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            CRM
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Opportunités
          </h1>
        </div>
        <Link href="/admin/crm/leads"
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
          Voir tous les prospects →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En qualification', value: leads.filter(l => l.status === 'Qualified').length, color: 'var(--admin-accent)' },
          { label: 'En proposition', value: leads.filter(l => l.status === 'Proposal').length, color: '#8b5cf6' },
          { label: 'Valeur pipeline', value: tnd(totalValue), color: 'var(--admin-emerald)' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{kpi.label}</p>
            <p className="text-2xl font-semibold" style={{ color: kpi.color, fontFamily: 'var(--font-playfair)' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h3 className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
            Pipeline actif
          </h3>
        </div>
        {leads.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
            Aucune opportunité active
          </div>
        ) : (
          <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Contact', 'Entreprise', 'Valeur', 'Suivi', 'Statut'].map((h, i) => (
                  <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                    style={{
                      color: 'var(--admin-text-dim)',
                      paddingLeft: i === 0 ? '1.25rem' : '1rem',
                      paddingRight: i === 4 ? '1.25rem' : '1rem',
                      textAlign: i >= 2 ? 'right' : 'left',
                      letterSpacing: '0.08em',
                    }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="py-3.5 pl-5 pr-4">
                    <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{lead.contactName}</p>
                    {lead.email && <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>{lead.email}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{lead.company ?? '—'}</td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums font-medium" style={{ color: 'var(--admin-text)' }}>
                    {lead.estimatedValue ? tnd(lead.estimatedValue) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('fr-TN') : '—'}
                  </td>
                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <Badge status={lead.status} />
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
