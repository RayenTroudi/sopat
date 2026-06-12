import { db } from '../../../db/index'
import {
  designTemplates,
  projects,
  cloudinaryAssets,
  users,
} from '../../../db/schema'
import { eq, and, isNull, desc, sql, ilike, or, inArray } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DesignTemplateRow = {
  id:                          string
  templateName:                string
  projectTypeContext:          string[]
  conceptDescriptionTemplate:  string
  recommendedVocabulary:       string[]
  recommendedPalette:          string[]
  exampleProjectIds:           string[]
  referenceImageCloudinaryIds: string[]
  createdBy:                   string
  createdByName:               string | null
  isPublished:                 boolean
  createdAt:                   Date
  updatedAt:                   Date
}

export type CreateTemplateInput = {
  templateName:                string
  projectTypeContext:          string[]
  conceptDescriptionTemplate:  string
  recommendedVocabulary:       string[]
  recommendedPalette:          string[]
  exampleProjectIds:           string[]
  referenceImageCloudinaryIds: string[]
  isPublished:                 boolean
  createdBy:                   string
}

export type UpdateTemplateInput = Partial<Omit<CreateTemplateInput, 'createdBy'>>

export type ConceptCardRow = {
  projectId:              string
  projectName:            string
  projectReference:       string
  projectType:            string
  country:                string
  conceptTitle:           string
  conceptDescription:     string
  designVocabulary:       string[]
  plantPalettePhilosophy: string[]
  thumbnailUrl:           string | null
}

// ─── Templates CRUD ───────────────────────────────────────────────────────────

export async function listDesignTemplates(opts?: {
  publishedOnly?: boolean
  projectType?: string
}): Promise<DesignTemplateRow[]> {
  const where = and(
    opts?.publishedOnly ? eq(designTemplates.isPublished, true) : undefined,
    opts?.projectType
      ? sql`${opts.projectType}::project_type = ANY(${designTemplates.projectTypeContext})`
      : undefined,
  )

  const rows = await db
    .select({
      id:                          designTemplates.id,
      templateName:                designTemplates.templateName,
      projectTypeContext:          designTemplates.projectTypeContext,
      conceptDescriptionTemplate:  designTemplates.conceptDescriptionTemplate,
      recommendedVocabulary:       designTemplates.recommendedVocabulary,
      recommendedPalette:          designTemplates.recommendedPalette,
      exampleProjectIds:           designTemplates.exampleProjectIds,
      referenceImageCloudinaryIds: designTemplates.referenceImageCloudinaryIds,
      createdBy:                   designTemplates.createdBy,
      createdByName:               users.name,
      isPublished:                 designTemplates.isPublished,
      createdAt:                   designTemplates.createdAt,
      updatedAt:                   designTemplates.updatedAt,
    })
    .from(designTemplates)
    .leftJoin(users, eq(designTemplates.createdBy, users.id))
    .where(where)
    .orderBy(desc(designTemplates.updatedAt))

  return rows.map((r) => ({
    ...r,
    projectTypeContext:          (r.projectTypeContext ?? []) as string[],
    recommendedVocabulary:       (r.recommendedVocabulary ?? []) as string[],
    recommendedPalette:          (r.recommendedPalette ?? []) as string[],
    exampleProjectIds:           (r.exampleProjectIds ?? []) as string[],
    referenceImageCloudinaryIds: (r.referenceImageCloudinaryIds ?? []) as string[],
  }))
}

export async function getDesignTemplate(id: string): Promise<DesignTemplateRow | null> {
  const all = await listDesignTemplates()
  return all.find((t) => t.id === id) ?? null
}

export async function createDesignTemplate(input: CreateTemplateInput): Promise<string> {
  const [row] = await db
    .insert(designTemplates)
    .values({
      templateName:                input.templateName,
      projectTypeContext:          input.projectTypeContext as any,
      conceptDescriptionTemplate:  input.conceptDescriptionTemplate,
      recommendedVocabulary:       input.recommendedVocabulary,
      recommendedPalette:          input.recommendedPalette,
      exampleProjectIds:           input.exampleProjectIds,
      referenceImageCloudinaryIds: input.referenceImageCloudinaryIds,
      isPublished:                 input.isPublished,
      createdBy:                   input.createdBy,
    })
    .returning({ id: designTemplates.id })
  return row.id
}

export async function updateDesignTemplate(id: string, input: UpdateTemplateInput): Promise<boolean> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.templateName               !== undefined) set.templateName = input.templateName
  if (input.projectTypeContext         !== undefined) set.projectTypeContext = input.projectTypeContext as any
  if (input.conceptDescriptionTemplate !== undefined) set.conceptDescriptionTemplate = input.conceptDescriptionTemplate
  if (input.recommendedVocabulary      !== undefined) set.recommendedVocabulary = input.recommendedVocabulary
  if (input.recommendedPalette         !== undefined) set.recommendedPalette = input.recommendedPalette
  if (input.exampleProjectIds          !== undefined) set.exampleProjectIds = input.exampleProjectIds
  if (input.referenceImageCloudinaryIds!== undefined) set.referenceImageCloudinaryIds = input.referenceImageCloudinaryIds
  if (input.isPublished                !== undefined) set.isPublished = input.isPublished

  const result = await db.update(designTemplates).set(set).where(eq(designTemplates.id, id))
  return (result.rowCount ?? 0) > 0
}

export async function deleteDesignTemplate(id: string): Promise<boolean> {
  const result = await db.delete(designTemplates).where(eq(designTemplates.id, id))
  return (result.rowCount ?? 0) > 0
}

// ─── Concept search ───────────────────────────────────────────────────────────

export async function searchConcepts(opts?: {
  q?: string
  vocabulary?: string
  palette?: string
  projectType?: string
  country?: string
}): Promise<ConceptCardRow[]> {
  const q = opts?.q?.trim()

  const where = and(
    isNull(projects.deletedAt),
    sql`${projects.conceptTitle} IS NOT NULL AND ${projects.conceptTitle} <> ''`,
    q ? or(
      ilike(projects.conceptTitle, `%${q}%`),
      ilike(projects.conceptDescription, `%${q}%`),
    ) : undefined,
    opts?.vocabulary  ? sql`${opts.vocabulary}  = ANY(${projects.designVocabulary})`       : undefined,
    opts?.palette     ? sql`${opts.palette}     = ANY(${projects.plantPalettePhilosophy})` : undefined,
    opts?.projectType ? eq(projects.projectType, opts.projectType as any)                  : undefined,
    opts?.country     ? eq(projects.country, opts.country)                                 : undefined,
  )

  const rows = await db
    .select({
      projectId:              projects.id,
      projectName:            projects.name,
      projectReference:       projects.reference,
      projectType:            projects.projectType,
      country:                projects.country,
      conceptTitle:           projects.conceptTitle,
      conceptDescription:     projects.conceptDescription,
      designVocabulary:       projects.designVocabulary,
      plantPalettePhilosophy: projects.plantPalettePhilosophy,
    })
    .from(projects)
    .where(where)
    .orderBy(desc(projects.updatedAt))

  // Fetch one render_3d thumbnail per project in a single query.
  const projectIds = rows.map((r) => r.projectId)
  const thumbs: Record<string, string> = {}
  if (projectIds.length > 0) {
    const assets = await db
      .select({
        projectId: cloudinaryAssets.projectId,
        secureUrl: cloudinaryAssets.secureUrl,
        createdAt: cloudinaryAssets.createdAt,
      })
      .from(cloudinaryAssets)
      .where(and(
        inArray(cloudinaryAssets.projectId, projectIds),
        eq(cloudinaryAssets.assetType, 'render_3d'),
      ))
      .orderBy(desc(cloudinaryAssets.createdAt))
    for (const a of assets) {
      if (a.projectId && !thumbs[a.projectId]) thumbs[a.projectId] = a.secureUrl
    }
  }

  return rows.map((r) => ({
    projectId:              r.projectId,
    projectName:            r.projectName,
    projectReference:       r.projectReference,
    projectType:            r.projectType,
    country:                r.country,
    conceptTitle:           r.conceptTitle ?? '',
    conceptDescription:     r.conceptDescription ?? '',
    designVocabulary:       (r.designVocabulary ?? []) as string[],
    plantPalettePhilosophy: (r.plantPalettePhilosophy ?? []) as string[],
    thumbnailUrl:           thumbs[r.projectId] ?? null,
  }))
}

export async function getConceptProjectAssets(projectId: string): Promise<{ id: string; url: string; assetType: string }[]> {
  const rows = await db
    .select({
      id:        cloudinaryAssets.id,
      url:       cloudinaryAssets.secureUrl,
      assetType: cloudinaryAssets.assetType,
    })
    .from(cloudinaryAssets)
    .where(and(
      eq(cloudinaryAssets.projectId, projectId),
      inArray(cloudinaryAssets.assetType, ['render_3d', 'plan_autocad']),
    ))
    .orderBy(desc(cloudinaryAssets.createdAt))
  return rows
}

// ─── Concept update on a project ──────────────────────────────────────────────

export async function updateProjectConcept(
  projectId: string,
  input: {
    conceptTitle?: string | null
    conceptDescription?: string | null
    designVocabulary?: string[]
    plantPalettePhilosophy?: string[]
  },
): Promise<boolean> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.conceptTitle           !== undefined) set.conceptTitle = input.conceptTitle
  if (input.conceptDescription     !== undefined) set.conceptDescription = input.conceptDescription
  if (input.designVocabulary       !== undefined) set.designVocabulary = input.designVocabulary
  if (input.plantPalettePhilosophy !== undefined) set.plantPalettePhilosophy = input.plantPalettePhilosophy

  const result = await db
    .update(projects)
    .set(set)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
  return (result.rowCount ?? 0) > 0
}

export async function getProjectConcept(projectId: string): Promise<{
  conceptTitle:           string | null
  conceptDescription:     string | null
  designVocabulary:       string[]
  plantPalettePhilosophy: string[]
  projectType:            string
} | null> {
  const [row] = await db
    .select({
      conceptTitle:           projects.conceptTitle,
      conceptDescription:     projects.conceptDescription,
      designVocabulary:       projects.designVocabulary,
      plantPalettePhilosophy: projects.plantPalettePhilosophy,
      projectType:            projects.projectType,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!row) return null
  return {
    conceptTitle:           row.conceptTitle,
    conceptDescription:     row.conceptDescription,
    designVocabulary:       (row.designVocabulary ?? []) as string[],
    plantPalettePhilosophy: (row.plantPalettePhilosophy ?? []) as string[],
    projectType:            row.projectType,
  }
}

// ─── Portfolio "Design DNA" aggregations ──────────────────────────────────────

export async function getDesignDna(): Promise<{
  vocabularyFrequency: { tag: string; count: number }[]
  paletteFrequency:    { tag: string; count: number }[]
  totalProjects:       number
}> {
  const vocabRows = await db.execute(sql`
    SELECT tag, count(*)::int AS count
    FROM (
      SELECT unnest(design_vocabulary) AS tag
      FROM projects
      WHERE deleted_at IS NULL AND design_vocabulary IS NOT NULL
    ) t
    GROUP BY tag
    ORDER BY count DESC
  `)

  const paletteRows = await db.execute(sql`
    SELECT tag, count(*)::int AS count
    FROM (
      SELECT unnest(plant_palette_philosophy) AS tag
      FROM projects
      WHERE deleted_at IS NULL AND plant_palette_philosophy IS NOT NULL
    ) t
    GROUP BY tag
    ORDER BY count DESC
  `)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(isNull(projects.deletedAt), sql`${projects.conceptTitle} IS NOT NULL`))

  return {
    vocabularyFrequency: (vocabRows as any as { tag: string; count: number }[]).map((r) => ({ tag: r.tag, count: Number(r.count) })),
    paletteFrequency:    (paletteRows as any as { tag: string; count: number }[]).map((r) => ({ tag: r.tag, count: Number(r.count) })),
    totalProjects:       Number(count),
  }
}

// ─── AI concept-suggestion (stub) ─────────────────────────────────────────────
// TODO: wire to Anthropic API once the API key / provider choice is confirmed.
// For now we return a deterministic French draft built from the inputs so the
// UI flow ("Générer avec l'IA" → preview → editable) is fully functional.

export type ConceptSuggestionInput = {
  projectType:            string
  designVocabulary:       string[]
  plantPalettePhilosophy: string[]
}

export function generateConceptSuggestion(input: ConceptSuggestionInput): string {
  const { projectType, designVocabulary, plantPalettePhilosophy } = input

  const typeLabel: Record<string, string> = {
    ingenierie_territoriale: 'projet d\'ingénierie territoriale',
    espace_public:           'aménagement d\'espace public',
    siege_social:            'siège social',
    hotelier_touristique:    'projet hôtelier & touristique',
    residentiel:             'projet résidentiel',
    interieur:               'aménagement intérieur',
  }

  const vocabPart = designVocabulary.length
    ? `Le langage retenu mêle ${designVocabulary.slice(0, 3).join(', ')}, pour traduire une identité affirmée et cohérente avec le contexte du site.`
    : `Le langage paysager reste à préciser, mais s'inscrit dans la signature SOPAT : sobriété, lecture claire et tenue dans la durée.`

  const paletteLine = plantPalettePhilosophy.length
    ? `La palette végétale s'appuie sur ${plantPalettePhilosophy.slice(0, 3).join(', ')}, pensée pour ses performances et son ancrage écologique.`
    : `La palette végétale sera composée pour conjuguer ancrage local, faible besoin en eau et lecture esthétique tout au long de l'année.`

  return [
    `Le concept proposé pour ce ${typeLabel[projectType] ?? 'projet'} cherche un équilibre entre rigueur de composition et générosité végétale.`,
    vocabPart,
    paletteLine,
    `Chaque séquence est dessinée pour révéler l'usage du lieu, hiérarchiser les vues et installer une atmosphère mémorable, sans surenchère.`,
  ].join(' ')
}
