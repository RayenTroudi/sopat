import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const visits = await prisma.maintenanceVisit.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { visitDate: 'desc' },
    include: { project: { select: { name: true, client: { select: { name: true } } } } },
  })
  return ok(visits)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, visitDate, visitedBy, type, notes, nextVisitDate } = body
  if (!projectId || !visitDate) return err('projectId and visitDate required', 400)
  const visit = await prisma.maintenanceVisit.create({
    data: {
      projectId, visitDate: new Date(visitDate), visitedBy,
      type: type ?? 'Scheduled',
      notes,
      nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : undefined,
    },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'maintenance_visit', entityId: visit.id, action: 'created', description: `Visite de maintenance planifiée: ${visitDate}` },
  })
  return ok(visit, 201)
}
