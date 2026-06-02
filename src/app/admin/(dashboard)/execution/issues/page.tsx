import { prisma } from '@/lib/db'
import IssuesClient from './IssuesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Problèmes – SOPAT Admin' }

export default async function IssuesPage() {
  const [issuesRaw, projects] = await Promise.all([
    prisma.issue.findMany({
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Active', 'On Hold'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const issues = JSON.parse(JSON.stringify(issuesRaw))
  return <IssuesClient issues={issues} projects={projects} />
}
