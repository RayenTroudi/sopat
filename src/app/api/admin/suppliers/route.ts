import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  return ok(suppliers)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const body = await req.json()
  const { name, category, contactName, email, phone, address, notes } = body
  if (!name || !category) return err('name and category required', 400)
  const supplier = await prisma.supplier.create({
    data: { name, category, contactName, email, phone, address, notes },
  })
  return ok(supplier, 201)
}
