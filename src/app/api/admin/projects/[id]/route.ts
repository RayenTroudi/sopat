import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        contracts: true,
        budgetItems: true,
        costItems: true,
        timeEntries: true,
        invoices: { include: { payments: true } },
        overheadAllocs: true,
      },
    })
    if (!project) return err('Project not found', 404)
    return ok(project)
  } catch {
    return err('Failed to fetch project', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, status, currency, startDate, endDate, clientId } = body

    if (!name || !status || !startDate)
      return err('name, status, and startDate are required')

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        status,
        currency: currency ?? 'TND',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        ...(clientId ? { clientId } : {}),
      },
    })
    return ok(project)
  } catch {
    return err('Failed to update project', 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.project.delete({ where: { id } })
    return ok({ id })
  } catch {
    return err('Failed to delete project', 500)
  }
}
