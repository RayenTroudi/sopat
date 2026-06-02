import { prisma } from '@/lib/db'
import SuppliersClient from './SuppliersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fournisseurs – SOPAT Admin' }

export default async function SuppliersPage() {
  const suppliersRaw = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  const suppliers = JSON.parse(JSON.stringify(suppliersRaw))
  return <SuppliersClient suppliers={suppliers} />
}
