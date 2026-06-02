import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, Card } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plans Techniques – SOPAT Admin' }

export default async function TechnicalPlansPage() {
  const projects = await prisma.project.findMany({
    where: { stage: 2, status: { in: ['Active', 'On Hold'] } },
    include: {
      client: { select: { name: true } },
      contracts: true,
      budgetItems: true,
      deliverables: { where: { stageNumber: 5 } },
    },
  })

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
          Design
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
          Plans Techniques & Budgétisation
        </h1>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
            Aucun projet en phase de planification technique (Étape 5)
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const totalBudget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
            const contractValue = p.contracts.reduce((s, c) => s + c.totalValue, 0)
            return (
              <div key={p.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{p.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{p.client.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={p.status} />
                    <Link href={`/admin/projects/${p.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                      Détails →
                    </Link>
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Budget</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--admin-emerald)', fontFamily: 'var(--font-playfair)' }}>{tnd(totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Contrat</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-playfair)' }}>{contractValue > 0 ? tnd(contractValue) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Plans techniques</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--admin-blue)', fontFamily: 'var(--font-playfair)' }}>{p.deliverables.length}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
