import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getSupplierById,
  updateSupplier,
  softDeleteSupplier,
  getEvaluationHistory,
  addEvaluation,
  type SupplierCategory,
  type SupplierStatus,
} from '@/lib/db/suppliers'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const CATEGORIES = [
  'pepiniere','materiaux','equipements','produits_phytosanitaires','logistique','location_engins','autre',
  'plantes','terre_vegetale','gazon','matiere_decorative','bac_fleurs',
  'parc_auto','equipements_bureautique','services','sous_traitants',
] as const

const updateSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  category:         z.enum(CATEGORIES).optional(),
  supplierCode:     z.string().max(20).nullable().optional(),
  registreCommerce: z.string().max(100).nullable().optional(),
  contactName:      z.string().max(255).nullable().optional(),
  email:            z.string().email().nullable().optional().or(z.literal('')),
  phone:            z.string().max(50).nullable().optional(),
  city:             z.string().max(100).nullable().optional(),
  address:          z.string().nullable().optional(),
  isoStatus:        z.enum(['approuve','en_evaluation','suspendu'] as const).optional(),
  selectionScore:   z.number().min(0).max(3).nullable().optional(),
  selectionClass:   z.string().max(1).nullable().optional(),
  evaluationScore:  z.number().min(0).max(3).nullable().optional(),
  evaluationClass:  z.string().max(1).nullable().optional(),
  isoClass:         z.string().max(1).nullable().optional(),
  nextEvalPlanned:  z.string().max(50).nullable().optional(),
  nextEvalDone:     z.string().max(50).nullable().optional(),
  lastAuditDate:    z.string().datetime().nullable().optional(),
  contractAssetId:  z.string().uuid().nullable().optional(),
  notes:            z.string().nullable().optional(),
  isActive:         z.boolean().optional(),
})

const evalSchema = z.object({
  evaluationType:  z.enum(['selection', 'evaluation']),
  tauxCouverture:     z.number().int().min(1).max(3).optional(),
  niveauQualite:      z.number().int().min(1).max(3).optional(),
  prix:               z.number().int().min(1).max(3).optional(),
  delaiLivraison:     z.number().int().min(1).max(3).optional(),
  modeLivraison:      z.number().int().min(1).max(3).optional(),
  modalitesPaiement:  z.number().int().min(1).max(3).optional(),
  proximiteLivraison: z.number().int().min(1).max(3).optional(),
  notorieteReference:  z.number().int().min(1).max(3).optional(),
  respectExigences:    z.number().int().min(1).max(3).optional(),
  respectPrix:         z.number().int().min(1).max(3).optional(),
  respectDelai:        z.number().int().min(1).max(3).optional(),
  reactivite:          z.number().int().min(1).max(3).optional(),
  assistanceTechnique: z.number().int().min(1).max(3).optional(),
  documentationTech:   z.number().int().min(1).max(3).optional(),
  notes:           z.string().optional(),
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

  const d = parsed.data
  const row = await addEvaluation({
    supplierId:     id,
    evaluatedBy:    session.user.userId,
    evaluatorName:  session.user.name ?? session.user.email ?? 'Inconnu',
    evaluationType: d.evaluationType,
    tauxCouverture:      d.tauxCouverture,
    niveauQualite:       d.niveauQualite,
    prix:                d.prix,
    delaiLivraison:      d.delaiLivraison,
    modeLivraison:       d.modeLivraison,
    modalitesPaiement:   d.modalitesPaiement,
    proximiteLivraison:  d.proximiteLivraison,
    notorieteReference:  d.notorieteReference,
    respectExigences:    d.respectExigences,
    respectPrix:         d.respectPrix,
    respectDelai:        d.respectDelai,
    reactivite:          d.reactivite,
    assistanceTechnique: d.assistanceTechnique,
    documentationTech:   d.documentationTech,
    notes:               d.notes,
    createdBy:           session.user.userId,
  })

  return NextResponse.json(row, { status: 201 })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const ok = await softDeleteSupplier(id)
  if (!ok) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
