import { prisma } from '@/lib/db'
import { calcPnl } from '@/lib/pnl'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const projects = await prisma.project.findMany({ select: { id: true } })
  const results = (await Promise.all(projects.map(p => calcPnl(p.id)))).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof calcPnl>>>[]
  return <ReportsClient rows={results} />
}
