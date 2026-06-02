import { prisma } from '@/lib/db'
import InspectionsClient from './InspectionsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Inspections – SOPAT Admin' }

export default async function InspectionsPage() {
  const [inspectionsRaw, projects] = await Promise.all([
    prisma.inspection.findMany({
      orderBy: { inspectionDate: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        punchListItems: true,
      },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const inspections = JSON.parse(JSON.stringify(inspectionsRaw))
  return <InspectionsClient inspections={inspections} projects={projects} />
}
