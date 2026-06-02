import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const deliverables = await prisma.deliverable.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { project: { select: { name: true, client: { select: { name: true } } } } },
  })
  return ok(deliverables)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, title, type, description, dueDate, stageNumber } = body
  if (!projectId || !title || !type) return err('projectId, title, type required', 400)
  const deliverable = await prisma.deliverable.create({
    data: {
      projectId, title, type, description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      stageNumber: stageNumber ? Number(stageNumber) : undefined,
    },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'deliverable', entityId: deliverable.id, action: 'created', description: `Livrable créé: ${title}` },
  })
  return ok(deliverable, 201)
}
