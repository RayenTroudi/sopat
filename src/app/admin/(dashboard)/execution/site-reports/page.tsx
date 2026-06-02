import { prisma } from '@/lib/db'
import SiteReportsClient from './SiteReportsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapports de chantier – SOPAT Admin' }

export default async function SiteReportsPage() {
  const [reportsRaw, projects] = await Promise.all([
    prisma.siteReport.findMany({
      orderBy: { reportDate: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const reports = JSON.parse(JSON.stringify(reportsRaw))
  return <SiteReportsClient reports={reports} projects={projects} />
}
