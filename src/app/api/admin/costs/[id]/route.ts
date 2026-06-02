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
    const { date, description, amount, currency, category, glAccount } = body

    if (!date || !description || amount == null || !category)
      return err('date, description, amount, and category are required')

    const item = await prisma.costItem.update({
      where: { id },
      data: {
        date: new Date(date),
        description,
        amount: Number(amount),
        currency: currency ?? 'TND',
        category,
        glAccount: glAccount ?? null,
      },
    })
    return ok(item)
  } catch {
    return err('Failed to update cost item', 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.costItem.delete({ where: { id } })
    return ok({ id })
  } catch {
    return err('Failed to delete cost item', 500)
  }
}
