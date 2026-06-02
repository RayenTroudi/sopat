import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge, Card } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Développement Design – SOPAT Admin' }

export default async function DesignDevelopmentPage() {
  const projects = await prisma.project.findMany({
    where: { stage: 2, status: { in: ['Active', 'On Hold'] } },
    include: {
      client: { select: { name: true } },
      deliverables: { where: { stageNumber: 4 } },
      tasks: { where: { stageNumber: 4 } },
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
          Développement du Design
        </h1>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
            Aucun projet en phase de développement de design (Étape 4)
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
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
              <div className="px-5 py-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                    Livrables ({p.deliverables.length})
                  </p>
                  {p.deliverables.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Aucun livrable</p>
                  ) : (
                    <ul className="space-y-1">
                      {p.deliverables.slice(0, 4).map(d => (
                        <li key={d.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: d.status === 'Approved' ? 'var(--admin-emerald)' : 'var(--admin-border)' }} />
                          <span className="text-xs truncate" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{d.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                    Tâches ({p.tasks.filter(t => t.status !== 'Done').length} en cours)
                  </p>
                  {p.tasks.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>Aucune tâche</p>
                  ) : (
                    <ul className="space-y-1">
                      {p.tasks.filter(t => t.status !== 'Done').slice(0, 4).map(t => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--admin-amber)' }} />
                          <span className="text-xs truncate" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
