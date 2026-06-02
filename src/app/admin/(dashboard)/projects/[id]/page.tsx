import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { calcPnl } from '@/lib/pnl'
import ProjectDetailClient from './ProjectDetailClient'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [project, pnl] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        contracts: true,
        budgetItems: true,
        costItems: { orderBy: { date: 'desc' } },
        timeEntries: { orderBy: { date: 'desc' } },
        invoices: { include: { payments: true }, orderBy: { date: 'desc' } },
        overheadAllocs: true,
        milestones: { orderBy: { dueDate: 'asc' } },
        tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
        deliverables: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
    calcPnl(id),
  ])

  if (!project) notFound()

  return <ProjectDetailClient project={project} pnl={pnl} />
}
