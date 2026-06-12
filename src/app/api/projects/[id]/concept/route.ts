import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { updateProjectConcept, getProjectConcept } from '@/lib/db/design-concepts'
import { DESIGN_VOCABULARY_OPTIONS, PLANT_PALETTE_OPTIONS } from '@/lib/design-vocab'

type RouteParams = { params: Promise<{ id: string }> }

const vocabSet = new Set<string>(DESIGN_VOCABULARY_OPTIONS)
const paletteSet = new Set<string>(PLANT_PALETTE_OPTIONS)

const schema = z.object({
  conceptTitle:           z.string().trim().max(255).optional().nullable(),
  conceptDescription:     z.string().trim().max(5000).optional().nullable(),
  designVocabulary:       z.array(z.string().refine((v) => vocabSet.has(v),   'Vocabulaire invalide')).max(20).optional(),
  plantPalettePhilosophy: z.array(z.string().refine((v) => paletteSet.has(v), 'Palette invalide')).max(20).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Champs invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const before = await getProjectConcept(id)
  const ok = await updateProjectConcept(id, parsed.data)
  if (!ok) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 400 })

  await logActivity({
    projectId:    id,
    actorId:      session.user.userId,
    actorName:    session.user.name ?? 'Utilisateur',
    action:       'concept_updated',
    previousState: before ? { ...before } : undefined,
    newState:     parsed.data as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true })
}
