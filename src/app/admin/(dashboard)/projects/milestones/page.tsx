import { prisma } from '@/lib/db'
import MilestonesClient from './MilestonesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Jalons – SOPAT Admin' }

export default async function MilestonesPage() {
  const [milestonesRaw, projects] = await Promise.all([
    prisma.milestone.findMany({
      orderBy: { dueDate: 'asc' },
      include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const milestones = JSON.parse(JSON.stringify(milestonesRaw))
  return <MilestonesClient milestones={milestones} projects={projects} />
}
