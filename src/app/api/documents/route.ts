import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listDocuments,
  createDocument,
  type DocumentStatus,
  type DocumentCategory,
} from '@/lib/db/iso'
import { z } from 'zod'

const createSchema = z.object({
  code:            z.string().min(1).max(50).toUpperCase(),
  title:           z.string().min(1).max(255),
  category:        z.enum(['procedure', 'instruction', 'formulaire', 'enregistrement', 'autre'] as const),
  version:         z.string().min(1).max(20),
  status:          z.enum(['draft', 'active', 'obsolete'] as const).default('draft'),
  ownerId:         z.string().uuid(),
  assetId:         z.string().uuid().optional(),
  isoClause:       z.string().max(50).optional(),
  processAffected: z.enum(['etudes', 'realisation', 'entretien'] as const).optional(),
  effectiveDate:   z.string().datetime().optional(),
  reviewDate:      z.string().datetime().optional(),
  notes:           z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const result = await listDocuments({
    status:   (sp.get('status') as DocumentStatus | null) ?? undefined,
    category: (sp.get('category') as DocumentCategory | null) ?? undefined,
    search:   sp.get('search') ?? undefined,
    page:     sp.get('page') ? Number(sp.get('page')) : undefined,
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Only admin/direction can manage ISO documents
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const doc = await createDocument({
    code:            d.code,
    title:           d.title,
    category:        d.category,
    version:         d.version,
    status:          d.status,
    ownerId:         d.ownerId,
    assetId:         d.assetId,
    isoClause:       d.isoClause,
    processAffected: d.processAffected,
    effectiveDate:   d.effectiveDate ? new Date(d.effectiveDate) : undefined,
    reviewDate:      d.reviewDate    ? new Date(d.reviewDate)    : undefined,
    notes:           d.notes,
    createdBy:       session.user.userId,
  })

  return NextResponse.json(doc, { status: 201 })
}
