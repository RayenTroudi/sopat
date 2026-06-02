import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const tasks = await prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    include: { project: { select: { name: true } } },
  })
  return ok(tasks)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, title, description, assignedTo, priority, dueDate, stageNumber } = body
  if (!projectId || !title) return err('projectId and title required', 400)
  const task = await prisma.task.create({
    data: {
      projectId, title, description, assignedTo,
      priority: priority ?? 'Medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      stageNumber: stageNumber ? Number(stageNumber) : undefined,
    },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'task', entityId: task.id, action: 'created', description: `Tâche créée: ${title}` },
  })
  return ok(task, 201)
}
