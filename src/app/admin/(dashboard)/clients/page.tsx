import { prisma } from '@/lib/db'
import ClientsClient from './ClientsClient'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { projects: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return <ClientsClient clients={clients} />
}
