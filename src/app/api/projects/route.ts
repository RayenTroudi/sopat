import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllProjects, createProject, logActivity } from '@/lib/db/projects'
import type { ProjectStatus, Phase, ProjectType } from '@/lib/db/projects'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  clientName: z.string().min(1, 'Nom du client requis'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(1, 'Adresse requise'),
  siteAreaM2: z.string().optional(),
  projectType: z.enum([
    'ingenierie_territoriale',
    'espace_public',
    'siege_social',
    'hotelier_touristique',
    'residentiel',
    'interieur',
  ]),
  country: z.string().length(2).default('TN'),
  currency: z.enum(['TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']).default('TND'),
  clientSector: z.enum([
    'banque', 'hotellerie', 'automobile',
    'institutionnel_public', 'institutionnel_prive',
    'residentiel_prive', 'diplomatique', 'autre',
  ]).optional(),
  clientAnonymized: z.boolean().default(false),
  conceptTitle: z.string().optional(),
  conceptDescription: z.string().optional(),
  designVocabulary: z.array(z.string()).optional(),
  plantPalettePhilosophy: z.array(z.string()).optional(),
  linearMeters: z.string().optional(),
  floorCount: z.number().int().positive().optional(),
  municipalityClient: z.string().optional(),
  territorySurfaceKm2: z.string().optional(),
  numberOfMunicipalities: z.number().int().positive().optional(),
  lightingIncluded: z.boolean().default(false),
  startDate: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  assignedEtudesChefId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') as ProjectStatus | null
  const phase = searchParams.get('phase') as Phase | null
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10)

  try {
    const result = await getAllProjects({ status: status ?? undefined, phase: phase ?? undefined, page, pageSize })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/projects]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  try {
    const project = await createProject({
      ...data,
      projectType: data.projectType as ProjectType,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : undefined,
      createdBy: session.user.userId,
    })

    await logActivity({
      projectId: project.id,
      actorId: session.user.userId,
      actorName: session.user.name ?? session.user.email ?? 'Inconnu',
      action: 'project.created',
      newState: { reference: project.reference, name: project.name, status: project.status },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
