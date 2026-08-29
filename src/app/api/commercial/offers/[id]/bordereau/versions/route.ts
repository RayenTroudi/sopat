import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  approveOfferVersion,
  canApproveBordereau,
  canEditBordereau,
  createOfferVersion,
  getOfferBordereau,
  reopenOfferBordereau,
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
 * The three version acts, each audited:
 *
 *   create  — snapshots the document as it stands (write roles)
 *   approve — freezes that snapshot and LOCKS the document (admin/direction)
 *   reopen  — unlocks for revision, superseding the approved version without
 *             altering or deleting it (admin/direction)
 *
 * Approval is narrower than editing on purpose: it turns a draft into a
 * commercial commitment and the figure a project's contract amount is then
 * proposed from. The database trigger `offer_versions_guard` enforces the
 * immutability of an approved snapshot independently of this route.
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

  if (body.action === 'create') {
    if (!canEditBordereau(session.user.role))
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    const result = await createOfferVersion(
      id,
      { label: body.label ?? null, changeSummary: body.changeSummary },
      session.user.userId,
      session.user,
    )
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 })
    return NextResponse.json({ ...result, document: await getOfferBordereau(id) }, { status: 201 })
  }

  if (!canApproveBordereau(session.user.role))
    return NextResponse.json(
      { error: "Seules la direction et l'administration peuvent approuver ou rouvrir un bordereau" },
      { status: 403 },
    )

  if (body.action === 'approve') {
    const result = await approveOfferVersion(id, body.versionId, session.user.userId, session.user)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
  }

  const result = await reopenOfferBordereau(id, body.reason, session.user.userId, session.user)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
  return NextResponse.json({ ...result, document: await getOfferBordereau(id) })
}
