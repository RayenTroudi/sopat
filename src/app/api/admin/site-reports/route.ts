import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const type = searchParams.get('type')
  const reports = await prisma.siteReport.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { reportDate: 'desc' },
    include: { project: { select: { name: true } } },
  })
  return ok(reports)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, type, reportDate, reportedBy, weather, workersOnSite, workDone, issues, nextDayPlan } = body
  if (!projectId || !type || !reportDate || !workDone) return err('Missing required fields', 400)
  const report = await prisma.siteReport.create({
    data: {
      projectId, type, reportDate: new Date(reportDate), reportedBy,
      weather, workersOnSite: workersOnSite ? Number(workersOnSite) : undefined,
      workDone, issues, nextDayPlan,
    },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'site_report', entityId: report.id, action: 'created', description: `Rapport ${type} créé pour le ${reportDate}` },
  })
  return ok(report, 201)
}
