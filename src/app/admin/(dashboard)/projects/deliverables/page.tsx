import { prisma } from '@/lib/db'
import DeliverablesClient from './DeliverablesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Livrables – SOPAT Admin' }

export default async function DeliverablesPage() {
  const [deliverablesRaw, projects] = await Promise.all([
    prisma.deliverable.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const deliverables = JSON.parse(JSON.stringify(deliverablesRaw))
  return <DeliverablesClient deliverables={deliverables} projects={projects} />
}
