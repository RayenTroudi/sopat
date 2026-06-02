import { prisma } from '@/lib/db'
import { getStageName } from '@/lib/stages'
import { advanceStage } from '@/lib/lifecycle'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession()
  if (!session) return err('Unauthorized', 401)

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { stage, notes } = body as { stage?: number; notes?: string }

  if (stage !== undefined) {
    // Direct set (admin only, allows going backwards)
    if (![1, 2, 3, 4].includes(stage)) {
      return err('Stage must be 1, 2, 3, or 4', 400)
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return err('Project not found', 404)

    if (stage < project.stage) {
      // Going backwards requires admin role — allowed since session is admin
    } else if (stage > project.stage + 1) {
      return err('Cannot skip stages', 400)
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { stage, stageUpdatedAt: new Date(), stageNotes: notes ?? null },
    })

    await prisma.activityLog.create({
      data: {
        projectId: id,
        entityType: 'project',
        entityId: id,
        action: 'stage_changed',
        description: `Étape changée à ${stage}: ${getStageName(stage)}`,
      },
    })

    return ok({ ...updated, stageName: getStageName(updated.stage) })
  }

  // No explicit stage → advance to next
  try {
    const updated = await advanceStage(id, notes)
    return ok({ ...updated, stageName: getStageName(updated.stage) })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Failed', 400)
  }
}
