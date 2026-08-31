import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { commercialOffers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import {
  assertEditable,
  canEditBordereau,
  createBordereauLine,
  deleteBordereauLine,
  getOfferBordereau,
  moveBordereauLine,
  updateBordereauLine,
} from '@/lib/db/bordereau'
import {
  bordereauLineCreateSchema,
  bordereauLineMoveSchema,
  bordereauLineUpdateSchema,
} from '@/lib/validation/bordereau'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * FOR-CO-02 — édition ligne à ligne, à l'intérieur de l'ERP.
 *
 * Pourquoi une route distincte du PUT « document entier »
 * ------------------------------------------------------
 * Le PUT remplace l'arbre : c'est ce qu'il faut pour un import, et exactement
 * ce qu'il ne faut pas pour corriger un prix unitaire. Le remplacement
 * régénère TOUS les identifiants de ligne, donc toute référence posée sur une
 * ligne serait rompue par une simple correction de libellé, et le journal
 * d'audit ne dirait que « le document a changé » là où il faut lire
 * « P.U. palmier : 450 → 480 ».
 *
 * Trois garanties portées ici, pas dans la signature des fonctions :
 *
 * 1. **Portée.** L'identifiant de l'offre est dans le WHERE de chaque écriture.
 *    Une ligne d'une autre offre est inatteignable, même en forgeant le corps.
 * 2. **Verrou.** `assertEditable` refuse un document approuvé ET un document
 *    dont une version est en revue.
 * 3. **Droits.** Le rôle d'écriture du module offres, inchangé. Cette route
 *    n'accorde à personne un droit qu'il n'avait pas.
 *
 * Chaque opération renvoie le document recalculé : le client n'a pas à deviner
 * les nouveaux sous-totaux, et ne peut donc pas afficher un total qui diverge
 * de la base.
 */

/** Vérifications communes : session, rôle, existence de l'offre, verrou. */
type Guard =
  | { ok: false; response: NextResponse }
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof auth>>> }

async function guard(offerId: string): Promise<Guard> {
  const deny = (error: string, status: number): Guard => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  })

  const session = await auth()
  if (!session) return deny('Non autorisé', 401)
  if (!canEditBordereau(session.user.role)) return deny('Droits insuffisants', 403)

  const [offer] = await db
    .select({ id: commercialOffers.id })
    .from(commercialOffers)
    .where(and(eq(commercialOffers.id, offerId), isNull(commercialOffers.deletedAt)))
    .limit(1)
  if (!offer) return deny('Offre introuvable', 404)

  const locked = await assertEditable(offerId)
  if (locked) return deny(locked, 409)

  return { ok: true, session }
}

/** Ajoute une ligne : section, catégorie, poste chiffrable ou spécification. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const g = await guard(id)
  if (!g.ok) return g.response

  const parsed = bordereauLineCreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  const result = await createBordereauLine(
    id,
    parsed.data,
    g.session.user.userId,
    g.session.user,
  )
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })

  return NextResponse.json(
    { lineId: result.lineId, document: await getOfferBordereau(id) },
    { status: 201 },
  )
}

/**
 * Corrige une ligne, ou la déplace.
 *
 * `?lineId=…` désigne la ligne ; `?op=move` bascule sur le déplacement, dont le
 * corps est un couple (parent, rang) et non une liste de champs. Deux verbes
 * distincts sur la même route parce que ce sont deux modifications de la même
 * ressource, journalisées différemment : `updated` porte l'avant/après des
 * valeurs, `moved` porte l'avant/après du rattachement.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const g = await guard(id)
  if (!g.ok) return g.response

  const lineId = req.nextUrl.searchParams.get('lineId')
  if (!lineId) return NextResponse.json({ error: 'Ligne non désignée' }, { status: 400 })

  const body = await req.json().catch(() => null)

  if (req.nextUrl.searchParams.get('op') === 'move') {
    const parsed = bordereauLineMoveSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      )
    const moved = await moveBordereauLine(
      id,
      lineId,
      { parentId: parsed.data.parentId, beforeLineId: parsed.data.beforeLineId ?? null },
      g.session.user,
    )
    if (!moved.success) return NextResponse.json({ error: moved.error }, { status: 409 })
    return NextResponse.json({ document: await getOfferBordereau(id) })
  }

  const parsed = bordereauLineUpdateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  const result = await updateBordereauLine(id, lineId, parsed.data, g.session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })

  return NextResponse.json({ changed: result.changed, document: await getOfferBordereau(id) })
}

/**
 * Supprime une ligne et sa descendance.
 *
 * Suppression physique assumée : une ligne de bordereau en brouillon n'est pas
 * encore un enregistrement qualité, et un « supprimé logiquement » dans l'arbre
 * imprimé imposerait un filtre à chaque total, chaque export et chaque
 * récapitulatif. Ce qui est conservé, c'est la trace — le journal garde la
 * ligne avec ses chiffres, et une version figée la garde en entier.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const g = await guard(id)
  if (!g.ok) return g.response

  const lineId = req.nextUrl.searchParams.get('lineId')
  if (!lineId) return NextResponse.json({ error: 'Ligne non désignée' }, { status: 400 })

  const result = await deleteBordereauLine(id, lineId, g.session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })

  return NextResponse.json({
    directChildrenRemoved: result.directChildrenRemoved,
    document: await getOfferBordereau(id),
  })
}
