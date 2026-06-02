import { prisma } from './db'
import { getStageName } from './stages'

export async function advanceStage(projectId: string, notes?: string, adminOverride?: boolean) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  const nextStage = project.stage + 1
  if (nextStage > 4) throw new Error('Projet déjà à l\'étape finale')

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      stage: nextStage,
      stageUpdatedAt: new Date(),
      stageNotes: notes ?? null,
    },
  })

  await prisma.activityLog.create({
    data: {
      projectId,
      entityType: 'project',
      entityId: projectId,
      action: 'stage_advanced',
      description: `Projet avancé à l'étape ${nextStage}: ${getStageName(nextStage)}`,
    },
  })

  await prisma.notification.create({
    data: {
      projectId,
      type: 'stage_change',
      title: 'Étape avancée',
      message: `Le projet est maintenant à l'étape ${nextStage}: ${getStageName(nextStage)}`,
      link: `/admin/projects/${projectId}`,
    },
  })

  return updated
}

export async function detectDelays() {
  const now = new Date()
  const projects = await prisma.project.findMany({
    where: { status: 'Active', endDate: { lt: now } },
    select: { id: true, name: true, endDate: true },
  })

  for (const p of projects) {
    const existing = await prisma.notification.findFirst({
      where: { projectId: p.id, type: 'delay', isRead: false },
    })
    if (!existing) {
      await prisma.notification.create({
        data: {
          projectId: p.id,
          type: 'delay',
          title: 'Projet en retard',
          message: `Le projet "${p.name}" a dépassé sa date de fin prévue.`,
          link: `/admin/projects/${p.id}`,
        },
      })
    }
  }
  return projects.length
}
