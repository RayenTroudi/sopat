import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, plannedAmount } = body

    if (!category || plannedAmount == null)
      return err('category and plannedAmount are required')

    const item = await prisma.budgetItem.update({
      where: { id },
      data: { category, plannedAmount: Number(plannedAmount) },
    })
    return ok(item)
  } catch {
    return err('Failed to update budget item', 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.budgetItem.delete({ where: { id } })
    return ok({ id })
  } catch {
    return err('Failed to delete budget item', 500)
  }
}
