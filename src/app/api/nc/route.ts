import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  generateNcReference,
  createNc,
  listNcs,
  validateNcInputRefs,
  type NcStatus,
  type NcProcess,
} from '@/lib/db/iso'
import { triggerNcAssignedEmail } from '@/lib/email-triggers'
import { z } from 'zod'

const createSchema = z.object({
  projectId:       z.string().uuid().optional(),
  processAffected: z.enum(['etudes', 'realisation', 'entretien'] as const).optional(),
  ncType:          z.enum(['technique', 'documentaire', 'reclamation_client', 'audit', 'systeme'] as const).optional(),
  ownerType:       z.enum(['interne', 'externe'] as const).optional(),
  auditorName:     z.string().optional(),
  description:     z.string().min(10, 'Description trop courte'),
  rootCause:       z.string().optional(),
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

  // Validate that projectId and assignedTo reference real, active records
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
    projectId:          d.projectId,
    processAffected:    d.processAffected,
    ncType:             d.ncType,
    ownerType:          d.ownerType,
    auditorName:        d.auditorName,
    description:        d.description,
    rootCause:          d.rootCause,
    assignedTo:         d.assignedTo,
    deadline:           d.deadline ? new Date(d.deadline) : undefined,
    beforePhotoAssetId: d.beforePhotoAssetId,
    afterPhotoAssetId:  d.afterPhotoAssetId,
    detectedBy:         session.user.userId,
    createdBy:          session.user.userId,
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
