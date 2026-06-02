import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getStageName } from '@/lib/stages'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true, type: true } },
        budgetItems: true,
        costItems: true,
        timeEntries: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = projects.map((p) => {
      const totalBudget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
      const totalDirectCosts =
        p.costItems.reduce((s, c) => s + c.amount, 0) +
        p.timeEntries.reduce((s, t) => s + t.amount, 0)
      const totalRevenue = p.invoices
        .filter((i) => i.status === 'Paid')
        .reduce((s, i) => s + i.amount, 0)
      const profitLoss = totalRevenue - totalDirectCosts

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        currency: p.currency,
        startDate: p.startDate,
        endDate: p.endDate,
        client: p.client,
        stage: p.stage,
        stageName: getStageName(p.stage),
        stageUpdatedAt: p.stageUpdatedAt,
        totalBudget,
        totalDirectCosts,
        totalRevenue,
        profitLoss,
      }
    })

    return ok(data)
  } catch {
    return err('Failed to fetch projects', 500)
  }
}

export async function POST(request: NextRequest) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  try {
    const body = await request.json()
    const { clientId, name, status, currency, startDate, endDate, stage } = body

    if (!clientId || !name || !status || !startDate)
      return err('clientId, name, status, and startDate are required')

    const stageNum = typeof stage === 'number' && [1,2,3,4].includes(stage) ? stage : 1

    const project = await prisma.project.create({
      data: {
        clientId,
        name,
        status,
        currency: currency ?? 'TND',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        stage: stageNum,
      },
    })
    return ok(project, 201)
  } catch {
    return err('Failed to create project', 500)
  }
}
