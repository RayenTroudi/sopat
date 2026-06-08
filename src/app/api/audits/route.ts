import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateAuditReference, createAudit, listAudits, type AuditStatus } from '@/lib/db/iso'
import { z } from 'zod'

const createSchema = z.object({
  auditorId:      z.string().uuid(),
  auditDate:      z.string().datetime(),
  processAudited: z.string().min(1),
  scope:          z.string().optional(),
  findings:       z.string().optional(),
  status:         z.enum(['scheduled', 'in_progress', 'completed'] as const).default('scheduled'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const result = await listAudits({
    status:  (sp.get('status') as AuditStatus | null) ?? undefined,
    process: sp.get('process') ?? undefined,
    page:    sp.get('page') ? Number(sp.get('page')) : undefined,
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const reference = await generateAuditReference()

  const audit = await createAudit({
    reference,
    auditorId:      d.auditorId,
    auditDate:      new Date(d.auditDate),
    processAudited: d.processAudited,
    scope:          d.scope,
    findings:       d.findings,
    status:         d.status,
    createdBy:      session.user.userId,
  })

  return NextResponse.json(audit, { status: 201 })
}
