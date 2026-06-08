import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateAudit, type AuditStatus } from '@/lib/db/iso'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  findings:    z.string().optional(),
  scope:       z.string().optional(),
  status:      z.enum(['scheduled', 'in_progress', 'completed'] as const).optional(),
  completedAt: z.string().datetime().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  // Closing an audit requires findings
  if (d.status === 'completed' && !d.findings) {
    return NextResponse.json({ error: 'Les constats sont obligatoires pour clôturer un audit' }, { status: 422 })
  }

  const updated = await updateAudit(id, {
    findings:    d.findings,
    scope:       d.scope,
    status:      d.status as AuditStatus | undefined,
    completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
  })

  return NextResponse.json(updated)
}
