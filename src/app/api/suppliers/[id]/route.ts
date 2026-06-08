import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getSupplierById,
  updateSupplier,
  getEvaluationHistory,
  addEvaluation,
  type SupplierCategory,
  type SupplierStatus,
} from '@/lib/db/suppliers'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name:            z.string().min(1).max(255).optional(),
  category:        z.enum(['pepiniere','materiaux','equipements','produits_phytosanitaires','logistique','autre'] as const).optional(),
  contactName:     z.string().max(255).nullable().optional(),
  email:           z.string().email().nullable().optional().or(z.literal('')),
  phone:           z.string().max(50).nullable().optional(),
  city:            z.string().max(100).nullable().optional(),
  address:         z.string().nullable().optional(),
  isoStatus:       z.enum(['approuve','en_evaluation','suspendu'] as const).optional(),
  evaluationScore: z.number().int().min(1).max(5).nullable().optional(),
  lastAuditDate:   z.string().datetime().nullable().optional(),
  contractAssetId: z.string().uuid().nullable().optional(),
  notes:           z.string().nullable().optional(),
  isActive:        z.boolean().optional(),
})

const evalSchema = z.object({
  score: z.number().int().min(1).max(5),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const [supplier, evaluations] = await Promise.all([
    getSupplierById(id),
    getEvaluationHistory(id),
  ])
  if (!supplier) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json({ supplier, evaluations })
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction' && role !== 'etudes_chef' && role !== 'realisation_chef') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const row = await updateSupplier(id, {
    ...d,
    category:  d.category as SupplierCategory | undefined,
    isoStatus: d.isoStatus as SupplierStatus | undefined,
    lastAuditDate: d.lastAuditDate === undefined ? undefined : d.lastAuditDate === null ? null : new Date(d.lastAuditDate),
    email: d.email === '' ? null : d.email,
  })
  if (!row) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json(row)
}

// POST /api/suppliers/[id] with ?action=evaluate
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction' && role !== 'etudes_chef' && role !== 'realisation_chef') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const supplier = await getSupplierById(id)
  if (!supplier) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = evalSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const row = await addEvaluation({
    supplierId:    id,
    evaluatedBy:   session.user.userId,
    evaluatorName: session.user.name ?? session.user.email ?? 'Inconnu',
    score:         parsed.data.score,
    notes:         parsed.data.notes,
    createdBy:     session.user.userId,
  })

  return NextResponse.json(row, { status: 201 })
}
