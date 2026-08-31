import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  approveOfferVersion,
  canApproveBordereau,
  canEditBordereau,
  createOfferVersion,
  getOfferBordereau,
  rejectOfferVersion,
  reopenOfferBordereau,
  submitOfferVersion,
} from '@/lib/db/bordereau'
import { bordereauVersionActionSchema } from '@/lib/validation/bordereau'

type RouteParams = { params: Promise<{ id: string }> }

const READ_ROLES = ['admin', 'direction', 'etudes_chef']

/** The document's version history, newest first. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!READ_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const document = await getOfferBordereau(id)
  if (!document) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  return NextResponse.json({
    versions: document.versions,
    currentVersionNo: document.offer.currentVersionNo,
    approvedVersionId: document.offer.approvedVersionId,
    locked: document.locked,
  })
}

/**
 * Les cinq actes de version, chacun audité :
 *
 *   create  — fige un instantané du document tel qu'il est (rôles d'écriture)
 *   submit  — soumet cet instantané à la revue ; le document devient
 *             non modifiable tant que la revue n'est pas tranchée (rôles
 *             d'écriture)
 *   approve — approuve la version soumise et VERROUILLE le document
 *             (admin / direction)
 *   reject  — refuse la version soumise, motif obligatoire, et rend le
 *             document à l'édition (admin / direction)
 *   reopen  — déverrouille pour révision, en remplaçant la version approuvée
 *             sans la modifier ni la supprimer (admin / direction)
 *
 * Pourquoi `submit` existe
 * ------------------------
 * ISO 9001:2015 §7.5.2 b) demande « la revue ET l'approbation » : deux actes,
 * pas un. Sans soumission, rien n'attestait que quelqu'un avait regardé le
 * document avant de l'engager, et un refus ne laissait aucune trace. Le
 * trigger `offer_versions_guard` refuse `draft → approved` en base, donc le
 * raccourci n'est pas rattrapable en contournant cette route.
 *
 * L'approbation est plus étroite que l'édition à dessein : elle transforme un
 * brouillon en engagement commercial et en base du montant contractuel proposé
 * au projet.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const parsed = bordereauVersionActionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  const body = parsed.data

  // Figer et soumettre appartiennent à l'auteur du document.
  if (body.action === 'create' || body.action === 'submit') {
    if (!canEditBordereau(session.user.role))
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

    if (body.action === 'create') {
      const result = await createOfferVersion(
        id,
        { label: body.label ?? null, changeSummary: body.changeSummary },
        session.user.userId,
        session.user,
      )
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 })
      return NextResponse.json({ ...result, document: await getOfferBordereau(id) }, { status: 201 })
    }

    const result = await submitOfferVersion(id, body.versionId, session.user.userId, session.user)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
  }

  // Trancher la revue et rouvrir un engagement approuvé sont des décisions de
  // direction : le relecteur ne peut pas être n'importe quel rédacteur.
  if (!canApproveBordereau(session.user.role))
    return NextResponse.json(
      {
        error:
          "Seules la direction et l'administration peuvent approuver, refuser ou rouvrir un bordereau",
      },
      { status: 403 },
    )

  if (body.action === 'approve') {
    const result = await approveOfferVersion(id, body.versionId, session.user.userId, session.user)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
  }

  if (body.action === 'reject') {
    const result = await rejectOfferVersion(
      id,
      body.versionId,
      body.reason,
      session.user.userId,
      session.user,
    )
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
  }

  const result = await reopenOfferBordereau(id, body.reason, session.user.userId, session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
  return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
}
