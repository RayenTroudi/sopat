import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getActiveBordereauTemplate } from '@/lib/db/bordereau'

const READ_ROLES = ['admin', 'direction', 'etudes_chef']

/**
 * The blank FOR-CO-02 catalogue.
 *
 * A structure with no price column anywhere, by construction — cloning it into
 * an offer produces an empty priced document that a human fills.
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!READ_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const template = await getActiveBordereauTemplate()
  if (!template)
    return NextResponse.json(
      { error: 'Aucun modèle FOR-CO-02 chargé', template: null },
      { status: 404 },
    )

  return NextResponse.json(template)
}
