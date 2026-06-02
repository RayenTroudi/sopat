import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET() {
  try {
    const now = new Date()

    const projects = await prisma.project.findMany({
      include: {
        budgetItems: true,
        costItems: true,
        timeEntries: true,
        invoices: true,
        overheadAllocs: true,
      },
    })

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'Issued',
        dueDate: { lt: now },
      },
      include: { project: { select: { id: true, name: true } } },
    })

    const alerts: {
      type: 'warning' | 'critical'
      category: 'budget' | 'invoice' | 'profitability'
      projectId?: string
      projectName?: string
      invoiceId?: string
      message: string
    }[] = []

    for (const p of projects) {
      const totalBudget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
      const totalDirectCosts =
        p.costItems.reduce((s, c) => s + c.amount, 0) +
        p.timeEntries.reduce((s, t) => s + t.amount, 0)
      const overheadAllocated = p.overheadAllocs.reduce((s, o) => s + o.amount, 0)
      const totalRevenue = p.invoices
        .filter((i) => i.status === 'Paid')
        .reduce((s, i) => s + i.amount, 0)
      const netProfit = totalRevenue - totalDirectCosts - overheadAllocated

      if (totalBudget > 0) {
        const pct = totalDirectCosts / totalBudget
        if (pct > 1) {
          alerts.push({
            type: 'critical',
            category: 'budget',
            projectId: p.id,
            projectName: p.name,
            message: `Costs exceed budget by ${((pct - 1) * 100).toFixed(1)}% (${totalDirectCosts.toFixed(2)} / ${totalBudget.toFixed(2)})`,
          })
        } else if (pct > 0.8) {
          alerts.push({
            type: 'warning',
            category: 'budget',
            projectId: p.id,
            projectName: p.name,
            message: `Costs at ${(pct * 100).toFixed(1)}% of budget (${totalDirectCosts.toFixed(2)} / ${totalBudget.toFixed(2)})`,
          })
        }
      }

      if (netProfit < 0) {
        alerts.push({
          type: 'critical',
          category: 'profitability',
          projectId: p.id,
          projectName: p.name,
          message: `Negative net profit: ${netProfit.toFixed(2)}`,
        })
      }
    }

    for (const inv of overdueInvoices) {
      alerts.push({
        type: 'warning',
        category: 'invoice',
        projectId: inv.project.id,
        projectName: inv.project.name,
        invoiceId: inv.id,
        message: `Invoice overdue since ${inv.dueDate!.toISOString().split('T')[0]} (amount: ${inv.totalAmount.toFixed(2)})`,
      })
    }

    return ok(alerts)
  } catch {
    return err('Failed to fetch alerts', 500)
  }
}
