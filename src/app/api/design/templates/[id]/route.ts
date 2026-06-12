import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import {
  updateDesignTemplate,
  deleteDesignTemplate,
  getDesignTemplate,
} from '@/lib/db/design-concepts'
import { DESIGN_VOCABULARY_OPTIONS, PLANT_PALETTE_OPTIONS, PROJECT_TYPE_VALUES } from '@/lib/design-vocab'

type RouteParams = { params: Promise<{ id: string }> }

const vocabSet    = new Set<string>(DESIGN_VOCABULARY_OPTIONS)
const paletteSet  = new Set<string>(PLANT_PALETTE_OPTIONS)
const projTypeSet = new Set<string>(PROJECT_TYPE_VALUES)

const patchSchema = z.object({
  templateName:                z.string().trim().min(1).max(255).optional(),
  projectTypeContext:          z.array(z.string().refine((v) => projTypeSet.has(v), 'Type invalide')).max(10).optional(),
  conceptDescriptionTemplate:  z.string().trim().min(1).max(5000).optional(),
  recommendedVocabulary:       z.array(z.string().refine((v) => vocabSet.has(v),   'Vocabulaire invalide')).max(20).optional(),
  recommendedPalette:          z.array(z.string().refine((v) => paletteSet.has(v), 'Palette invalide')).max(20).optional(),
  exampleProjectIds:           z.array(z.string().uuid()).max(50).optional(),
  referenceImageCloudinaryIds: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  isPublished:                 z.boolean().optional(),
})

function canManage(role: string) {
  return role === 'admin' || role === 'direction' || role === 'etudes_chef'
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const template = await getDesignTemplate(id)
  if (!template) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (!template.isPublished && !canManage(session.user.role)) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canManage(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Champs invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const ok = await updateDesignTemplate(id, parsed.data)
  if (!ok) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canManage(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { id } = await params
  const ok = await deleteDesignTemplate(id)
  if (!ok) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
