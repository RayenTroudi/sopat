import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listSuppliers, createSupplier, type SupplierCategory, type SupplierStatus } from '@/lib/db/suppliers'
import { z } from 'zod'

const CATEGORIES = [
  'pepiniere','materiaux','equipements','produits_phytosanitaires','logistique','location_engins','autre',
  'plantes','terre_vegetale','gazon','matiere_decorative','bac_fleurs',
  'parc_auto','equipements_bureautique','services','sous_traitants',
] as const

const createSchema = z.object({
  name:             z.string().min(1).max(255),
  category:         z.enum(CATEGORIES),
  supplierCode:     z.string().max(20).optional(),
  registreCommerce: z.string().max(100).optional(),
  contactName:      z.string().max(255).optional(),
  email:            z.string().email().optional().or(z.literal('')),
  phone:            z.string().max(50).optional(),
  city:             z.string().max(100).optional(),
  address:          z.string().optional(),
  isoStatus:        z.enum(['approuve','en_evaluation','suspendu'] as const),
  selectionScore:   z.number().min(0).max(3).optional(),
  selectionClass:   z.string().max(1).optional(),
  evaluationScore:  z.number().min(0).max(3).optional(),
  evaluationClass:  z.string().max(1).optional(),
  isoClass:         z.string().max(1).optional(),
  nextEvalPlanned:  z.string().max(50).optional(),
  nextEvalDone:     z.string().max(50).optional(),
  lastAuditDate:    z.string().datetime().optional(),
  contractAssetId:  z.string().uuid().optional(),
  notes:            z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const rows = await listSuppliers({
    search:   sp.get('search') ?? undefined,
    category: sp.get('category') ?? undefined,
    status:   sp.get('status') ?? undefined,
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction' && role !== 'etudes_chef' && role !== 'realisation_chef') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const row = await createSupplier({
    name:             d.name,
    category:         d.category as SupplierCategory,
    supplierCode:     d.supplierCode || undefined,
    registreCommerce: d.registreCommerce || undefined,
    contactName:      d.contactName || undefined,
    email:            d.email || undefined,
    phone:            d.phone || undefined,
    city:             d.city || undefined,
    address:          d.address || undefined,
    isoStatus:        d.isoStatus as SupplierStatus,
    selectionScore:   d.selectionScore,
    selectionClass:   d.selectionClass,
    evaluationScore:  d.evaluationScore,
    evaluationClass:  d.evaluationClass,
    isoClass:         d.isoClass,
    nextEvalPlanned:  d.nextEvalPlanned,
    nextEvalDone:     d.nextEvalDone,
    lastAuditDate:    d.lastAuditDate ? new Date(d.lastAuditDate) : undefined,
    contractAssetId:  d.contractAssetId,
    notes:            d.notes || undefined,
    createdBy:        session.user.userId,
  })

  return NextResponse.json(row, { status: 201 })
}
