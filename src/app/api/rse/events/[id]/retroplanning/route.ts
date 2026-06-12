import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventRetroplanning, upsertEventRetroplanning, updateRetroTask } from '@/lib/db/rse-events'
import { z } from 'zod'

const upsertSchema = z.object({
  tasks: z.array(z.object({
    taskDescription: z.string().min(1),
    deadline: z.string().nullable().optional(),
    assignedTeam: z.enum(['rse', 'rh_communication', 'logistique', 'communication_marketing', 'direction']).nullable().optional(),
    status: z.enum(['a_faire', 'en_cours', 'termine']).optional(),
    notes: z.string().nullable().optional(),
  })),
})

const patchSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['a_faire', 'en_cours', 'termine']).optional(),
  completedAt: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const tasks = await getEventRetroplanning(id)
  return NextResponse.json(tasks)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const tasks = await upsertEventRetroplanning(
    id,
    parsed.data.tasks.map((t) => ({
      ...t,
      deadline: t.deadline ? new Date(t.deadline) : null,
      assignedTeam: t.assignedTeam ?? null,
    })),
    session.user.userId
  )
  return NextResponse.json(tasks)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { taskId, status, completedAt } = parsed.data
  const updated = await updateRetroTask(taskId, {
    status,
    completedAt: completedAt ? new Date(completedAt) : completedAt === null ? null : undefined,
  })
  return NextResponse.json(updated)
}
