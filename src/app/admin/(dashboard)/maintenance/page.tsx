import { prisma } from '@/lib/db'
import MaintenanceClient from './MaintenanceClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Maintenance – SOPAT Admin' }

export default async function MaintenancePage() {
  const [visitsRaw, projects] = await Promise.all([
    prisma.maintenanceVisit.findMany({
      orderBy: { visitDate: 'desc' },
      include: { project: { select: { id: true, name: true, client: { select: { name: true } } } } },
    }),
    prisma.project.findMany({
      where: { stage: 4 },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const visits = JSON.parse(JSON.stringify(visitsRaw))
  return <MaintenanceClient visits={visits} projects={projects} />
}
