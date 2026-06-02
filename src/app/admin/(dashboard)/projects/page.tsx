import { prisma } from '@/lib/db'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true } },
        budgetItems: true,
        costItems: true,
        timeEntries: true,
        invoices: true,
        overheadAllocs: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const rows = projects.map(p => {
    const totalBudget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
    const totalCosts = p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0)
    const overhead = p.overheadAllocs.reduce((s, o) => s + o.amount, 0)
    const revenue = p.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)
    const netProfit = revenue - totalCosts - overhead
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      currency: p.currency,
      stage: p.stage,
      totalBudget,
      totalCosts,
      revenue,
      netProfit,
      margin,
    }
  })

  return <ProjectsClient rows={rows} clients={clients} />
}
