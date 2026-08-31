import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { commercialOffers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import {
  assertEditable,
  canEditBordereau,
  getOfferBordereau,
  replaceOfferBordereau,
  syncOfferTotals,
} from '@/lib/db/bordereau'
import { bordereauHeaderSchema, bordereauReplaceSchema } from '@/lib/validation/bordereau'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * Read access matches the offer module's: FOR-CO-02 is a priced commercial
 * document, not something every account may browse.
 */
const READ_ROLES = ['admin', 'direction', 'etudes_chef']

/** FOR-CO-02 — the whole document, with every derived figure recomputed. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!READ_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const document = await getOfferBordereau(id)
  if (!document) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  return NextResponse.json(document)
}

/**
 * Replaces the whole bordereau.
 *
 * Whole-document, like FOR-AC-10's grid: a partial diff would leave the
 * positions of untouched rows ambiguous, and a bordereau is read and signed as
 * one thing. An approved document is refused — it is evidence, and reopening
 * it is a separate, audited act.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
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

  const locked = await assertEditable(id)
  if (locked) return NextResponse.json({ error: locked }, { status: 409 })

  const parsed = bordereauReplaceSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  await replaceOfferBordereau(id, parsed.data, session.user.userId, session.user)

  return NextResponse.json(await getOfferBordereau(id))
}

/**
 * Updates the header fields the form carries — date, localisation, maître
 * d'ouvrage, validity and the VAT rate.
 *
 * `clientId` and `projectId` are NOT settable here: they are the offer's own
 * relations, changed on the offer, and the bordereau never rebinds them.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!canEditBordereau(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const locked = await assertEditable(id)
  if (locked) return NextResponse.json({ error: locked }, { status: 409 })

  const parsed = bordereauHeaderSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  const data = parsed.data
  // Named explicitly: a server route is callable directly, so the TypeScript
  // signature is not a barrier. reference, createdBy and the version columns
  // stay out of reach.
  await db
    .update(commercialOffers)
    .set({
      ...(data.offerDate !== undefined && { offerDate: data.offerDate }),
      ...(data.siteLocation !== undefined && { siteLocation: data.siteLocation }),
      ...(data.maitreDouvrage !== undefined && { maitreDouvrage: data.maitreDouvrage }),
      ...(data.projectReferenceText !== undefined && { projectReferenceText: data.projectReferenceText }),
      ...(data.validityDays !== undefined && { validityDays: data.validityDays }),
      ...(data.vatRate !== undefined && { vatRate: data.vatRate.toFixed(4) }),
      updatedAt: new Date(),
    })
    .where(eq(commercialOffers.id, id))

  // The VAT rate moves TTC and every milestone amount but no line, so only the
  // header figures are refreshed — rewriting the tree would be a large no-op.
  if (data.vatRate !== undefined) await syncOfferTotals(db, id)

  return NextResponse.json(await getOfferBordereau(id))
}
