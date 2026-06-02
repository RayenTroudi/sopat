import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, Card, Empty } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Remise – SOPAT Admin' }

export default async function HandoverPage() {
  const projects = await prisma.project.findMany({
    where: { stage: 3, status: { in: ['Active', 'On Hold'] } },
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { name: true } },
      milestones: { where: { status: { not: 'Completed' } } },
      deliverables: true,
    },
  })

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
          Réalisation
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
          Projets en Réalisation
        </h1>
      </div>

      {projects.length === 0 ? (
        <Card>
          <Empty message="Aucun projet en phase de réalisation" />
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/admin/projects/${p.id}`}
                      className="font-semibold text-sm hover:underline"
                      style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
                      {p.name}
                    </Link>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: '#10B98120', color: '#10B981', fontFamily: 'var(--font-sans)' }}>
                      Réalisation
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{p.client.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={p.status} />
                  <Link href={`/admin/projects/${p.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                    Gérer →
                  </Link>
                </div>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Jalons restants</p>
                  <p className="text-xl font-semibold" style={{ color: p.milestones.length > 0 ? 'var(--admin-amber)' : 'var(--admin-emerald)', fontFamily: 'var(--font-playfair)' }}>
                    {p.milestones.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Documents</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--admin-blue)', fontFamily: 'var(--font-playfair)' }}>{p.deliverables.length}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
