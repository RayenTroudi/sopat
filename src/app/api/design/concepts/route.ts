import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchConcepts, getConceptProjectAssets } from '@/lib/db/design-concepts'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const q           = url.searchParams.get('q') ?? undefined
  const vocabulary  = url.searchParams.get('vocabulary') ?? undefined
  const palette     = url.searchParams.get('palette') ?? undefined
  const projectType = url.searchParams.get('projectType') ?? undefined
  const country     = url.searchParams.get('country') ?? undefined
  const detailId    = url.searchParams.get('projectAssets')

  if (detailId) {
    const assets = await getConceptProjectAssets(detailId)
    return NextResponse.json({ assets })
  }

  const concepts = await searchConcepts({ q, vocabulary, palette, projectType, country })
  return NextResponse.json({ concepts })
}
