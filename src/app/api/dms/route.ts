// src/app/api/dms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { listDmsDocuments, createDmsDocument } from '@/lib/dms/queries'
import { isValidCode } from '@/lib/dms/codes'

const createSchema = z.object({
  documentNumber:  z.string().min(1).max(50).toUpperCase().refine(isValidCode, {
    message: 'Le code doit suivre le format TYPE-PROCESS-NN (ex: PRC-MI-01)',
  }),
  title:           z.string().min(1).max(255),
  category:        z.enum(['manuel_qualite','politique','procedure','instruction','formulaire',
    'enregistrement','plan_qualite','cartographie_processus','etude_technique','devis','contrat',
    'bon_commande','facture','rapport_inspection','rapport_audit','ncr','capa',
    'document_fournisseur','document_client','externe'] as const),
  department:      z.enum(['direction','etudes','realisation','entretien','qualite','finance','rh','rse','transverse'] as const),
  ownerId:         z.string().uuid().optional(),
  isoClauses:      z.array(z.string()).optional(),
  confidentiality: z.enum(['public','internal','confidential','restricted'] as const).optional(),
  effectiveDate:   z.string().datetime().optional(),
  nextReviewDate:  z.string().datetime().optional(),
  legacyReference: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const result = await listDmsDocuments({
    status:      sp.get('status')       ?? undefined,
    category:    sp.get('category')     ?? undefined,
    department:  sp.get('department')   ?? undefined,
    typeCode:    (sp.get('typeCode')    as any) ?? undefined,
    processCode: (sp.get('processCode') as any) ?? undefined,
    search:      sp.get('search')       ?? undefined,
    page:        sp.get('page') ? Number(sp.get('page')) : undefined,
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
  const doc = await createDmsDocument({
    documentNumber:  d.documentNumber,
    title:           d.title,
    category:        d.category,
    department:      d.department,
    ownerId:         d.ownerId ?? session.user.userId,
    authorId:        session.user.userId,
    isoClauses:      d.isoClauses,
    confidentiality: d.confidentiality,
    effectiveDate:   d.effectiveDate  ? new Date(d.effectiveDate)  : undefined,
    nextReviewDate:  d.nextReviewDate ? new Date(d.nextReviewDate) : undefined,
    legacyReference: d.legacyReference,
    createdBy:       session.user.userId,
  })
  return NextResponse.json(doc, { status: 201 })
}
