import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.client.delete({ where: { id } })
    return ok({ id })
  } catch {
    return err('Failed to delete client', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, type, email, phone } = body

    if (!name || !type) return err('name and type are required')

    const client = await prisma.client.update({
      where: { id },
      data: { name, type, email: email ?? null, phone: phone ?? null },
    })
    return ok(client)
  } catch {
    return err('Failed to update client', 500)
  }
}
