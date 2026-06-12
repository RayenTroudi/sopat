import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import {
  listDesignTemplates,
  createDesignTemplate,
} from '@/lib/db/design-concepts'
import { DESIGN_VOCABULARY_OPTIONS, PLANT_PALETTE_OPTIONS, PROJECT_TYPE_VALUES } from '@/lib/design-vocab'

const vocabSet     = new Set<string>(DESIGN_VOCABULARY_OPTIONS)
const paletteSet   = new Set<string>(PLANT_PALETTE_OPTIONS)
const projTypeSet  = new Set<string>(PROJECT_TYPE_VALUES)

const createSchema = z.object({
  templateName:                z.string().trim().min(1).max(255),
  projectTypeContext:          z.array(z.string().refine((v) => projTypeSet.has(v), 'Type invalide')).max(10).default([]),
  conceptDescriptionTemplate:  z.string().trim().min(1).max(5000),
  recommendedVocabulary:       z.array(z.string().refine((v) => vocabSet.has(v), 'Vocabulaire invalide')).max(20).default([]),
  recommendedPalette:          z.array(z.string().refine((v) => paletteSet.has(v), 'Palette invalide')).max(20).default([]),
  exampleProjectIds:           z.array(z.string().uuid()).max(50).default([]),
  referenceImageCloudinaryIds: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  isPublished:                 z.boolean().default(false),
})

function canManage(role: string) {
  return role === 'admin' || role === 'direction' || role === 'etudes_chef'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const publishedOnly = url.searchParams.get('publishedOnly') === '1'
  const projectType   = url.searchParams.get('projectType') ?? undefined

  // Non-managers always see published-only.
  const effectivePublishedOnly = publishedOnly || !canManage(session.user.role)

  const templates = await listDesignTemplates({ publishedOnly: effectivePublishedOnly, projectType })
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canManage(session.user.role)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Champs invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const id = await createDesignTemplate({ ...parsed.data, createdBy: session.user.userId })
  return NextResponse.json({ id }, { status: 201 })
}
