import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { commercialOffers, offerLineItems } from '@/db/schema'
import { and, count, eq, isNull } from 'drizzle-orm'
import {
  applyImportToOffer,
  assertNotLocked,
  canEditBordereau,
  findOfferImport,
  getOfferBordereau,
} from '@/lib/db/bordereau'
import {
  hashWorkbook,
  IMPORT_MAX_BYTES,
  parseBordereauWorkbook,
  type BordereauImportPreview,
} from '@/lib/import/bordereau-import'

type RouteParams = { params: Promise<{ id: string }> }

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLTX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.template'

/**
 * FOR-CO-02 import — always a two-step flow.
 *
 * `mode=preview` (the default) parses and returns what WOULD be written,
 * touching nothing. `mode=commit` writes, and only under three conditions the
 * caller must satisfy deliberately:
 *
 *  - the parse produced no blocking error;
 *  - the document is not approved and locked; and
 *  - the bordereau is empty, unless `confirmReplace=true` is also sent.
 *
 * The workbook has no stable row identifiers and its « Référence projet » uses
 * a different scheme from the application, so an import can never be a merge —
 * it replaces the document wholesale. Refusing to do that silently over an
 * existing bordereau is the point of the confirmation flag.
 *
 * **Idempotency.** Every committed import records the SHA-256 of the uploaded
 * bytes. Re-uploading the same file into the same offer is refused with the
 * date and the author of the earlier import, so the same workbook can never
 * produce two commercial documents by accident.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  // The import writes commercial figures, so it takes the write role even in
  // preview mode: the preview reveals the plant and material registers.
  if (!canEditBordereau(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const [offer] = await db
    .select({ id: commercialOffers.id, reference: commercialOffers.reference })
    .from(commercialOffers)
    .where(and(eq(commercialOffers.id, id), isNull(commercialOffers.deletedAt)))
    .limit(1)
  if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Envoi multipart attendu' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
  if (file.size > IMPORT_MAX_BYTES)
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${IMPORT_MAX_BYTES / 1024 / 1024} Mo)` },
      { status: 413 },
    )
  const name = file.name.toLowerCase()
  if (
    file.type &&
    file.type !== XLSX_MIME &&
    file.type !== XLTX_MIME &&
    !name.endsWith('.xlsx') &&
    !name.endsWith('.xltx')
  ) {
    return NextResponse.json({ error: 'Un classeur .xlsx ou .xltx est attendu' }, { status: 415 })
  }

  const mode = form.get('mode') === 'commit' ? 'commit' : 'preview'
  const confirmReplace = form.get('confirmReplace') === 'true'

  const bytes = await file.arrayBuffer()
  const fileHash = hashWorkbook(bytes)

  let preview: BordereauImportPreview
  try {
    preview = await parseBordereauWorkbook(bytes)
  } catch {
    return NextResponse.json({ error: 'Lecture du classeur impossible' }, { status: 400 })
  }

  const [{ existingLineCount }] = await db
    .select({ existingLineCount: count() })
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, id))

  const alreadyImported = await findOfferImport(id, fileHash)

  // The caller sees, in both modes, exactly what committing would overwrite.
  const context = {
    mode,
    fileHash,
    existingLineCount: Number(existingLineCount),
    willReplace: Number(existingLineCount) > 0,
    offerReference: offer.reference,
    alreadyImported,
  }

  if (mode === 'preview')
    return NextResponse.json({ ...preview, ...context, committed: false })

  const locked = await assertNotLocked(id)
  if (locked)
    return NextResponse.json({ ...preview, ...context, committed: false, error: locked }, { status: 409 })

  if (!preview.ok)
    return NextResponse.json(
      { ...preview, ...context, committed: false, error: 'Le fichier comporte des erreurs bloquantes' },
      { status: 422 },
    )

  if (alreadyImported)
    return NextResponse.json(
      {
        ...preview,
        ...context,
        committed: false,
        error:
          `Ce fichier a déjà été importé le ` +
          `${new Date(alreadyImported.importedAt).toLocaleDateString('fr-FR')} ` +
          `par ${alreadyImported.importedByName ?? 'un utilisateur'}. ` +
          'Aucun doublon n\'a été créé.',
      },
      { status: 409 },
    )

  if (Number(existingLineCount) > 0 && !confirmReplace)
    return NextResponse.json(
      {
        ...preview,
        ...context,
        committed: false,
        error:
          `Ce bordereau contient déjà ${existingLineCount} ligne(s). ` +
          "L'import remplace le document entier : confirmez explicitement pour continuer.",
      },
      { status: 409 },
    )

  await applyImportToOffer(
    id,
    preview,
    { name: file.name, hash: fileHash, byteSize: file.size },
    session.user.userId,
    session.user,
  )

  return NextResponse.json({
    ...preview,
    ...context,
    committed: true,
    document: await getOfferBordereau(id),
  })
}
