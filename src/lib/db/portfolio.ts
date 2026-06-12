import { db } from '../../../db/index'
import { portfolioExports, portfolioSettings, cloudinaryAssets, users } from '../../../db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import type { ExportConfig, PortfolioSettings } from '@/lib/portfolio/types'

export async function getPortfolioSettings(): Promise<PortfolioSettings> {
  const rows = await db.select().from(portfolioSettings).where(eq(portfolioSettings.isSingleton, true)).limit(1)
  if (rows[0]) return rows[0]
  const [created] = await db.insert(portfolioSettings).values({ isSingleton: true }).returning()
  return created
}

export async function upsertPortfolioSettings(
  patch: Partial<PortfolioSettings>,
  updatedBy: string,
): Promise<PortfolioSettings> {
  const current = await getPortfolioSettings()
  const [row] = await db
    .update(portfolioSettings)
    .set({ ...patch, updatedBy, updatedAt: new Date() })
    .where(eq(portfolioSettings.id, current.id))
    .returning()
  return row
}

export type InsertExportInput = {
  name: string
  exportType: ExportConfig['exportType']
  projectIdsIncluded: string[]
  sectionsConfig: ExportConfig['sections']
  filterConfig: Pick<ExportConfig, 'projectTypes' | 'countries' | 'projectIds'>
  language: string
  outputCloudinaryId: string
  fileSizeBytes: number
  pageCount: number
  generatedBy: string
  notes?: string
}

export async function insertPortfolioExport(input: InsertExportInput) {
  const [row] = await db.insert(portfolioExports).values({
    name: input.name,
    exportType: input.exportType,
    projectIdsIncluded: input.projectIdsIncluded,
    sectionsConfig: input.sectionsConfig,
    filterConfig: input.filterConfig,
    language: input.language,
    outputCloudinaryId: input.outputCloudinaryId,
    fileSizeBytes: input.fileSizeBytes,
    pageCount: input.pageCount,
    generatedBy: input.generatedBy,
    createdBy: input.generatedBy,
    notes: input.notes,
  }).returning()
  return row
}

export async function listPortfolioExports() {
  return db
    .select({
      e: portfolioExports,
      assetUrl: cloudinaryAssets.secureUrl,
      generatorName: users.name,
    })
    .from(portfolioExports)
    .leftJoin(cloudinaryAssets, eq(cloudinaryAssets.id, portfolioExports.outputCloudinaryId))
    .leftJoin(users, eq(users.id, portfolioExports.generatedBy))
    .orderBy(desc(portfolioExports.generatedAt))
}

export async function getPortfolioExport(id: string) {
  const [row] = await db
    .select({ e: portfolioExports, assetUrl: cloudinaryAssets.secureUrl })
    .from(portfolioExports)
    .leftJoin(cloudinaryAssets, eq(cloudinaryAssets.id, portfolioExports.outputCloudinaryId))
    .where(eq(portfolioExports.id, id))
    .limit(1)
  return row ?? null
}

export async function incrementDownload(id: string) {
  await db.update(portfolioExports).set({
    downloadCount: sql`${portfolioExports.downloadCount} + 1`,
    lastDownloadedAt: new Date(),
  }).where(eq(portfolioExports.id, id))
}

export async function deletePortfolioExport(id: string) {
  await db.delete(portfolioExports).where(eq(portfolioExports.id, id))
}
