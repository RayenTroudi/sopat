import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  generateNcReference,
  createNc,
  listNcs,
  validateNcInputRefs,
  type NcStatus,
  type NcProcess,
  type NcDept,
  type NcSource,
} from '@/lib/db/iso'
import { triggerNcAssignedEmail } from '@/lib/email-triggers'
import { z } from 'zod'

const createSchema = z.object({
  projectId:       z.string().uuid().optional(),
  processAffected: z.enum(['etudes', 'realisation', 'entretien'] as const).optional(),
  dept:            z.enum(['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH'] as const).optional(),
  ncType:          z.enum(['technique', 'documentaire', 'reclamation_client', 'audit', 'systeme'] as const).optional(),
  ncSource:        z.enum(['interne', 'audit', 'reclamation_client', 'reclamation_pi'] as const).optional(),
  ownerType:       z.enum(['interne', 'externe'] as const).optional(),
  auditorName:     z.string().optional(),
  detectorName:    z.string().optional(),
  detectorEmail:   z.string().optional(),
  referenceDoc:    z.string().optional(),
  description:     z.string().min(10, 'Description trop courte'),
  impact:          z.string().optional(),
  rootCause:       z.string().optional(),
  immediateCorrection:       z.string().optional(),
  derogationAuth:            z.boolean().optional(),
  rebut:                     z.boolean().optional(),
  correctionResponsible:     z.string().optional(),
  correctionDeadlinePlanned: z.string().datetime().optional(),
  correctionDeadlineActual:  z.string().datetime().optional(),
  correctionStatus:          z.string().optional(),
  evalDatePlanned:           z.string().datetime().optional(),
  evalDateActual:            z.string().datetime().optional(),
  clientResponse:            z.string().optional(),
  isRisk:                    z.boolean().optional(),
  isOpportunity:             z.boolean().optional(),
  needsSecondCapa:           z.boolean().optional(),
  assignedTo:      z.string().uuid().optional(),
  deadline:        z.string().datetime().optional(),
  beforePhotoAssetId: z.string().uuid().optional(),
  afterPhotoAssetId:  z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const result = await listNcs({
    status:    (sp.get('status') as NcStatus | null) ?? undefined,
    process:   (sp.get('process') as NcProcess | null) ?? undefined,
    dept:      (sp.get('dept') as NcDept | null) ?? undefined,
    ncSource:  (sp.get('ncSource') as NcSource | null) ?? undefined,
    projectId: sp.get('projectId') ?? undefined,
    search:    sp.get('search') ?? undefined,
    page:      sp.get('page') ? Number(sp.get('page')) : undefined,
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const refError = await validateNcInputRefs({
    assignedTo:      d.assignedTo,
    projectId:       d.projectId,
    processAffected: d.processAffected,
  })
  if (refError) {
    return NextResponse.json({ error: refError }, { status: 422 })
  }

  const reference = await generateNcReference()

  const nc = await createNc({
    reference,
    projectId:                  d.projectId,
    processAffected:            d.processAffected,
    dept:                       d.dept,
    ncType:                     d.ncType,
    ncSource:                   d.ncSource,
    ownerType:                  d.ownerType,
    auditorName:                d.auditorName,
    detectorName:               d.detectorName,
    detectorEmail:              d.detectorEmail,
    referenceDoc:               d.referenceDoc,
    description:                d.description,
    impact:                     d.impact,
    rootCause:                  d.rootCause,
    immediateCorrection:        d.immediateCorrection,
    derogationAuth:             d.derogationAuth,
    rebut:                      d.rebut,
    correctionResponsible:      d.correctionResponsible,
    correctionDeadlinePlanned:  d.correctionDeadlinePlanned ? new Date(d.correctionDeadlinePlanned) : undefined,
    correctionDeadlineActual:   d.correctionDeadlineActual  ? new Date(d.correctionDeadlineActual)  : undefined,
    correctionStatus:           d.correctionStatus,
    evalDatePlanned:            d.evalDatePlanned ? new Date(d.evalDatePlanned) : undefined,
    evalDateActual:             d.evalDateActual  ? new Date(d.evalDateActual)  : undefined,
    clientResponse:             d.clientResponse,
    isRisk:                     d.isRisk,
    isOpportunity:              d.isOpportunity,
    needsSecondCapa:            d.needsSecondCapa,
    assignedTo:                 d.assignedTo,
    deadline:                   d.deadline ? new Date(d.deadline) : undefined,
    beforePhotoAssetId:         d.beforePhotoAssetId,
    afterPhotoAssetId:          d.afterPhotoAssetId,
    detectedBy:                 session.user.userId,
    createdBy:                  session.user.userId,
  })

  if (d.assignedTo) {
    void triggerNcAssignedEmail({
      ncId:            nc.id,
      ncReference:     reference,
      projectId:       d.projectId ?? null,
      processAffected: d.processAffected ?? 'etudes',
      description:     d.description,
      deadline:        d.deadline ? new Date(d.deadline) : null,
      detectedBy:      session.user.userId,
      detectedByName:  session.user.name ?? session.user.email ?? 'Inconnu',
      assignedToId:    d.assignedTo,
    })
  }

  return NextResponse.json(nc, { status: 201 })
}
