import { prisma } from '@/lib/db'

export async function calcPnl(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { id: true, name: true } },
      budgetItems: true,
      costItems: true,
      timeEntries: true,
      invoices: true,
      overheadAllocs: true,
    },
  })
  if (!project) return null

  const totalBudget = project.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
  const totalDirectCosts =
    project.costItems.reduce((s, c) => s + c.amount, 0) +
    project.timeEntries.reduce((s, t) => s + t.amount, 0)
  const overheadAllocated = project.overheadAllocs.reduce((s, o) => s + o.amount, 0)
  const totalRevenue = project.invoices
    .filter((i) => i.status === 'Paid')
    .reduce((s, i) => s + i.amount, 0)

  const grossProfit = totalRevenue - totalDirectCosts
  const netProfit = grossProfit - overheadAllocated
  const budgetVariance = totalBudget - totalDirectCosts
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return {
    projectId: project.id,
    projectName: project.name,
    client: project.client,
    status: project.status,
    currency: project.currency,
    totalBudget,
    totalDirectCosts,
    overheadAllocated,
    totalRevenue,
    grossProfit,
    netProfit,
    budgetVariance,
    marginPercent,
  }
}
