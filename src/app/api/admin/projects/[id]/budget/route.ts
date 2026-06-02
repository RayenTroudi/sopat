import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await prisma.budgetItem.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
    })
    return ok(items)
  } catch {
    return err('Failed to fetch budget items', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, plannedAmount } = body

    if (!category || plannedAmount == null)
      return err('category and plannedAmount are required')

    const item = await prisma.budgetItem.create({
      data: { projectId: id, category, plannedAmount: Number(plannedAmount) },
    })
    return ok(item, 201)
  } catch {
    return err('Failed to create budget item', 500)
  }
}
