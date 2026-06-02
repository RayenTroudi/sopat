import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const inspections = await prisma.inspection.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { inspectionDate: 'desc' },
    include: {
      project: { select: { name: true } },
      punchListItems: true,
    },
  })
  return ok(inspections)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, title, inspectionDate, inspectorName, type, notes } = body
  if (!projectId || !title || !inspectionDate || !type) return err('Missing required fields', 400)
  const inspection = await prisma.inspection.create({
    data: { projectId, title, inspectionDate: new Date(inspectionDate), inspectorName, type, notes },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'inspection', entityId: inspection.id, action: 'created', description: `Inspection créée: ${title}` },
  })
  return ok(inspection, 201)
}
