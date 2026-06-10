import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getZonesByProject, saveProjectZones } from '@/lib/db/project-zones'
import { z } from 'zod'

const zoneSchema = z.object({
  zoneName: z.string().min(1, 'Nom de zone requis'),
  zoneType: z.enum([
    'entree', 'piscine', 'rooftop', 'restaurant', 'aquapark',
    'acces_plage', 'etage', 'cour_interieure', 'parking', 'jardin_chef', 'autre',
  ]).default('autre'),
  floorNumber: z.number().int().optional(),
  surfaceM2: z.string().optional(),
  plantPaletteNotes: z.string().optional(),
  lightingNotes: z.string().optional(),
  status: z.enum(['etude', 'realisation', 'entretien', 'termine']).default('etude'),
})

const saveSchema = z.object({ zones: z.array(zoneSchema) })

type Params = Promise<{ id: string }>

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  const zones = await getZonesByProject(id)
  return NextResponse.json(zones)
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  const zones = await saveProjectZones(id, parsed.data.zones, session.user.userId)
  return NextResponse.json(zones)
}
