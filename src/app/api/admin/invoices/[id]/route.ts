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
    const { status, dueDate } = body

    if (!status) return err('status is required')

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    })
    return ok(invoice)
  } catch {
    return err('Failed to update invoice', 500)
  }
}
