import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { generateConceptSuggestion } from '@/lib/db/design-concepts'
import { DESIGN_VOCABULARY_OPTIONS, PLANT_PALETTE_OPTIONS, PROJECT_TYPE_VALUES } from '@/lib/design-vocab'

const vocabSet    = new Set<string>(DESIGN_VOCABULARY_OPTIONS)
const paletteSet  = new Set<string>(PLANT_PALETTE_OPTIONS)
const projTypeSet = new Set<string>(PROJECT_TYPE_VALUES)

const schema = z.object({
  projectType:            z.string().refine((v) => projTypeSet.has(v), 'Type invalide'),
  designVocabulary:       z.array(z.string().refine((v) => vocabSet.has(v),   'Vocabulaire invalide')).max(20).default([]),
  plantPalettePhilosophy: z.array(z.string().refine((v) => paletteSet.has(v), 'Palette invalide')).max(20).default([]),
})

// Stubbed AI helper — returns a deterministic French draft.
// Will be wired to Anthropic API in a follow-up once provider choice is finalized.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Champs invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const suggestion = generateConceptSuggestion(parsed.data)
  return NextResponse.json({ suggestion, model: 'stub', note: 'Brouillon généré localement — à finaliser par un humain.' })
}
