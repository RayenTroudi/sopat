import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  try {
    const { id } = await params
    const body = await req.json()
    const { contactName, source, email, phone, company, status, notes, estimatedValue, followUpDate } = body
    if (!contactName || !source) return err('contactName and source required', 400)
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        contactName, source, email, phone, company, status, notes,
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
      include: { client: { select: { name: true } } },
    })
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        entityType: 'lead',
        entityId: lead.id,
        action: 'updated',
        description: `Prospect mis à jour: ${contactName}`,
      },
    })
    return ok(lead)
  } catch {
    return err('Failed to update prospect', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  try {
    const { id } = await params
    await prisma.activityLog.deleteMany({ where: { leadId: id } })
    await prisma.lead.delete({ where: { id } })
    return ok({ deleted: true })
  } catch {
    return err('Failed to delete prospect', 500)
  }
}
