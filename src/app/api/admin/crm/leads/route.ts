import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } } },
  })
  return ok(leads)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { contactName, source, email, phone, company, status, notes, estimatedValue, followUpDate } = body
  if (!contactName || !source) return err('contactName and source required', 400)
  const lead = await prisma.lead.create({
    data: {
      contactName, source, email, phone, company,
      status: status ?? 'New',
      notes,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    },
  })
  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      entityType: 'lead',
      entityId: lead.id,
      action: 'created',
      description: `Prospect créé: ${contactName}`,
    },
  })
  return ok(lead, 201)
}
