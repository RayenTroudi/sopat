import { prisma } from '@/lib/db'
import LeadsClient from './LeadsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Prospects – SOPAT Admin' }

export default async function LeadsPage() {
  const leadsRaw = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } } },
  })
  const leads = JSON.parse(JSON.stringify(leadsRaw))
  return <LeadsClient leads={leads} />
}
