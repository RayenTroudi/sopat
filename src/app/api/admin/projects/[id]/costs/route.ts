import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await prisma.costItem.findMany({
      where: { projectId: id },
      orderBy: { date: 'desc' },
    })
    return ok(items)
  } catch {
    return err('Failed to fetch cost items', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, description, amount, currency, category, glAccount } = body

    if (!date || !description || amount == null || !category)
      return err('date, description, amount, and category are required')

    const item = await prisma.costItem.create({
      data: {
        projectId: id,
        date: new Date(date),
        description,
        amount: Number(amount),
        currency: currency ?? 'TND',
        category,
        glAccount: glAccount ?? null,
      },
    })
    return ok(item, 201)
  } catch {
    return err('Failed to create cost item', 500)
  }
}
