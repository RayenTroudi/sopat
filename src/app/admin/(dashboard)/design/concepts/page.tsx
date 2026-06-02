import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, Card } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Design Conceptuel – SOPAT Admin' }

export default async function ConceptDesignsPage() {
  const deliverables = await prisma.deliverable.findMany({
    where: { stageNumber: 3, type: { in: ['drawing', 'model', 'report'] } },
    orderBy: { createdAt: 'desc' },
    include: { project: { select: { name: true, client: { select: { name: true } }, status: true } } },
  })

  const projects = await prisma.project.findMany({
    where: { stage: 2, status: { in: ['Active', 'On Hold'] } },
    include: { client: { select: { name: true } } },
  })

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
          Design
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
          Design Conceptuel
        </h1>
      </div>

      {projects.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h3 className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
              Projets en phase de design conceptuel (Étape 3)
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {projects.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-center justify-between admin-tr">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{p.name}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{p.client.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={p.status} />
                  <Link href={`/admin/projects/${p.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                    Voir →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card title="Livrables de conception">
        {deliverables.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
            Aucun livrable de conception. <Link href="/admin/projects/deliverables" className="underline" style={{ color: 'var(--admin-accent)' }}>Ajouter depuis les livrables →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg"
                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{d.title}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{d.project.name} · {d.type}</p>
                </div>
                <Badge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
