import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { extraExpenses, projects, purchaseOrders } from '@/db/schema'
import { requireApiRole } from '@/lib/auth'
import { getNextExpenseReference } from '@/lib/db/achat'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

// Création d'une dépense extra depuis l'app mobile (scan OCR).
// La dépense entre dans le circuit existant : statut `pending`, validation
// par la direction, puis prise en compte dans la consommation budget et
// les alertes 90 % / dépassement (voir decideExtraExpense + notifications).
//
// Traçabilité IA (CLAUDE.md) : on stocke le texte OCR brut et les valeurs
// suggérées (`ocr_suggested`) à côté des valeurs validées par l'utilisateur.

const createSchema = z.object({
  projectId: z.string().uuid().optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)'),
  category: z.string().max(100).optional(),
  description: z.string().min(1, 'Description requise'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/, 'Montant invalide')
    .refine((v) => parseFloat(v) > 0, 'Le montant doit être positif'),
  currency: z.string().max(10).default('TND'),
  justification: z.string().optional(),
  ocrRawText: z.string().max(20000).optional(),
  ocrSuggested: z
    .object({
      amount: z.string().optional(),
      expenseDate: z.string().optional(),
      description: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const guard = await requireApiRole(['admin', 'direction', 'realisation_chef', 'etudes_chef'])
  if ('response' in guard) return guard.response
  const { session } = guard

  // Deux formats acceptés :
  //  - multipart/form-data : champ `data` (JSON) + champ `image` (photo du justificatif)
  //  - application/json : champs seuls, sans photo
  let body: unknown = null
  let imageFile: File | null = null
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'Formulaire invalide' }, { status: 400 })
    }
    try {
      body = JSON.parse(String(form.get('data') ?? 'null'))
    } catch {
      return NextResponse.json({ error: 'Champ data invalide' }, { status: 400 })
    }
    const file = form.get('image')
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 413 })
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 415 })
      }
      imageFile = file
    }
  } else {
    body = await req.json().catch(() => null)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
      { status: 400 },
    )
  }
  const data = parsed.data

  if (data.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, data.projectId), isNull(projects.deletedAt)))
      .limit(1)
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }
  }

  // Photo du justificatif → Cloudinary (avant l'insert pour que l'URL
  // soit stockée avec la dépense).
  let receiptImageUrl: string | null = null
  if (imageFile) {
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const uploaded = await uploadImageToCloudinary(buffer, { folder: 'sopat/expenses' })
      receiptImageUrl = uploaded.secureUrl
    } catch (err) {
      console.error('[mobile/expenses] cloudinary upload failed:', err)
      return NextResponse.json(
        { error: 'Échec de l’enregistrement de la photo. Réessayez.' },
        { status: 502 },
      )
    }
  }

  const reference = await getNextExpenseReference()
  const [row] = await db
    .insert(extraExpenses)
    .values({
      reference,
      projectId: data.projectId || null,
      expenseDate: data.expenseDate,
      category: data.category,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      justification: data.justification || 'Dépense scannée via l’application mobile (OCR)',
      source: 'mobile_ocr',
      ocrRawText: data.ocrRawText,
      ocrSuggested: data.ocrSuggested,
      receiptImageUrl,
      createdBy: session.user.userId,
    })
    .returning({ id: extraExpenses.id, reference: extraExpenses.reference })

  // Consommation budget actuelle du projet (BC + dépenses approuvées) pour
  // affichage immédiat dans l'app — la dépense créée reste `pending` et ne
  // compte pas encore dans ce total.
  let budget: {
    approvedBudget: number | null
    spent: number
    percentSpent: number | null
  } | null = null

  if (data.projectId) {
    const [proj] = await db
      .select({ approvedBudget: projects.approvedBudget })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)

    const [poRow] = await db
      .select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, data.projectId))

    const [exRow] = await db
      .select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
      .from(extraExpenses)
      .where(
        and(
          eq(extraExpenses.projectId, data.projectId),
          eq(extraExpenses.status, 'approved'),
          isNull(extraExpenses.deletedAt),
        ),
      )

    const approved = proj?.approvedBudget ? parseFloat(proj.approvedBudget) : null
    const spent = parseFloat(poRow?.total ?? '0') + parseFloat(exRow?.total ?? '0')
    budget = {
      approvedBudget: approved,
      spent,
      percentSpent: approved && approved > 0 ? Math.round((spent / approved) * 1000) / 10 : null,
    }
  }

  return NextResponse.json(
    {
      success: true,
      id: row.id,
      reference: row.reference,
      status: 'pending',
      budget,
    },
    { status: 201 },
  )
}
