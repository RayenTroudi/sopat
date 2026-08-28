import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import {
  canEditSupplyRegister,
  ensureSupplyRegister,
  getSupplyRegister,
  replaceSupplyItems,
} from '@/lib/db/supply'
import {
  IMPORT_MAX_BYTES,
  parseSupplyWorkbook,
  toInputRow,
  type ImportPreview,
} from '@/lib/import/supply-import'
import { syncBudgetConsumption } from '@/lib/budget-consumption'

type RouteParams = { params: Promise<{ id: string }> }

/** Accepted upload types — a .xlsx, nothing else. */
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * FOR-AC-10 import — always a two-step flow.
 *
 * `mode=preview` (the default) parses and returns what WOULD be written,
 * touching nothing. `mode=commit` writes, and only under two conditions the
 * caller must satisfy deliberately:
 *
 *  - the parse produced no blocking error, and
 *  - the register is empty, unless `confirmReplace=true` is also sent.
 *
 * The workbook has no stable row identifiers and its project reference uses a
 * different scheme from the application, so an import can never be a merge —
 * it replaces the register wholesale. Refusing to do that silently over
 * existing lines is the point of the confirmation flag.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  // Import writes procurement figures, so it takes the write role even in
  // preview mode: the preview reveals the supplier register to the caller.
  if (!canEditSupplyRegister(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Envoi multipart attendu' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  if (file.size === 0)
    return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
  if (file.size > IMPORT_MAX_BYTES)
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${IMPORT_MAX_BYTES / 1024 / 1024} Mo)` },
      { status: 413 }
    )
  if (file.type && file.type !== XLSX_MIME && !file.name.toLowerCase().endsWith('.xlsx'))
    return NextResponse.json({ error: 'Un classeur .xlsx est attendu' }, { status: 415 })

  const mode = form.get('mode') === 'commit' ? 'commit' : 'preview'
  const confirmReplace = form.get('confirmReplace') === 'true'

  let preview: ImportPreview
  try {
    preview = await parseSupplyWorkbook(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Lecture du classeur impossible' }, { status: 400 })
  }

  const existing = await getSupplyRegister(id)
  const existingItemCount = existing?.items.length ?? 0

  // The caller sees, in both modes, exactly what committing would overwrite.
  const context = {
    mode,
    existingItemCount,
    willReplace: existingItemCount > 0,
    projectReference: existing?.project.reference ?? access.project.reference,
  }

  if (mode === 'preview') return NextResponse.json({ ...preview, ...context, committed: false })

  if (!preview.ok)
    return NextResponse.json(
      { ...preview, ...context, committed: false, error: 'Le fichier comporte des erreurs bloquantes' },
      { status: 422 }
    )

  if (existingItemCount > 0 && !confirmReplace)
    return NextResponse.json(
      {
        ...preview,
        ...context,
        committed: false,
        error:
          `Ce registre contient déjà ${existingItemCount} ligne(s). ` +
          "L'import remplace le registre entier : confirmez explicitement pour continuer.",
      },
      { status: 409 }
    )

  const registerId = await ensureSupplyRegister(id, session.user.userId, session.user)
  // One transaction, with its audit entry — a partial import is never left behind.
  await replaceSupplyItems(
    registerId,
    preview.lines.map(toInputRow),
    session.user.userId,
    session.user
  )

  // An import rewrites the purchase lines, so budget consumption moves with it.
  await syncBudgetConsumption(id, session.user.userId)

  return NextResponse.json({
    ...preview,
    ...context,
    committed: true,
    register: await getSupplyRegister(id),
  })
}
