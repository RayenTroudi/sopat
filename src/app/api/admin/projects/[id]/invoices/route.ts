import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoices = await prisma.invoice.findMany({
      where: { projectId: id },
      include: { payments: true },
      orderBy: { date: 'desc' },
    })
    return ok(invoices)
  } catch {
    return err('Failed to fetch invoices', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, amount, currency, vatRate, status, dueDate } = body

    if (!date || amount == null || !status)
      return err('date, amount, and status are required')

    const a = Number(amount)
    const vr = vatRate != null ? Number(vatRate) : 0.19
    const vatAmount = a * vr
    const totalAmount = a + vatAmount

    const invoice = await prisma.invoice.create({
      data: {
        projectId: id,
        date: new Date(date),
        amount: a,
        currency: currency ?? 'TND',
        vatRate: vr,
        vatAmount,
        totalAmount,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })
    return ok(invoice, 201)
  } catch {
    return err('Failed to create invoice', 500)
  }
}
