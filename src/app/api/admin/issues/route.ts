import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const issues = await prisma.issue.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    include: { project: { select: { name: true } } },
  })
  return ok(issues)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { projectId, title, description, severity, assignedTo, reportedBy } = body
  if (!projectId || !title || !description) return err('Missing required fields', 400)
  const issue = await prisma.issue.create({
    data: {
      projectId, title, description,
      severity: severity ?? 'Medium',
      assignedTo, reportedBy,
    },
  })
  await prisma.activityLog.create({
    data: { projectId, entityType: 'issue', entityId: issue.id, action: 'created', description: `Problème signalé: ${title}` },
  })
  return ok(issue, 201)
}
