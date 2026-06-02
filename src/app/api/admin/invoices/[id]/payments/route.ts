import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, amount, method } = body

    if (!date || amount == null || !method)
      return err('date, amount, and method are required')

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return err('Invoice not found', 404)

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        date: new Date(date),
        amount: Number(amount),
        method,
      },
    })

    // Sum all payments to determine if invoice is fully paid
    const allPayments = await prisma.payment.findMany({ where: { invoiceId: id } })
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0)

    if (totalPaid >= invoice.totalAmount) {
      await prisma.invoice.update({ where: { id }, data: { status: 'Paid' } })
    }

    return ok(payment, 201)
  } catch {
    return err('Failed to add payment', 500)
  }
}
