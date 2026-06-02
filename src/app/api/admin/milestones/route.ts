import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const milestones = await prisma.milestone.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { dueDate: 'asc' },
    include: { project: { select: { name: true, client: { select: { name: true } } } } },
  })
  return ok(milestones)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, title, dueDate, description, stageNumber } = body
  if (!projectId || !title || !dueDate) return err('projectId, title, dueDate required', 400)
  const milestone = await prisma.milestone.create({
    data: { projectId, title, dueDate: new Date(dueDate), description, stageNumber: stageNumber ? Number(stageNumber) : undefined },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'milestone', entityId: milestone.id, action: 'created', description: `Jalon créé: ${title}` },
  })
  return ok(milestone, 201)
}
