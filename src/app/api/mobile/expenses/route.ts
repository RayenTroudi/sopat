import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { extraExpenses, projects } from '@/db/schema'
import { requireMobileAuth, corsJson, corsPreflight } from '@/lib/mobile-auth'
import { getNextExpenseReference } from '@/lib/db/achat'
import { getProjectSpend, spendPercent } from '@/lib/db/project-spend'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

export function OPTIONS() {
  return corsPreflight()
}

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
  const guard = await requireMobileAuth(req, ['admin', 'realisation_chef', 'realisation_team'])
  if ('response' in guard) return guard.response
  const { user } = guard

  // Deux formats acceptés :
  //  - multipart/form-data : champ `data` (JSON) + champ `image` (photo du justificatif)
  //  - application/json : champs seuls, sans photo
  let body: unknown = null
  let imageFile: File | null = null
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    if (!form) {
      return corsJson({ error: 'Formulaire invalide' }, { status: 400 })
    }
    try {
      body = JSON.parse(String(form.get('data') ?? 'null'))
    } catch {
      return corsJson({ error: 'Champ data invalide' }, { status: 400 })
    }
    const file = form.get('image')
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return corsJson({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 413 })
      }
      if (!file.type.startsWith('image/')) {
        return corsJson({ error: 'Le fichier doit être une image' }, { status: 415 })
      }
      imageFile = file
    }
  } else {
    body = await req.json().catch(() => null)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return corsJson(
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
      return corsJson({ error: 'Projet introuvable' }, { status: 404 })
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
      return corsJson(
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
      createdBy: user.userId,
    })
    .returning({ id: extraExpenses.id, reference: extraExpenses.reference })

  // Consommation budget actuelle du projet (règle canonique) pour
  // affichage immédiat dans l'app — la dépense créée reste `pending` et ne
  // compte pas encore dans ce total.
  let budget: {
    approvedBudget: number | null
    spent: number
    pendingTotal: number
    percentSpent: number | null
  } | null = null

  if (data.projectId) {
    const [proj] = await db
      .select({ approvedBudget: projects.approvedBudget })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)

    // Même règle que la fiche projet, la liste, le tableau de bord et les
    // alertes : définition unique dans project-spend.ts. Cette route sommait
    // les BC et les dépenses approuvées sans les achats FOR-AC-10, et pouvait
    // donc renvoyer à l'app un pourcentage inférieur à celui du back-office.
    const spend = await getProjectSpend(data.projectId)
    const approved = proj?.approvedBudget ? parseFloat(proj.approvedBudget) : null
    budget = {
      approvedBudget: approved,
      spent: spend.spent,
      pendingTotal: spend.pendingTotal,
      percentSpent: spendPercent(spend.spent, approved),
    }
  }

  // La dépense reste `pending` — elle ne bouge pas la consommation, mais elle
  // doit apparaître tout de suite dans l'onglet Achats du projet (liste +
  // total « en attente »).
  if (data.projectId) revalidatePath(`/admin/projects/${data.projectId}`)

  return corsJson(
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
