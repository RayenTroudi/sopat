import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entries = await prisma.timeEntry.findMany({
      where: { projectId: id },
      orderBy: { date: 'desc' },
    })
    return ok(entries)
  } catch {
    return err('Failed to fetch time entries', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { employeeId, date, hours, hourlyRate, description } = body

    if (!employeeId || !date || hours == null || hourlyRate == null)
      return err('employeeId, date, hours, and hourlyRate are required')

    const h = Number(hours)
    const r = Number(hourlyRate)

    const entry = await prisma.timeEntry.create({
      data: {
        projectId: id,
        employeeId,
        date: new Date(date),
        hours: h,
        hourlyRate: r,
        amount: h * r,
        description: description ?? null,
      },
    })
    return ok(entry, 201)
  } catch {
    return err('Failed to create time entry', 500)
  }
}
