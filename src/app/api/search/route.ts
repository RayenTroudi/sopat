import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchByDmsCode } from '@/lib/dms/search'

export const dynamic = 'force-dynamic'

// Recherche globale par code ISO (dms_document_code) pour la barre de
// recherche de l'en-tête admin. Les résultats renvoient déjà leur URL de
// destination ; la page cible applique elle-même ses propres contrôles d'accès.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const results = await searchByDmsCode(q)
  return NextResponse.json(results)
}
