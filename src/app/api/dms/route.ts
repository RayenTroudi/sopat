// src/app/api/dms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { auth, requireApiRole } from '@/lib/auth'
import { listDmsDocuments, createDmsDocument } from '@/lib/dms/queries'
import { isValidCode } from '@/lib/dms/codes'
import { logDmsAudit } from '@/lib/dms/audit'
import { db } from '@/db'

const createSchema = z.object({
  documentNumber:    z.string().min(1).max(50).toUpperCase().refine(isValidCode, {
    message: 'Le code doit suivre le format TYPE-PROCESS-NN (ex: PRC-MI-01)',
  }),
  title:             z.string().min(1).max(255),
  category:          z.enum(['manuel_qualite','politique','procedure','instruction','formulaire',
    'enregistrement','plan_qualite','cartographie_processus','etude_technique','devis','contrat',
    'bon_commande','facture','rapport_inspection','rapport_audit','ncr','capa',
    'document_fournisseur','document_client','externe'] as const),
  department:        z.enum(['direction','etudes','realisation','entretien','qualite','finance','rh','rse','transverse'] as const),
  ownerId:           z.string().uuid().optional(),
  isoClauses:        z.array(z.string()).optional(),
  confidentiality:   z.enum(['public','internal','confidential','restricted'] as const).optional(),
  effectiveDate:     z.string().optional(),
  nextReviewDate:    z.string().optional(),
  versionLabel:      z.string().max(20).optional(),
  storageType:       z.string().max(50).optional(),
  managedByPassword: z.boolean().optional(),
  observations:      z.string().optional(),
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
  const guard = await requireApiRole(['admin', 'direction'])
  if ('response' in guard) return guard.response
  const { session } = guard

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const doc = await createDmsDocument({
    documentNumber:    d.documentNumber,
    title:             d.title,
    category:          d.category,
    department:        d.department,
    ownerId:           d.ownerId ?? session.user.userId,
    authorId:          session.user.userId,
    isoClauses:        d.isoClauses,
    confidentiality:   d.confidentiality,
    effectiveDate:     d.effectiveDate  ? new Date(d.effectiveDate)  : undefined,
    nextReviewDate:    d.nextReviewDate ? new Date(d.nextReviewDate) : undefined,
    versionLabel:      d.versionLabel,
    storageType:       d.storageType,
    managedByPassword: d.managedByPassword,
    observations:      d.observations,
    createdBy:         session.user.userId,
  })
  await logDmsAudit(db, {
    documentId: doc.id,
    event:      'created',
    actorId:    session.user.userId,
    actorRole:  session.user.role,
    newState: {
      documentNumber: doc.documentNumber,
      title:          doc.title,
      category:       doc.category,
      department:     doc.department,
      status:         doc.status,
    },
  }).catch((err) => console.error('[dms-audit] created', err))
  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json(doc, { status: 201 })
}
