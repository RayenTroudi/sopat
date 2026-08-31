import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createTemplateFromPreview,
  findTemplateImport,
  getActiveBordereauTemplate,
} from '@/lib/db/bordereau'
import {
  hashWorkbook,
  IMPORT_MAX_BYTES,
  parseBordereauWorkbook,
  type BordereauImportPreview,
} from '@/lib/import/bordereau-import'
import { archiveSourceWorkbook } from '@/lib/bordereau-archive'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLTX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.template'

/**
 * Seeds the blank FOR-CO-02 catalogue from the official `.xltx`.
 *
 * Separate from the offer import because the two jobs are different: this one
 * loads a STRUCTURE — sections, categories, the 266 designations, their units
 * and their specifications — and it cannot load money, because
 * `bordereau_template_lines` has no price column at all.
 *
 * Restricted to admin and direction: the catalogue is the shape every future
 * quotation starts from, so replacing it is a controlled-document act.
 *
 * Preview-then-commit, and idempotent on the file's SHA-256: the same workbook
 * can never produce two template revisions.
 *
 * Le classeur officiel est archivé comme celui d'un bordereau chiffré, et pour
 * une raison distincte : il ne prouve pas un montant, il prouve QUELLE RÉVISION
 * du formulaire la structure vient. Un modèle dont on ne peut plus produire le
 * formulaire d'origine ne permet pas de justifier la forme des devis qui en
 * descendent. L'archivage est donc bloquant ici aussi.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!['admin', 'direction'].includes(session.user.role))
    return NextResponse.json(
      { error: "Seules la direction et l'administration peuvent charger le modèle FOR-CO-02" },
      { status: 403 },
    )

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
  const bytes = await file.arrayBuffer()
  const fileHash = hashWorkbook(bytes)

  let preview: BordereauImportPreview
  try {
    preview = await parseBordereauWorkbook(bytes)
  } catch {
    return NextResponse.json({ error: 'Lecture du classeur impossible' }, { status: 400 })
  }

  const current = await getActiveBordereauTemplate()
  const alreadyImported = await findTemplateImport(fileHash)

  const context = {
    mode,
    fileHash,
    currentRevision: current?.revision ?? null,
    currentLineCount: current?.stats.lineCount ?? null,
    alreadyImported,
  }

  if (mode === 'preview')
    return NextResponse.json({ ...preview, ...context, committed: false })

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
          `Ce fichier a déjà été chargé le ` +
          `${new Date(alreadyImported.importedAt).toLocaleDateString('fr-FR')} ` +
          `par ${alreadyImported.importedByName ?? 'un utilisateur'} ; ` +
          "aucune nouvelle révision du modèle n'a été créée.",
      },
      { status: 409 },
    )

  const archive = await archiveSourceWorkbook(bytes, fileHash)
  if (!archive.ok)
    return NextResponse.json(
      { ...preview, ...context, committed: false, error: archive.error },
      { status: 503 },
    )

  const result = await createTemplateFromPreview(
    preview,
    {
      name: file.name,
      hash: fileHash,
      byteSize: file.size,
      sourceFile: archive.source,
      archiveNote: archive.note,
    },
    session.user.userId,
    session.user,
  )

  return NextResponse.json({
    ...preview,
    ...context,
    committed: true,
    sourceFileArchived: archive.source !== null,
    ...result,
    template: await getActiveBordereauTemplate(),
  })
}
