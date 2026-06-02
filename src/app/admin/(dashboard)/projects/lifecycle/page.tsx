import { prisma } from '@/lib/db'
import { STAGES } from '@/lib/stages'
import { tnd } from '@/lib/fmt'
import PipelineKanban from './PipelineKanban'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pipeline – SOPAT Admin' }

export default async function PipelinePage() {
  const projects = await prisma.project.findMany({
    where: { status: { in: ['Active', 'On Hold', 'Pending'] } },
    orderBy: { stageUpdatedAt: 'desc' },
    include: {
      client: { select: { name: true } },
      contracts: { select: { totalValue: true } },
      costItems: { select: { amount: true } },
      timeEntries: { select: { amount: true } },
      invoices: { where: { status: 'Paid' }, select: { amount: true } },
    },
  })

  const columns = [1, 2, 3, 4].map(stageNum => {
    const stageProjects = projects.filter(p => p.stage === stageNum).map(p => {
      const contractValue = p.contracts.reduce((s, c) => s + c.totalValue, 0)
      const costs = p.costItems.reduce((s, c) => s + c.amount, 0) +
        p.timeEntries.reduce((s, t) => s + t.amount, 0)
      const revenue = p.invoices.reduce((s, i) => s + i.amount, 0)
      const margin = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0
      const daysInStage = p.stageUpdatedAt
        ? Math.floor((Date.now() - new Date(p.stageUpdatedAt).getTime()) / 86400000)
        : Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)

      return {
        id: p.id,
        name: p.name,
        clientName: p.client.name,
        contractValue,
        margin,
        daysInStage,
        stage: p.stage,
        stageNotes: p.stageNotes,
      }
    })

    const totalValue = stageProjects.reduce((s, p) => s + p.contractValue, 0)

    return {
      stageNum,
      ...STAGES[stageNum],
      projects: stageProjects,
      totalValue,
    }
  })

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div>
        <p className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
          Projets
        </p>
        <h1 className="text-3xl font-semibold"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
          Pipeline des Projets
        </h1>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {columns.map(col => (
          <div key={col.stageNum} className="rounded-xl p-4"
            style={{ background: 'var(--admin-card)', border: `1px solid var(--admin-border)`, borderTop: `3px solid ${col.color}` }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: col.color, fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
              {col.stageNum}. {col.name}
            </p>
            <p className="text-2xl font-semibold mb-0.5"
              style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
              {col.projects.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              {col.projects.length === 1 ? 'projet' : 'projets'} · {tnd(col.totalValue)}
            </p>
          </div>
        ))}
      </div>

      <PipelineKanban columns={columns} />
    </div>
  )
}
