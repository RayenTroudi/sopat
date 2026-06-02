import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: { projects: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(clients)
  } catch {
    return err('Failed to fetch clients', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, email, phone } = body

    if (!name || !type) return err('name and type are required')

    const client = await prisma.client.create({
      data: { name, type, email: email ?? null, phone: phone ?? null },
    })
    return ok(client, 201)
  } catch {
    return err('Failed to create client', 500)
  }
}
