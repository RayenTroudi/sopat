import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { commercialOffers, offerLineItems } from '@/db/schema'
import { and, count, eq, isNull } from 'drizzle-orm'
import {
  assertNotLocked,
  canEditBordereau,
  cloneTemplateIntoOffer,
  getActiveBordereauTemplate,
  getOfferBordereau,
} from '@/lib/db/bordereau'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * Starts an offer's bordereau from the blank FOR-CO-02 catalogue.
 *
 * The clone carries the structure, the designations, the units and the
 * specifications — and NO figures. The template's own placeholder quantities
 * are deliberately left behind: copying them would hand the offer a quantity
 * nobody entered.
 *
 * Refused over an existing bordereau unless `confirmReplace` is sent, and
 * always refused on an approved document.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canEditBordereau(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const [offer] = await db
    .select({ id: commercialOffers.id })
    .from(commercialOffers)
    .where(and(eq(commercialOffers.id, id), isNull(commercialOffers.deletedAt)))
    .limit(1)
  if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  const locked = await assertNotLocked(id)
  if (locked) return NextResponse.json({ error: locked }, { status: 409 })

  const body = (await req.json().catch(() => ({}))) as { confirmReplace?: boolean }

  const [{ existingLineCount }] = await db
    .select({ existingLineCount: count() })
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, id))

  if (Number(existingLineCount) > 0 && body.confirmReplace !== true)
    return NextResponse.json(
      {
        error:
          `Ce bordereau contient déjà ${existingLineCount} ligne(s). ` +
          'Partir du modèle remplace le document entier : confirmez explicitement pour continuer.',
        existingLineCount: Number(existingLineCount),
      },
      { status: 409 },
    )

  const template = await getActiveBordereauTemplate()
  if (!template)
    return NextResponse.json(
      { error: 'Aucun modèle FOR-CO-02 chargé. Importez le formulaire officiel au préalable.' },
      { status: 404 },
    )

  const result = await cloneTemplateIntoOffer(id, template.id, session.user.userId, session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json({
    ...result,
    document: await getOfferBordereau(id),
  })
}
