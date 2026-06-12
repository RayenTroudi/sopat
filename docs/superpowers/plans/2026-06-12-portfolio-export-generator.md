# Portfolio Export Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Direction-only tool that turns live SOPAT DB data into a branded portfolio PDF (replacing the manual PowerPoint), with section toggles, export history, settings, and a single-project quick-export shortcut.

**Architecture:** Synchronous Next.js Node route handler streams progress via SSE. Pipeline = authorize → resolve project ids → load bundle → render `<PortfolioDocument>` with `@react-pdf/renderer` → upload PDF to Cloudinary → insert `portfolio_exports` row.

**Tech Stack:** Next.js App Router · Drizzle ORM (Neon Postgres) · `@react-pdf/renderer` (already installed) · Cloudinary (existing helper) · iron-session (existing) · React 19 / Server Components for pages, client components for the wizard.

**Spec:** [docs/superpowers/specs/2026-06-12-portfolio-export-generator-design.md](../specs/2026-06-12-portfolio-export-generator-design.md)

---

## File Map

| Path | Role |
|---|---|
| `db/schema.ts` | +2 tables, +1 enum, +1 enum value |
| `db/migrations/0007_portfolio_export.sql` | migration |
| `src/lib/portfolio/types.ts` | `ExportConfig`, `SectionToggles`, bundle types |
| `src/lib/portfolio/cloudinary.ts` | `transformUrl(publicId, opts)` |
| `src/lib/portfolio/filter.ts` | `resolveProjectIds(config)` |
| `src/lib/portfolio/loader.ts` | DB → `PortfolioBundle` |
| `src/lib/db/portfolio.ts` | insert/list/get exports + settings upsert |
| `src/components/pdf/theme.ts` | colors + static FR copy |
| `src/components/pdf/fonts.ts` | `Font.register` |
| `src/components/pdf/partials/*.tsx` | Header, Footer, SectionTitle, ImageGrid, BadgeRow |
| `src/components/pdf/pages/*.tsx` | 13 page components |
| `src/components/pdf/PortfolioDocument.tsx` | `<Document>` root |
| `src/app/api/portfolio/generate/route.ts` | POST + SSE |
| `src/app/api/portfolio/exports/route.ts` | GET list |
| `src/app/api/portfolio/exports/[id]/route.ts` | GET / DELETE |
| `src/app/api/portfolio/exports/[id]/download/route.ts` | counter + redirect |
| `src/app/api/portfolio/settings/route.ts` | GET / PUT singleton |
| `src/app/api/projects/[id]/export-card/route.ts` | single-project shortcut |
| `src/app/admin/(dashboard)/direction/portfolio/export/page.tsx` + `ExportWizard.tsx` + `ProjectPicker.tsx` | wizard |
| `src/app/admin/(dashboard)/direction/portfolio/history/page.tsx` + `HistoryTable.tsx` | history |
| `src/app/admin/(dashboard)/settings/portfolio/page.tsx` + `PortfolioSettingsForm.tsx` | settings |

---

## Task 1 — Database schema + migration

**Files:**
- Modify: `db/schema.ts` (append at end)
- Create: `db/migrations/0007_portfolio_export.sql`

- [ ] **Step 1: Add enum extension + new enum + tables to `db/schema.ts`**

Append at the end of the file:

```ts
// ─── Portfolio Export ─────────────────────────────────────────────────────────

export const portfolioExportTypeEnum = pgEnum('portfolio_export_type', [
  'full',
  'by_type',
  'by_country',
  'custom',
  'single_project',
])

export const portfolioExports = pgTable('portfolio_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  exportType: portfolioExportTypeEnum('export_type').notNull(),
  projectIdsIncluded: uuid('project_ids_included').array().notNull().default(sql`'{}'::uuid[]`),
  sectionsConfig: jsonb('sections_config').notNull(),
  filterConfig: jsonb('filter_config'),
  language: varchar('language', { length: 5 }).notNull().default('fr'),
  outputCloudinaryId: uuid('output_cloudinary_id'),
  fileSizeBytes: integer('file_size_bytes'),
  pageCount: integer('page_count'),
  downloadCount: integer('download_count').notNull().default(0),
  lastDownloadedAt: timestamp('last_downloaded_at'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  generatedBy: uuid('generated_by').notNull(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('portfolio_exports_generated_by_idx').on(t.generatedBy),
  index('portfolio_exports_generated_at_idx').on(t.generatedAt),
  foreignKey({ columns: [t.outputCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.generatedBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const portfolioSettings = pgTable('portfolio_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  isSingleton: boolean('is_singleton').notNull().default(true),
  companyTagline: text('company_tagline'),
  ceoName: varchar('ceo_name', { length: 255 }),
  ceoTitle: varchar('ceo_title', { length: 255 }),
  ceoPhotoCloudinaryId: uuid('ceo_photo_cloudinary_id'),
  companyAddress: text('company_address'),
  phone1: varchar('phone_1', { length: 50 }),
  phone2: varchar('phone_2', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  instagramHandle: varchar('instagram_handle', { length: 100 }),
  isoCertNumber: varchar('iso_cert_number', { length: 100 }),
  isoCertExpiry: date('iso_cert_expiry'),
  rseLabelLevel: varchar('rse_label_level', { length: 50 }),
  rseLabelExpiry: date('rse_label_expiry'),
  coverBackgroundColor: varchar('cover_background_color', { length: 7 }).notNull().default('#2D5A27'),
  accentColor: varchar('accent_color', { length: 7 }).notNull().default('#FFFFFF'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
}, (t) => [
  uniqueIndex('portfolio_settings_singleton_uidx').on(t.isSingleton),
  foreignKey({ columns: [t.ceoPhotoCloudinaryId], foreignColumns: [cloudinaryAssets.id] }),
  foreignKey({ columns: [t.updatedBy], foreignColumns: [users.id] }),
])
```

- [ ] **Step 2: Write the SQL migration**

Create `db/migrations/0007_portfolio_export.sql`:

```sql
-- Add portfolio_pdf to existing asset_type enum
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'portfolio_pdf';

-- New enum
DO $$ BEGIN
  CREATE TYPE portfolio_export_type AS ENUM ('full','by_type','by_country','custom','single_project');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS portfolio_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  export_type portfolio_export_type NOT NULL,
  project_ids_included uuid[] NOT NULL DEFAULT '{}'::uuid[],
  sections_config jsonb NOT NULL,
  filter_config jsonb,
  language varchar(5) NOT NULL DEFAULT 'fr',
  output_cloudinary_id uuid REFERENCES cloudinary_assets(id),
  file_size_bytes integer,
  page_count integer,
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamp,
  generated_at timestamp NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES users(id),
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS portfolio_exports_generated_by_idx ON portfolio_exports(generated_by);
CREATE INDEX IF NOT EXISTS portfolio_exports_generated_at_idx ON portfolio_exports(generated_at);

CREATE TABLE IF NOT EXISTS portfolio_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_singleton boolean NOT NULL DEFAULT true,
  company_tagline text,
  ceo_name varchar(255),
  ceo_title varchar(255),
  ceo_photo_cloudinary_id uuid REFERENCES cloudinary_assets(id),
  company_address text,
  phone_1 varchar(50),
  phone_2 varchar(50),
  email varchar(255),
  website varchar(255),
  facebook_url varchar(500),
  instagram_handle varchar(100),
  iso_cert_number varchar(100),
  iso_cert_expiry date,
  rse_label_level varchar(50),
  rse_label_expiry date,
  cover_background_color varchar(7) NOT NULL DEFAULT '#2D5A27',
  accent_color varchar(7) NOT NULL DEFAULT '#FFFFFF',
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_settings_singleton_uidx ON portfolio_settings(is_singleton);

INSERT INTO portfolio_settings (is_singleton) VALUES (true) ON CONFLICT DO NOTHING;
```

- [ ] **Step 3: Run migration**

Run: `npm run migrate` (or `npx tsx scripts/migrate.ts`)
Expected: migration applies cleanly; `\d portfolio_exports` and `\d portfolio_settings` show the new tables.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations/0007_portfolio_export.sql
git commit -m "feat(db): portfolio_exports and portfolio_settings tables"
```

---

## Task 2 — Shared types

**Files:**
- Create: `src/lib/portfolio/types.ts`

- [ ] **Step 1: Write the types file**

```ts
import type { InferSelectModel } from 'drizzle-orm'
import type {
  portfolioExports,
  portfolioSettings,
  projects,
  cloudinaryAssets,
  users,
  clients,
} from '../../../db/schema'

export type ProjectType =
  | 'ingenierie_territoriale'
  | 'espace_public'
  | 'siege_social'
  | 'hotelier_touristique'
  | 'residentiel'
  | 'interieur'

export type SectionToggles = {
  cover: boolean
  company: boolean
  certifications: boolean
  team: boolean
  projectTypes: boolean
  projects: boolean
  realisation: boolean
  entretien: boolean
  eclairageDecoration: boolean
  rse: boolean
  clients: boolean
  achievements: boolean
  contacts: boolean
}

export const DEFAULT_SECTIONS: SectionToggles = {
  cover: true, company: true, certifications: true, team: true,
  projectTypes: true, projects: true, realisation: true, entretien: true,
  eclairageDecoration: true, rse: true, clients: true, achievements: true,
  contacts: true,
}

export type ExportConfig = {
  name: string
  exportType: 'full' | 'by_type' | 'by_country' | 'custom' | 'single_project'
  projectTypes?: ProjectType[]
  countries?: string[]
  projectIds?: string[]
  sections: SectionToggles
  language: 'fr'
  notes?: string
}

export type PortfolioSettings = InferSelectModel<typeof portfolioSettings>
export type PortfolioExport = InferSelectModel<typeof portfolioExports>

export type ProjectWithAssets = InferSelectModel<typeof projects> & {
  renders3d: InferSelectModel<typeof cloudinaryAssets>[]
  sitePlans: InferSelectModel<typeof cloudinaryAssets>[]
  sitePhotos: InferSelectModel<typeof cloudinaryAssets>[]
  plants: { botanicalName: string; commonName: string | null; quantity: string }[]
}

export type TeamGroup = {
  roleKey: 'direction' | 'etudes' | 'realisation' | 'entretien' | 'admin'
  labelFr: string
  members: InferSelectModel<typeof users>[]
}

export type AchievementsNumbers = {
  projectsCompleted: number
  hectaresLandscaped: number
  treesPlanted: number
  clientsServed: number
  countriesPresent: number
  yearsExperience: number
}

export type FeaturedClient = InferSelectModel<typeof clients>

export type RseEventSummary = {
  id: string
  title: string
  date: Date
  location: string
  eventType: string
}

export type PortfolioBundle = {
  settings: PortfolioSettings
  projects: ProjectWithAssets[]
  team: TeamGroup[]
  projectTypeCounts: Record<ProjectType, number>
  achievements: AchievementsNumbers
  featuredClients: FeaturedClient[]
  rseEvents: RseEventSummary[]
  maintenanceVisitsAfterPhotos: InferSelectModel<typeof cloudinaryAssets>[]
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `src/lib/portfolio/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/portfolio/types.ts
git commit -m "feat(portfolio): shared types"
```

---

## Task 3 — Cloudinary URL transform helper

**Files:**
- Create: `src/lib/portfolio/cloudinary.ts`
- Create: `src/lib/portfolio/__tests__/cloudinary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { transformUrl } from '../cloudinary'

describe('transformUrl', () => {
  it('inserts transforms before the public_id segment', () => {
    const u = transformUrl(
      'https://res.cloudinary.com/demo/image/upload/v123/folder/pic.jpg',
      { w: 1200, q: 'auto', f: 'jpg' },
    )
    expect(u).toContain('/image/upload/w_1200,q_auto,f_jpg/v123/folder/pic.jpg')
  })

  it('returns the original url if it is not a cloudinary upload url', () => {
    const u = transformUrl('https://example.com/x.png', { w: 100 })
    expect(u).toBe('https://example.com/x.png')
  })
})
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npx vitest run src/lib/portfolio/__tests__/cloudinary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export type Transform = { w?: number; h?: number; q?: 'auto' | number; f?: 'jpg' | 'png' | 'webp' }

export function transformUrl(secureUrl: string, t: Transform): string {
  const marker = '/image/upload/'
  const i = secureUrl.indexOf(marker)
  if (i < 0) return secureUrl
  const parts: string[] = []
  if (t.w) parts.push(`w_${t.w}`)
  if (t.h) parts.push(`h_${t.h}`)
  if (t.q !== undefined) parts.push(`q_${t.q}`)
  if (t.f) parts.push(`f_${t.f}`)
  if (parts.length === 0) return secureUrl
  return secureUrl.slice(0, i + marker.length) + parts.join(',') + '/' + secureUrl.slice(i + marker.length)
}

export const PORTFOLIO_IMG = { w: 1200, q: 'auto' as const, f: 'jpg' as const }
export const PORTFOLIO_THUMB = { w: 400, q: 'auto' as const, f: 'jpg' as const }
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run src/lib/portfolio/__tests__/cloudinary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portfolio/cloudinary.ts src/lib/portfolio/__tests__/cloudinary.test.ts
git commit -m "feat(portfolio): cloudinary url transform helper"
```

---

## Task 4 — Project id resolver (`filter.ts`)

**Files:**
- Create: `src/lib/portfolio/filter.ts`
- Create: `src/lib/portfolio/__tests__/filter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { resolveProjectIds } from '../filter'
import type { ExportConfig, ProjectType } from '../types'
import { DEFAULT_SECTIONS } from '../types'

type ProjRow = { id: string; projectType: ProjectType; country: string; status: string }

const ALL: ProjRow[] = [
  { id: 'a', projectType: 'hotelier_touristique', country: 'TN', status: 'completed' },
  { id: 'b', projectType: 'residentiel',          country: 'TN', status: 'completed' },
  { id: 'c', projectType: 'hotelier_touristique', country: 'FR', status: 'completed' },
  { id: 'd', projectType: 'siege_social',         country: 'TN', status: 'realisation' },
]

const baseCfg = (over: Partial<ExportConfig>): ExportConfig => ({
  name: 'x', exportType: 'full', sections: DEFAULT_SECTIONS, language: 'fr', ...over,
})

describe('resolveProjectIds', () => {
  it('full → only completed projects', () => {
    expect(resolveProjectIds(baseCfg({ exportType: 'full' }), ALL).sort()).toEqual(['a','b','c'])
  })
  it('by_type → completed + selected types', () => {
    expect(resolveProjectIds(
      baseCfg({ exportType: 'by_type', projectTypes: ['hotelier_touristique'] }), ALL,
    ).sort()).toEqual(['a','c'])
  })
  it('by_country → completed + selected countries', () => {
    expect(resolveProjectIds(
      baseCfg({ exportType: 'by_country', countries: ['TN'] }), ALL,
    ).sort()).toEqual(['a','b'])
  })
  it('custom → exactly the listed ids that exist', () => {
    expect(resolveProjectIds(
      baseCfg({ exportType: 'custom', projectIds: ['a','z'] }), ALL,
    )).toEqual(['a'])
  })
  it('single_project → first id only', () => {
    expect(resolveProjectIds(
      baseCfg({ exportType: 'single_project', projectIds: ['c','a'] }), ALL,
    )).toEqual(['c'])
  })
})
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npx vitest run src/lib/portfolio/__tests__/filter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { ExportConfig, ProjectType } from './types'

type ProjRow = { id: string; projectType: ProjectType; country: string; status: string }

export function resolveProjectIds(config: ExportConfig, all: ProjRow[]): string[] {
  const completed = all.filter((p) => p.status === 'completed')
  switch (config.exportType) {
    case 'full':
      return completed.map((p) => p.id)
    case 'by_type': {
      const types = new Set(config.projectTypes ?? [])
      return completed.filter((p) => types.has(p.projectType)).map((p) => p.id)
    }
    case 'by_country': {
      const ctry = new Set(config.countries ?? [])
      return completed.filter((p) => ctry.has(p.country)).map((p) => p.id)
    }
    case 'custom': {
      const allow = new Set(config.projectIds ?? [])
      return all.filter((p) => allow.has(p.id)).map((p) => p.id)
    }
    case 'single_project': {
      const first = config.projectIds?.[0]
      const hit = all.find((p) => p.id === first)
      return hit ? [hit.id] : []
    }
  }
}
```

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run src/lib/portfolio/__tests__/filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portfolio/filter.ts src/lib/portfolio/__tests__/filter.test.ts
git commit -m "feat(portfolio): project id resolver"
```

---

## Task 5 — DB layer (`lib/db/portfolio.ts`)

**Files:**
- Create: `src/lib/db/portfolio.ts`

- [ ] **Step 1: Implement**

```ts
import { db } from '@/lib/db'
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors for `src/lib/db/portfolio.ts`. If the project's `db` client is imported from a different path than `@/lib/db`, adjust the import to match the pattern used in `src/lib/db/achievements.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/portfolio.ts
git commit -m "feat(portfolio): db helpers for exports and settings"
```

---

## Task 6 — Bundle loader (`lib/portfolio/loader.ts`)

**Files:**
- Create: `src/lib/portfolio/loader.ts`

- [ ] **Step 1: Implement**

```ts
import { db } from '@/lib/db'
import {
  projects, cloudinaryAssets, users, clients, plantListItems,
  rseEvents, maintenanceVisits,
} from '../../../db/schema'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getPortfolioSettings } from '@/lib/db/portfolio'
import type {
  PortfolioBundle, ProjectWithAssets, TeamGroup, AchievementsNumbers,
  ProjectType,
} from './types'
import { transformUrl, PORTFOLIO_IMG } from './cloudinary'
import { getAchievements } from '@/lib/db/achievements'

const ROLE_GROUP: Record<string, TeamGroup['roleKey']> = {
  direction: 'direction',
  etudes_chef: 'etudes', etudes_team: 'etudes',
  realisation_chef: 'realisation', realisation_team: 'realisation',
  entretien_chef: 'entretien', entretien_team: 'entretien',
  admin: 'admin',
}
const GROUP_LABEL: Record<TeamGroup['roleKey'], string> = {
  direction: 'Direction', etudes: 'Études', realisation: 'Réalisation',
  entretien: 'Entretien', admin: 'Administration',
}
const GROUP_ORDER: TeamGroup['roleKey'][] = ['direction', 'etudes', 'realisation', 'entretien', 'admin']

function applyTransforms<T extends { secureUrl: string }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, secureUrl: transformUrl(r.secureUrl, PORTFOLIO_IMG) }))
}

export async function loadPortfolioBundle(projectIds: string[]): Promise<PortfolioBundle> {
  const [
    settings,
    projectRows,
    assetRows,
    userRows,
    plantRows,
    typeCountRows,
    featuredClientRows,
    rseEventRows,
    afterPhotoRows,
    achievements,
  ] = await Promise.all([
    getPortfolioSettings(),
    projectIds.length
      ? db.select().from(projects).where(inArray(projects.id, projectIds))
      : Promise.resolve([] as any[]),
    projectIds.length
      ? db.select().from(cloudinaryAssets)
          .where(inArray(cloudinaryAssets.projectId, projectIds))
          .orderBy(desc(cloudinaryAssets.createdAt))
      : Promise.resolve([] as any[]),
    db.select().from(users).where(and(eq(users.isActive, true), isNull(users.deletedAt))),
    projectIds.length
      ? db.select().from(plantListItems).where(inArray(plantListItems.projectId, projectIds))
      : Promise.resolve([] as any[]),
    db.select({
        projectType: projects.projectType,
        count: sql<number>`count(*)::int`,
      })
      .from(projects)
      .where(eq(projects.status, 'completed'))
      .groupBy(projects.projectType),
    db.select().from(clients).where(eq(clients.isFeatured, true)),
    db.select({
        id: rseEvents.id, title: rseEvents.title, date: rseEvents.date,
        location: rseEvents.location, eventType: rseEvents.eventType,
      })
      .from(rseEvents)
      .where(eq(rseEvents.status, 'termine'))
      .orderBy(desc(rseEvents.date))
      .limit(6),
    projectIds.length
      ? db.select({ asset: cloudinaryAssets })
          .from(maintenanceVisits)
          .innerJoin(cloudinaryAssets, eq(cloudinaryAssets.id, maintenanceVisits.afterPhotoAssetId))
          .where(inArray(maintenanceVisits.projectId, projectIds))
          .orderBy(desc(maintenanceVisits.visitDate))
          .limit(12)
      : Promise.resolve([] as any[]),
    getAchievements(),
  ])

  // Group assets per project by assetType
  const renders3dBy = new Map<string, any[]>()
  const sitePlansBy = new Map<string, any[]>()
  const sitePhotosBy = new Map<string, any[]>()
  for (const a of assetRows) {
    const pid = a.projectId
    if (!pid) continue
    if (a.assetType === 'render_3d') (renders3dBy.get(pid) ?? renders3dBy.set(pid, []).get(pid)!).push(a)
    else if (a.assetType === 'plan_autocad') (sitePlansBy.get(pid) ?? sitePlansBy.set(pid, []).get(pid)!).push(a)
    else if (a.assetType === 'site_photo') (sitePhotosBy.get(pid) ?? sitePhotosBy.set(pid, []).get(pid)!).push(a)
  }

  const plantsBy = new Map<string, any[]>()
  for (const p of plantRows) {
    const arr = plantsBy.get(p.projectId) ?? []
    arr.push({ botanicalName: p.botanicalName, commonName: p.commonName, quantity: p.quantity })
    plantsBy.set(p.projectId, arr)
  }

  const projectsBundle: ProjectWithAssets[] = projectRows.map((p) => ({
    ...p,
    renders3d: applyTransforms((renders3dBy.get(p.id) ?? []).slice(0, 3)),
    sitePlans: applyTransforms((sitePlansBy.get(p.id) ?? []).slice(0, 1)),
    sitePhotos: applyTransforms((sitePhotosBy.get(p.id) ?? []).slice(0, 6)),
    plants: (plantsBy.get(p.id) ?? []).slice(0, 10),
  }))

  // Group team
  const buckets: Record<TeamGroup['roleKey'], any[]> =
    { direction: [], etudes: [], realisation: [], entretien: [], admin: [] }
  for (const u of userRows) {
    const key = ROLE_GROUP[u.role] ?? 'admin'
    buckets[key].push(u)
  }
  const team: TeamGroup[] = GROUP_ORDER
    .map((k) => ({ roleKey: k, labelFr: GROUP_LABEL[k], members: buckets[k] }))
    .filter((g) => g.members.length > 0)

  const projectTypeCounts: Record<ProjectType, number> = {
    ingenierie_territoriale: 0, espace_public: 0, siege_social: 0,
    hotelier_touristique: 0, residentiel: 0, interieur: 0,
  }
  for (const row of typeCountRows) projectTypeCounts[row.projectType as ProjectType] = row.count

  const ach = achievements as any
  const achievementsNumbers: AchievementsNumbers = {
    projectsCompleted: Number(ach.projectsCompleted ?? 0),
    hectaresLandscaped: Number(ach.hectaresLandscaped ?? 0),
    treesPlanted: Number(ach.treesPlanted ?? 0),
    clientsServed: Number(ach.clientsServed ?? 0),
    countriesPresent: Number(ach.countriesPresent ?? 0),
    yearsExperience: Number(ach.yearsExperience ?? new Date().getFullYear() - 2005),
  }

  return {
    settings,
    projects: projectsBundle,
    team,
    projectTypeCounts,
    achievements: achievementsNumbers,
    featuredClients: featuredClientRows,
    rseEvents: rseEventRows as any,
    maintenanceVisitsAfterPhotos: applyTransforms(afterPhotoRows.map((r) => r.asset)),
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `getAchievements` returns a shape different from the keys above, adjust the mapping to match — open `src/lib/db/achievements.ts` to confirm the actual return shape.

- [ ] **Step 3: Commit**

```bash
git add src/lib/portfolio/loader.ts
git commit -m "feat(portfolio): bundle loader"
```

---

## Task 7 — PDF theme + fonts + partials

**Files:**
- Create: `src/components/pdf/theme.ts`
- Create: `src/components/pdf/fonts.ts`
- Create: `src/components/pdf/partials/SectionTitle.tsx`
- Create: `src/components/pdf/partials/BadgeRow.tsx`
- Create: `src/components/pdf/partials/ImageGrid.tsx`
- Create: `src/components/pdf/partials/Footer.tsx`

- [ ] **Step 1: Theme + static FR copy**

```ts
// theme.ts
import { StyleSheet } from '@react-pdf/renderer'

export const COLORS = {
  green: '#2D5A27',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
  paper: '#F7F6F2',
}

export const STATIC_COPY = {
  history: 'Fondée en 2005, SOPAT (Société de Paysage de Tunisie) conçoit et réalise depuis vingt ans des aménagements paysagers haut de gamme pour les secteurs hôtelier, résidentiel, public et institutionnel à travers le bassin méditerranéen et au-delà.',
  values: 'Excellence, intégrité, respect de l\'environnement et passion du végétal guident chacune de nos interventions.',
}

export const baseStyles = StyleSheet.create({
  page:    { padding: 40, fontSize: 11, color: COLORS.ink, fontFamily: 'Inter' },
  h1:      { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  h2:      { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  h3:      { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  small:   { fontSize: 9, color: COLORS.muted },
})
```

- [ ] **Step 2: Fonts**

```ts
// fonts.ts
import { Font } from '@react-pdf/renderer'

let registered = false
export function ensureFontsRegistered() {
  if (registered) return
  Font.register({
    family: 'Inter',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7SUc.woff2', fontWeight: 600 },
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5n-wU.woff2', fontWeight: 700 },
    ],
  })
  registered = true
}
```

- [ ] **Step 3: SectionTitle**

```tsx
// partials/SectionTitle.tsx
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  wrap: { borderBottomWidth: 2, borderBottomColor: COLORS.green, paddingBottom: 4, marginBottom: 12 },
  text: { fontSize: 18, fontWeight: 700, color: COLORS.green },
})

export function SectionTitle({ children }: { children: string }) {
  return <View style={s.wrap}><Text style={s.text}>{children}</Text></View>
}
```

- [ ] **Step 4: Footer**

```tsx
// partials/Footer.tsx
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  text: { fontSize: 9, color: COLORS.muted },
})

export function Footer({ pageLabel }: { pageLabel: string }) {
  return (
    <View style={s.wrap} fixed>
      <Text style={s.text}>SOPAT — Société de Paysage de Tunisie</Text>
      <Text style={s.text}>{pageLabel}</Text>
    </View>
  )
}
```

- [ ] **Step 5: BadgeRow**

```tsx
// partials/BadgeRow.tsx
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'

const s = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 6 },
  badge: { borderWidth: 1, borderColor: COLORS.white, color: COLORS.white, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, borderRadius: 2 },
})

export function BadgeRow({ labels }: { labels: string[] }) {
  return (
    <View style={s.row}>
      {labels.map((l) => <Text key={l} style={s.badge}>{l}</Text>)}
    </View>
  )
}
```

- [ ] **Step 6: ImageGrid**

```tsx
// partials/ImageGrid.tsx
import { View, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '32%', height: 110, backgroundColor: '#EEE' },
  img:  { width: '100%', height: '100%', objectFit: 'cover' },
})

export function ImageGrid({ urls, cols = 3 }: { urls: string[]; cols?: number }) {
  const width = `${Math.floor(96 / cols)}%`
  return (
    <View style={s.grid}>
      {urls.map((u, i) => (
        <View key={i} style={[s.cell, { width }]}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={u} style={s.img} />
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/pdf/theme.ts src/components/pdf/fonts.ts src/components/pdf/partials
git commit -m "feat(portfolio): pdf theme, fonts, and partials"
```

---

## Task 8 — PDF pages (batch 1: cover, company, certifications, contacts)

**Files:**
- Create: `src/components/pdf/pages/CoverPage.tsx`
- Create: `src/components/pdf/pages/CompanyPage.tsx`
- Create: `src/components/pdf/pages/CertificationsPage.tsx`
- Create: `src/components/pdf/pages/ContactsPage.tsx`

- [ ] **Step 1: CoverPage**

```tsx
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import { BadgeRow } from '../partials/BadgeRow'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:    { padding: 0, backgroundColor: COLORS.green, color: COLORS.white },
  badges:  { position: 'absolute', top: 30, right: 30 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo:    { width: 180, height: 60, marginBottom: 16 },
  title:   { fontSize: 14, letterSpacing: 2 },
  footer:  { position: 'absolute', bottom: 30, right: 30, textAlign: 'right' },
  ceo:     { fontSize: 11, fontWeight: 700 },
  ceoTitle:{ fontSize: 10 },
})

export function CoverPage({ s: st, logoUrl }: { s: PortfolioSettings; logoUrl?: string }) {
  const badges: string[] = []
  if (st.isoCertNumber) badges.push('ISO 9001')
  if (st.rseLabelLevel) badges.push(`RSE ${st.rseLabelLevel}`)
  return (
    <Page size="A4" style={s.page}>
      {badges.length > 0 && <View style={s.badges}><BadgeRow labels={badges} /></View>}
      <View style={s.center}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoUrl && <Image src={logoUrl} style={s.logo} />}
        <Text style={s.title}>SOCIÉTÉ DE PAYSAGE DE TUNISIE</Text>
      </View>
      {(st.ceoName || st.ceoTitle) && (
        <View style={s.footer}>
          {st.ceoName  && <Text style={s.ceo}>{st.ceoName}</Text>}
          {st.ceoTitle && <Text style={s.ceoTitle}>{st.ceoTitle}</Text>}
        </View>
      )}
    </Page>
  )
}
```

- [ ] **Step 2: CompanyPage**

```tsx
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS, STATIC_COPY, baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 16 },
  left: { width: 160 },
  right:{ flex: 1, gap: 10 },
  photo:{ width: 160, height: 200, backgroundColor: '#EEE' },
  card: { borderWidth: 1, borderColor: COLORS.green, padding: 10 },
  name: { fontSize: 12, fontWeight: 700, marginTop: 6 },
  role: { fontSize: 10, color: COLORS.muted },
})

export function CompanyPage({ s: st, ceoPhotoUrl }: { s: PortfolioSettings; ceoPhotoUrl?: string }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>L'entreprise</SectionTitle>
      <View style={s.row}>
        <View style={s.left}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {ceoPhotoUrl ? <Image src={ceoPhotoUrl} style={s.photo} /> : <View style={s.photo} />}
          <Text style={s.name}>{st.ceoName ?? ''}</Text>
          <Text style={s.role}>{st.ceoTitle ?? ''}</Text>
        </View>
        <View style={s.right}>
          {st.companyTagline && (
            <View style={s.card}><Text style={baseStyles.h3}>Mission & Vision</Text><Text>{st.companyTagline}</Text></View>
          )}
          <View style={s.card}><Text style={baseStyles.h3}>Histoire & Contexte</Text><Text>{STATIC_COPY.history}</Text></View>
          <View style={s.card}><Text style={baseStyles.h3}>Valeurs fondamentales</Text><Text>{STATIC_COPY.values}</Text></View>
        </View>
      </View>
      <Footer pageLabel="Présentation" />
    </Page>
  )
}
```

- [ ] **Step 3: CertificationsPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS, baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  card:   { borderWidth: 1, borderColor: COLORS.green, padding: 12, marginBottom: 10 },
  label:  { fontSize: 10, color: COLORS.muted, marginTop: 4 },
})

function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

export function CertificationsPage({ s: st }: { s: PortfolioSettings }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Certifications</SectionTitle>
      {st.isoCertNumber && (
        <View style={s.card}>
          <Text style={baseStyles.h3}>ISO 9001 — Bureau Veritas</Text>
          <Text>N° {st.isoCertNumber}</Text>
          <Text style={s.label}>Expire le {formatDate(st.isoCertExpiry)}</Text>
        </View>
      )}
      {st.rseLabelLevel && (
        <View style={s.card}>
          <Text style={baseStyles.h3}>Label RSE — Niveau {st.rseLabelLevel}</Text>
          <Text style={s.label}>Expire le {formatDate(st.rseLabelExpiry)}</Text>
        </View>
      )}
      <Footer pageLabel="Certifications" />
    </Page>
  )
}
```

- [ ] **Step 4: ContactsPage**

```tsx
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import { BadgeRow } from '../partials/BadgeRow'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:   { padding: 40, backgroundColor: COLORS.green, color: COLORS.white },
  center: { alignItems: 'center', marginTop: 60 },
  logo:   { width: 140, height: 50, marginBottom: 20 },
  block:  { marginTop: 18, alignItems: 'center', gap: 4 },
  big:    { fontSize: 14, fontWeight: 700 },
  line:   { fontSize: 11 },
})

export function ContactsPage({ s: st, logoUrl }: { s: PortfolioSettings; logoUrl?: string }) {
  const badges: string[] = []
  if (st.isoCertNumber) badges.push('ISO 9001')
  if (st.rseLabelLevel) badges.push(`RSE ${st.rseLabelLevel}`)
  return (
    <Page size="A4" style={s.page}>
      <View style={s.center}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoUrl && <Image src={logoUrl} style={s.logo} />}
        <Text style={s.big}>Contactez-nous</Text>
        <View style={s.block}>
          {st.companyAddress && <Text style={s.line}>{st.companyAddress}</Text>}
          {st.phone1 && <Text style={s.line}>{st.phone1}</Text>}
          {st.phone2 && <Text style={s.line}>{st.phone2}</Text>}
          {st.email && <Text style={s.line}>{st.email}</Text>}
          {st.website && <Text style={s.line}>{st.website}</Text>}
          {st.facebookUrl && <Text style={s.line}>{st.facebookUrl}</Text>}
          {st.instagramHandle && <Text style={s.line}>@{st.instagramHandle}</Text>}
        </View>
        <View style={{ marginTop: 30 }}><BadgeRow labels={badges} /></View>
      </View>
    </Page>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/pdf/pages/CoverPage.tsx src/components/pdf/pages/CompanyPage.tsx \
        src/components/pdf/pages/CertificationsPage.tsx src/components/pdf/pages/ContactsPage.tsx
git commit -m "feat(portfolio): cover, company, certifications, contacts pages"
```

---

## Task 9 — PDF pages (batch 2: team, projectTypes, projects, realisation)

**Files:**
- Create: `src/components/pdf/pages/TeamPage.tsx`
- Create: `src/components/pdf/pages/ProjectTypesPage.tsx`
- Create: `src/components/pdf/pages/ProjectPage.tsx`
- Create: `src/components/pdf/pages/RealisationPage.tsx`

- [ ] **Step 1: TeamPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { TeamGroup } from '@/lib/portfolio/types'
import { ROLE_LABELS } from '@/lib/auth-utils'

const s = StyleSheet.create({
  group:  { marginBottom: 14 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  member: { width: 110, borderWidth: 1, borderColor: COLORS.muted, padding: 6 },
  name:   { fontSize: 10, fontWeight: 700 },
  role:   { fontSize: 9, color: COLORS.muted },
})

export function TeamPage({ team }: { team: TeamGroup[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Notre équipe</SectionTitle>
      {team.map((g) => (
        <View key={g.roleKey} style={s.group}>
          <Text style={baseStyles.h3}>{g.labelFr}</Text>
          <View style={s.grid}>
            {g.members.map((m: any) => (
              <View key={m.id} style={s.member}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.role}>{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS]}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Footer pageLabel="Équipe" />
    </Page>
  )
}
```

- [ ] **Step 2: ProjectTypesPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { ProjectType } from '@/lib/portfolio/types'

const LABELS: Record<ProjectType, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:          'Espace public',
  siege_social:           'Siège social',
  hotelier_touristique:   'Hôtelier & Touristique',
  residentiel:            'Résidentiel',
  interieur:              'Intérieur',
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', borderWidth: 1, borderColor: COLORS.green, padding: 14, alignItems: 'center' },
  num:  { fontSize: 22, fontWeight: 700, color: COLORS.green },
})

export function ProjectTypesPage({ counts }: { counts: Record<ProjectType, number> }) {
  const keys = Object.keys(LABELS) as ProjectType[]
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Nos types de projets</SectionTitle>
      <View style={s.grid}>
        {keys.map((k) => (
          <View key={k} style={s.tile}>
            <Text style={s.num}>{counts[k] ?? 0}</Text>
            <Text>{LABELS[k]}</Text>
          </View>
        ))}
      </View>
      <Footer pageLabel="Types de projets" />
    </Page>
  )
}
```

- [ ] **Step 3: ProjectPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const TYPE_LABEL: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public: 'Espace public',
  siege_social: 'Siège social',
  hotelier_touristique: 'Hôtelier & Touristique',
  residentiel: 'Résidentiel',
  interieur: 'Intérieur',
}

const s = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 14 },
  left:   { width: '52%', gap: 10 },
  right:  { flex: 1, gap: 6 },
  type:   { color: COLORS.green, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  name:   { fontSize: 20, fontWeight: 700, marginTop: 4 },
  loc:    { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  concept:{ fontSize: 11, lineHeight: 1.5 },
  plant:  { fontSize: 9, color: COLORS.muted },
  plan:   { width: '100%', height: 140, backgroundColor: '#EEE' },
})

export function ProjectPage({ p }: { p: ProjectWithAssets }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={s.row}>
        <View style={s.left}>
          <Text style={s.type}>{TYPE_LABEL[p.projectType]?.toUpperCase() ?? p.projectType}</Text>
          {p.renders3d.length > 0 && <ImageGrid urls={p.renders3d.map((a: any) => a.secureUrl)} cols={3} />}
          {p.sitePlans[0] && (
            <View style={s.plan}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {/* @ts-expect-error react-pdf */}
              <Image src={p.sitePlans[0].secureUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </View>
          )}
        </View>
        <View style={s.right}>
          <Text style={s.name}>{p.name}</Text>
          <Text style={s.loc}>{p.siteAddress} · {p.country}</Text>
          {p.conceptTitle && <Text style={baseStyles.h3}>{p.conceptTitle}</Text>}
          {p.conceptDescription && <Text style={s.concept}>{p.conceptDescription}</Text>}
          {p.plants.length > 0 && (
            <View>
              <Text style={baseStyles.h3}>Palette végétale</Text>
              {p.plants.map((pl, i) => (
                <Text key={i} style={s.plant}>• {pl.botanicalName}{pl.commonName ? ` — ${pl.commonName}` : ''}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
      <Footer pageLabel={p.name} />
    </Page>
  )
}
```

Add `import { Image } from '@react-pdf/renderer'` at the top (the `@ts-expect-error` is unnecessary if you import it — replace the commented Image block with a proper import):

```tsx
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
// ...
{p.sitePlans[0] && (
  <View style={s.plan}>
    {/* eslint-disable-next-line jsx-a11y/alt-text */}
    <Image src={p.sitePlans[0].secureUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </View>
)}
```

- [ ] **Step 4: RealisationPage**

```tsx
import { Page, StyleSheet } from '@react-pdf/renderer'
import { baseStyles } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

export function RealisationPage({ projects }: { projects: ProjectWithAssets[] }) {
  const urls = projects.flatMap((p) => p.sitePhotos.slice(0, 2).map((a: any) => a.secureUrl)).slice(0, 12)
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Partie réalisation</SectionTitle>
      <ImageGrid urls={urls} cols={3} />
      <Footer pageLabel="Réalisation" />
    </Page>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/pdf/pages
git commit -m "feat(portfolio): team, project types, project, realisation pages"
```

---

## Task 10 — PDF pages (batch 3: entretien, éclairage, rse, clients, achievements)

**Files:**
- Create: `src/components/pdf/pages/EntretienPage.tsx`
- Create: `src/components/pdf/pages/EclairageDecorationPage.tsx`
- Create: `src/components/pdf/pages/RsePage.tsx`
- Create: `src/components/pdf/pages/ClientsPage.tsx`
- Create: `src/components/pdf/pages/AchievementsPage.tsx`

- [ ] **Step 1: EntretienPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  row:  { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: COLORS.muted, paddingVertical: 4 },
  cell: { flex: 1, fontSize: 10 },
  head: { fontWeight: 700, color: COLORS.green },
})

export function EntretienPage({ projects, afterPhotoUrls }: { projects: ProjectWithAssets[]; afterPhotoUrls: string[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Partie entretien</SectionTitle>
      <View style={[s.row, { borderBottomWidth: 1 }]}>
        <Text style={[s.cell, s.head]}>Projet</Text>
        <Text style={[s.cell, s.head]}>Pays</Text>
        <Text style={[s.cell, s.head]}>Référence</Text>
      </View>
      {projects.map((p) => (
        <View key={p.id} style={s.row}>
          <Text style={s.cell}>{p.name}</Text>
          <Text style={s.cell}>{p.country}</Text>
          <Text style={s.cell}>{p.reference}</Text>
        </View>
      ))}
      {afterPhotoUrls.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={baseStyles.h3}>Visites récentes</Text>
          <ImageGrid urls={afterPhotoUrls.slice(0, 9)} cols={3} />
        </View>
      )}
      <Footer pageLabel="Entretien" />
    </Page>
  )
}
```

- [ ] **Step 2: EclairageDecorationPage**

```tsx
import { Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import { ImageGrid } from '../partials/ImageGrid'
import type { ProjectWithAssets } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  card: { marginBottom: 10, borderWidth: 1, borderColor: COLORS.green, padding: 8 },
})

export function EclairageDecorationPage({ projects }: { projects: ProjectWithAssets[] }) {
  const lit = projects.filter((p) => p.lightingIncluded)
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Éclairage & Décoration</SectionTitle>
      {lit.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={baseStyles.h3}>{p.name}</Text>
          <ImageGrid urls={p.renders3d.map((a: any) => a.secureUrl)} cols={3} />
        </View>
      ))}
      <Footer pageLabel="Éclairage & Décoration" />
    </Page>
  )
}
```

- [ ] **Step 3: RsePage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { RseEventSummary } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', borderWidth: 1, borderColor: COLORS.green, padding: 10 },
  date: { fontSize: 9, color: COLORS.muted },
})

export function RsePage({ events }: { events: RseEventSummary[] }) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Activités RSE</SectionTitle>
      <View style={s.grid}>
        {events.map((e) => (
          <View key={e.id} style={s.card}>
            <Text style={baseStyles.h3}>{e.title}</Text>
            <Text style={s.date}>{new Date(e.date).toLocaleDateString('fr-FR')} — {e.location}</Text>
            <Text>{e.eventType}</Text>
          </View>
        ))}
      </View>
      <Footer pageLabel="RSE" />
    </Page>
  )
}
```

- [ ] **Step 4: ClientsPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, COLORS } from '../theme'
import { SectionTitle } from '../partials/SectionTitle'
import { Footer } from '../partials/Footer'
import type { FeaturedClient } from '@/lib/portfolio/types'

const SECTOR_LABEL: Record<string, string> = {
  banque: 'Banques', hotellerie: 'Hôtellerie', automobile: 'Automobile',
  institutionnel_public: 'Institutions publiques', institutionnel_prive: 'Institutions privées',
  residentiel_prive: 'Résidentiel privé', diplomatique: 'Diplomatique', autre: 'Autres',
}

const s = StyleSheet.create({
  group: { marginBottom: 12 },
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tile:  { width: '23%', height: 50, borderWidth: 1, borderColor: COLORS.muted, alignItems: 'center', justifyContent: 'center', padding: 4 },
})

export function ClientsPage({ clients }: { clients: FeaturedClient[] }) {
  const bySector = new Map<string, FeaturedClient[]>()
  for (const c of clients) {
    const k = c.clientSector ?? 'autre'
    const arr = bySector.get(k) ?? []
    arr.push(c); bySector.set(k, arr)
  }
  return (
    <Page size="A4" style={baseStyles.page}>
      <SectionTitle>Ils nous font confiance</SectionTitle>
      {[...bySector.entries()].map(([sector, list]) => (
        <View key={sector} style={s.group}>
          <Text style={baseStyles.h3}>{SECTOR_LABEL[sector] ?? sector}</Text>
          <View style={s.grid}>
            {list.map((c) => (
              <View key={c.id} style={s.tile}><Text style={{ fontSize: 9 }}>{c.displayName}</Text></View>
            ))}
          </View>
        </View>
      ))}
      <Footer pageLabel="Clients" />
    </Page>
  )
}
```

- [ ] **Step 5: AchievementsPage**

```tsx
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { COLORS } from '../theme'
import type { AchievementsNumbers } from '@/lib/portfolio/types'

const s = StyleSheet.create({
  page:  { padding: 40, backgroundColor: COLORS.green, color: COLORS.white },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:  { width: '31%', borderWidth: 1, borderColor: COLORS.white, padding: 16, alignItems: 'center' },
  num:   { fontSize: 28, fontWeight: 700 },
  label: { fontSize: 10, marginTop: 4, textAlign: 'center' },
})

export function AchievementsPage({ a }: { a: AchievementsNumbers }) {
  const items: { num: number; label: string }[] = [
    { num: a.projectsCompleted,   label: 'Projets réalisés' },
    { num: a.hectaresLandscaped,  label: 'Hectares aménagés' },
    { num: a.treesPlanted,        label: 'Arbres plantés' },
    { num: a.clientsServed,       label: 'Clients servis' },
    { num: a.countriesPresent,    label: 'Pays' },
    { num: a.yearsExperience,     label: "Années d'expérience" },
  ]
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.title}>Nos réalisations en chiffres</Text>
      <View style={s.grid}>
        {items.map((it) => (
          <View key={it.label} style={s.tile}>
            <Text style={s.num}>{it.num}</Text>
            <Text style={s.label}>{it.label}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/pdf/pages
git commit -m "feat(portfolio): entretien, eclairage, rse, clients, achievements pages"
```

---

## Task 11 — `PortfolioDocument` root

**Files:**
- Create: `src/components/pdf/PortfolioDocument.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Document } from '@react-pdf/renderer'
import { ensureFontsRegistered } from './fonts'
import { CoverPage } from './pages/CoverPage'
import { CompanyPage } from './pages/CompanyPage'
import { CertificationsPage } from './pages/CertificationsPage'
import { TeamPage } from './pages/TeamPage'
import { ProjectTypesPage } from './pages/ProjectTypesPage'
import { ProjectPage } from './pages/ProjectPage'
import { RealisationPage } from './pages/RealisationPage'
import { EntretienPage } from './pages/EntretienPage'
import { EclairageDecorationPage } from './pages/EclairageDecorationPage'
import { RsePage } from './pages/RsePage'
import { ClientsPage } from './pages/ClientsPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { ContactsPage } from './pages/ContactsPage'
import type { PortfolioBundle, ExportConfig } from '@/lib/portfolio/types'

type Props = {
  bundle: PortfolioBundle
  config: ExportConfig
  logoUrl?: string
  ceoPhotoUrl?: string
}

export function PortfolioDocument({ bundle, config, logoUrl, ceoPhotoUrl }: Props) {
  ensureFontsRegistered()
  const sec = config.sections
  return (
    <Document title={config.name}>
      {sec.cover &&          <CoverPage s={bundle.settings} logoUrl={logoUrl} />}
      {sec.company &&        <CompanyPage s={bundle.settings} ceoPhotoUrl={ceoPhotoUrl} />}
      {sec.certifications && <CertificationsPage s={bundle.settings} />}
      {sec.team &&           <TeamPage team={bundle.team} />}
      {sec.projectTypes &&   <ProjectTypesPage counts={bundle.projectTypeCounts} />}
      {sec.projects &&       bundle.projects.map((p) => <ProjectPage key={p.id} p={p} />)}
      {sec.realisation &&    <RealisationPage projects={bundle.projects} />}
      {sec.entretien &&      <EntretienPage projects={bundle.projects} afterPhotoUrls={bundle.maintenanceVisitsAfterPhotos.map((a) => a.secureUrl)} />}
      {sec.eclairageDecoration && <EclairageDecorationPage projects={bundle.projects} />}
      {sec.rse &&            <RsePage events={bundle.rseEvents} />}
      {sec.clients &&        <ClientsPage clients={bundle.featuredClients} />}
      {sec.achievements &&   <AchievementsPage a={bundle.achievements} />}
      {sec.contacts &&       <ContactsPage s={bundle.settings} logoUrl={logoUrl} />}
    </Document>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Fix any prop-name typos before moving on.

- [ ] **Step 3: Commit**

```bash
git add src/components/pdf/PortfolioDocument.tsx
git commit -m "feat(portfolio): root Document component"
```

---

## Task 12 — Cloudinary buffer upload helper

**Files:**
- Modify: `src/lib/cloudinary.ts`

- [ ] **Step 1: Append a buffer upload function**

```ts
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  opts: { folder: string; publicId?: string; format?: 'pdf' | 'jpg' | 'png' },
): Promise<{ publicId: string; url: string; secureUrl: string; bytes: number; format: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: opts.folder, public_id: opts.publicId, format: opts.format ?? 'pdf' },
      (err, res) => {
        if (err || !res) return reject(err ?? new Error('Cloudinary upload returned no result'))
        resolve({
          publicId: res.public_id,
          url: res.url,
          secureUrl: res.secure_url,
          bytes: res.bytes,
          format: res.format,
        })
      },
    )
    stream.end(buffer)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cloudinary.ts
git commit -m "feat(cloudinary): buffer upload helper"
```

---

## Task 13 — Generation API route with SSE

**Files:**
- Create: `src/app/api/portfolio/generate/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { projects, cloudinaryAssets } from '../../../../../db/schema'
import { resolveProjectIds } from '@/lib/portfolio/filter'
import { loadPortfolioBundle } from '@/lib/portfolio/loader'
import { insertPortfolioExport } from '@/lib/db/portfolio'
import { uploadBufferToCloudinary } from '@/lib/cloudinary'
import { renderToBuffer } from '@react-pdf/renderer'
import { PortfolioDocument } from '@/components/pdf/PortfolioDocument'
import type { ExportConfig } from '@/lib/portfolio/types'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 300

function sse(controller: ReadableStreamDefaultController, event: string, data: any) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!hasFullAccess(session.user.role as any)) return new Response('Forbidden', { status: 403 })

  const config = (await req.json()) as ExportConfig
  if (!config?.name || !config?.exportType) return new Response('Bad config', { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sse(controller, 'auth_ok', {})

        const all = await db
          .select({ id: projects.id, projectType: projects.projectType, country: projects.country, status: projects.status })
          .from(projects)
        const ids = resolveProjectIds(config, all as any)
        if (ids.length === 0 && config.exportType !== 'full') {
          sse(controller, 'error', { stage: 'projects_resolved', message: 'no_projects_match' })
          controller.close(); return
        }
        sse(controller, 'projects_resolved', { count: ids.length })

        const bundle = await loadPortfolioBundle(ids)
        sse(controller, 'data_loaded', {})

        // Resolve logo + CEO photo URLs (best-effort)
        let logoUrl: string | undefined
        let ceoPhotoUrl: string | undefined
        if (bundle.settings.ceoPhotoCloudinaryId) {
          const [asset] = await db.select().from(cloudinaryAssets)
            .where(/* eq */ (cloudinaryAssets.id as any).eq?.(bundle.settings.ceoPhotoCloudinaryId) ?? undefined as any)
            .limit(1) as any
          if (asset) ceoPhotoUrl = asset.secureUrl
        }

        const buffer = await renderToBuffer(
          React.createElement(PortfolioDocument, { bundle, config, logoUrl, ceoPhotoUrl }),
        )
        sse(controller, 'pdf_rendered', { bytes: buffer.byteLength })

        const upload = await uploadBufferToCloudinary(buffer, { folder: 'portfolio-exports' })
        sse(controller, 'uploaded', {})

        // Persist the cloudinary asset row, then the export row
        const [assetRow] = await db.insert(cloudinaryAssets).values({
          publicId: upload.publicId,
          url: upload.url,
          secureUrl: upload.secureUrl,
          assetType: 'portfolio_pdf' as any,
          format: upload.format,
          bytes: upload.bytes,
          uploadedBy: session.user.userId,
          createdBy: session.user.userId,
        }).returning()

        const exportRow = await insertPortfolioExport({
          name: config.name,
          exportType: config.exportType,
          projectIdsIncluded: ids,
          sectionsConfig: config.sections,
          filterConfig: { projectTypes: config.projectTypes, countries: config.countries, projectIds: config.projectIds },
          language: config.language,
          outputCloudinaryId: assetRow.id,
          fileSizeBytes: upload.bytes,
          pageCount: 0, // page count is hard to know without re-parsing; leave 0 for now
          generatedBy: session.user.userId,
          notes: config.notes,
        })

        sse(controller, 'done', { exportId: exportRow.id, secureUrl: upload.secureUrl })
        controller.close()
      } catch (err: any) {
        sse(controller, 'error', { stage: 'unknown', message: err?.message ?? String(err) })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

> Note: the `cloudinaryAssets.id.eq?.(...)` line is a placeholder — replace with the actual Drizzle pattern used elsewhere in the codebase: `where(eq(cloudinaryAssets.id, bundle.settings.ceoPhotoCloudinaryId))` (import `eq` from `drizzle-orm`). The plan keeps both visible so the engineer makes a deliberate choice.

- [ ] **Step 2: Fix the CEO photo query**

Replace the `if (bundle.settings.ceoPhotoCloudinaryId) { ... }` block with:

```ts
import { eq } from 'drizzle-orm'
// ...
if (bundle.settings.ceoPhotoCloudinaryId) {
  const [asset] = await db.select().from(cloudinaryAssets)
    .where(eq(cloudinaryAssets.id, bundle.settings.ceoPhotoCloudinaryId))
    .limit(1)
  if (asset) ceoPhotoUrl = asset.secureUrl
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/portfolio/generate/route.ts
git commit -m "feat(portfolio): generation api route with SSE"
```

---

## Task 14 — Exports list/get/delete + download counter routes

**Files:**
- Create: `src/app/api/portfolio/exports/route.ts`
- Create: `src/app/api/portfolio/exports/[id]/route.ts`
- Create: `src/app/api/portfolio/exports/[id]/download/route.ts`

- [ ] **Step 1: List route**

```ts
// exports/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { listPortfolioExports } from '@/lib/db/portfolio'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role as any)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const rows = await listPortfolioExports()
  return NextResponse.json(rows)
}
```

- [ ] **Step 2: Get + delete route**

```ts
// exports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { getPortfolioExport, deletePortfolioExport } from '@/lib/db/portfolio'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role as any)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { id } = await params
  const row = await getPortfolioExport(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role as any)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { id } = await params
  await deletePortfolioExport(id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Download route (increments + redirects)**

```ts
// exports/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { getPortfolioExport, incrementDownload } from '@/lib/db/portfolio'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!hasFullAccess(session.user.role as any)) return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { id } = await params
  const row = await getPortfolioExport(id)
  if (!row?.assetUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await incrementDownload(id)
  return NextResponse.redirect(row.assetUrl, { status: 302 })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/portfolio/exports
git commit -m "feat(portfolio): list/get/delete/download endpoints"
```

---

## Task 15 — Settings API route

**Files:**
- Create: `src/app/api/portfolio/settings/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPortfolioSettings, upsertPortfolioSettings } from '@/lib/db/portfolio'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const row = await getPortfolioSettings()
  return NextResponse.json(row)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const patch = await req.json()
  const row = await upsertPortfolioSettings(patch, session.user.userId)
  return NextResponse.json(row)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/portfolio/settings
git commit -m "feat(portfolio): settings api"
```

---

## Task 16 — Single-project export-card route

**Files:**
- Create: `src/app/api/projects/[id]/export-card/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { isDirection, isAdmin } from '@/lib/auth-utils'
import type { ExportConfig, SectionToggles } from '@/lib/portfolio/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!(isDirection(session.user.role as any) || isAdmin(session.user.role as any)))
    return new Response('Forbidden', { status: 403 })
  const { id } = await params

  const sections: SectionToggles = {
    cover: false, company: false, certifications: false, team: false,
    projectTypes: false, projects: true, realisation: true, entretien: false,
    eclairageDecoration: false, rse: false, clients: false, achievements: false, contacts: false,
  }
  const config: ExportConfig = {
    name: `Fiche projet — ${new Date().toISOString().slice(0, 10)}`,
    exportType: 'single_project',
    projectIds: [id],
    sections,
    language: 'fr',
  }

  // Delegate to the main generation endpoint by re-issuing the request server-side
  const url = new URL('/api/portfolio/generate', req.url)
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
    body: JSON.stringify(config),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/projects
git commit -m "feat(portfolio): single-project export-card shortcut"
```

---

## Task 17 — Settings page UI

**Files:**
- Create: `src/app/admin/(dashboard)/settings/portfolio/page.tsx`
- Create: `src/app/admin/(dashboard)/settings/portfolio/PortfolioSettingsForm.tsx`

- [ ] **Step 1: Server page**

```tsx
// page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPortfolioSettings } from '@/lib/db/portfolio'
import { PortfolioSettingsForm } from './PortfolioSettingsForm'

export default async function PortfolioSettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/admin')
  const settings = await getPortfolioSettings()
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Paramètres du portfolio</h1>
      <PortfolioSettingsForm initial={settings} />
    </div>
  )
}
```

- [ ] **Step 2: Client form**

```tsx
// PortfolioSettingsForm.tsx
'use client'
import { useState } from 'react'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const TEXT_FIELDS: Array<[keyof PortfolioSettings, string]> = [
  ['companyTagline', 'Tagline (Mission & Vision)'],
  ['ceoName', 'Nom du PDG'], ['ceoTitle', 'Titre du PDG'],
  ['companyAddress', 'Adresse'], ['phone1', 'Téléphone 1'], ['phone2', 'Téléphone 2'],
  ['email', 'Email'], ['website', 'Site web'],
  ['facebookUrl', 'Facebook'], ['instagramHandle', 'Instagram (@)'],
  ['isoCertNumber', 'Numéro ISO 9001'], ['rseLabelLevel', 'Niveau Label RSE'],
]

export function PortfolioSettingsForm({ initial }: { initial: PortfolioSettings }) {
  const [v, setV] = useState<PortfolioSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/portfolio/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    })
    setSaving(false)
    setMsg(res.ok ? 'Enregistré.' : 'Erreur')
  }

  return (
    <form className="space-y-3 max-w-2xl" onSubmit={(e) => { e.preventDefault(); save() }}>
      {TEXT_FIELDS.map(([key, label]) => (
        <label key={key as string} className="block">
          <span className="text-sm">{label}</span>
          <input className="w-full border rounded px-2 py-1"
            value={(v as any)[key] ?? ''}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </label>
      ))}
      <div className="flex gap-4 items-center">
        <label>
          <span className="text-sm block">Couleur de couverture</span>
          <input type="color" value={v.coverBackgroundColor}
                 onChange={(e) => setV({ ...v, coverBackgroundColor: e.target.value })} />
        </label>
        <label>
          <span className="text-sm block">Couleur d'accent</span>
          <input type="color" value={v.accentColor}
                 onChange={(e) => setV({ ...v, accentColor: e.target.value })} />
        </label>
      </div>
      <button type="submit" disabled={saving}
              className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(dashboard)/settings/portfolio
git commit -m "feat(portfolio): settings UI"
```

---

## Task 18 — Export wizard UI

**Files:**
- Create: `src/app/admin/(dashboard)/direction/portfolio/export/page.tsx`
- Create: `src/app/admin/(dashboard)/direction/portfolio/export/ExportWizard.tsx`
- Create: `src/app/admin/(dashboard)/direction/portfolio/export/ProjectPicker.tsx`

- [ ] **Step 1: Server page**

```tsx
// page.tsx
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects } from '../../../../../../../db/schema'
import { eq } from 'drizzle-orm'
import { ExportWizard } from './ExportWizard'

export default async function PortfolioExportPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasFullAccess(session.user.role as any)) redirect('/admin')

  const completed = await db
    .select({ id: projects.id, name: projects.name, projectType: projects.projectType, country: projects.country, conceptTitle: projects.conceptTitle })
    .from(projects).where(eq(projects.status, 'completed'))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Générer un portfolio</h1>
      <ExportWizard projects={completed} />
    </div>
  )
}
```

- [ ] **Step 2: ProjectPicker**

```tsx
'use client'
import { useState } from 'react'

export type PickerProject = { id: string; name: string; projectType: string; country: string; conceptTitle: string | null }

export function ProjectPicker({ projects, selected, onChange }: {
  projects: PickerProject[]; selected: Set<string>; onChange: (next: Set<string>) => void
}) {
  const [q, setQ] = useState('')
  const filtered = projects.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.conceptTitle ?? '').toLowerCase().includes(q.toLowerCase()))
  function toggle(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }
  return (
    <div className="border rounded p-3 max-h-96 overflow-auto">
      <input className="w-full border rounded px-2 py-1 mb-2"
             placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      {filtered.map((p) => (
        <label key={p.id} className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
          <span className="flex-1">{p.name} <span className="text-xs text-gray-500">· {p.country} · {p.projectType}</span></span>
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: ExportWizard with SSE consumer**

```tsx
'use client'
import { useState } from 'react'
import { ProjectPicker, type PickerProject } from './ProjectPicker'
import { DEFAULT_SECTIONS, type ExportConfig, type SectionToggles } from '@/lib/portfolio/types'

const SECTION_LABELS: Record<keyof SectionToggles, string> = {
  cover: 'Page de couverture', company: "Présentation de l'entreprise",
  certifications: 'Certifications', team: 'Notre équipe',
  projectTypes: 'Nos types de projets', projects: 'Projets',
  realisation: 'Partie Réalisation', entretien: 'Partie Entretien',
  eclairageDecoration: 'Éclairage & Décoration', rse: 'Activités RSE',
  clients: 'Ils nous font confiance', achievements: 'Nos réalisations en chiffres',
  contacts: 'Contacts',
}

type Stage = 'idle' | 'projects_resolved' | 'data_loaded' | 'pdf_rendered' | 'uploaded' | 'done' | 'error'

export function ExportWizard({ projects }: { projects: PickerProject[] }) {
  const [name, setName] = useState('Portfolio SOPAT 2026')
  const [exportType, setExportType] = useState<ExportConfig['exportType']>('full')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sections, setSections] = useState<SectionToggles>(DEFAULT_SECTIONS)
  const [stage, setStage] = useState<Stage>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function generate() {
    setStage('idle'); setDownloadUrl(null); setErrorMsg(null)
    const config: ExportConfig = {
      name,
      exportType,
      projectIds: exportType === 'custom' ? [...selected] : undefined,
      sections,
      language: 'fr',
    }
    const res = await fetch('/api/portfolio/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    })
    if (!res.body) { setErrorMsg('Pas de flux SSE'); return }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const events = buf.split('\n\n')
      buf = events.pop() ?? ''
      for (const block of events) {
        const evMatch = block.match(/^event: (.+)$/m)
        const dataMatch = block.match(/^data: (.+)$/m)
        if (!evMatch) continue
        const ev = evMatch[1]
        const data = dataMatch ? JSON.parse(dataMatch[1]) : {}
        if (ev === 'projects_resolved') { setStage('projects_resolved'); setProgressMsg(`Chargement des projets… (${data.count})`) }
        if (ev === 'data_loaded')        { setStage('data_loaded');       setProgressMsg('Génération des pages…') }
        if (ev === 'pdf_rendered')       { setStage('pdf_rendered');      setProgressMsg('Compilation du PDF…') }
        if (ev === 'uploaded')           { setStage('uploaded');          setProgressMsg('Téléchargement vers Cloudinary…') }
        if (ev === 'done')               { setStage('done');              setDownloadUrl(data.secureUrl) }
        if (ev === 'error')              { setStage('error');             setErrorMsg(data.message ?? 'Erreur') }
      }
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <label className="block">
        <span className="text-sm">Nom de l'export</span>
        <input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="block">
        <span className="text-sm">Type d'export</span>
        <select className="w-full border rounded px-2 py-1" value={exportType}
                onChange={(e) => setExportType(e.target.value as any)}>
          <option value="full">Complet</option>
          <option value="by_type">Par type</option>
          <option value="by_country">Par pays</option>
          <option value="custom">Personnalisé</option>
        </select>
      </label>

      {exportType === 'custom' && (
        <ProjectPicker projects={projects} selected={selected} onChange={setSelected} />
      )}

      <fieldset className="border rounded p-3">
        <legend className="text-sm font-semibold">Sections</legend>
        {(Object.keys(SECTION_LABELS) as (keyof SectionToggles)[]).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} />
            <span>{SECTION_LABELS[k]}</span>
          </label>
        ))}
      </fieldset>

      <button onClick={generate} className="px-4 py-2 bg-emerald-700 text-white rounded">
        Générer le Portfolio
      </button>

      {stage !== 'idle' && stage !== 'error' && (
        <div className="border rounded p-3 bg-emerald-50">
          <p className="text-sm">{progressMsg}</p>
        </div>
      )}
      {downloadUrl && (
        <a href={downloadUrl} target="_blank" rel="noreferrer"
           className="inline-block px-4 py-2 bg-emerald-900 text-white rounded">
          Télécharger le PDF
        </a>
      )}
      {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Smoke check (manual)**

Run `npm run dev`, open `/admin/direction/portfolio/export`, type a name, leave type=Complet, click Générer. Verify the four progress messages appear in order and the download button appears.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(dashboard)/direction/portfolio/export
git commit -m "feat(portfolio): export wizard UI"
```

---

## Task 19 — History page

**Files:**
- Create: `src/app/admin/(dashboard)/direction/portfolio/history/page.tsx`
- Create: `src/app/admin/(dashboard)/direction/portfolio/history/HistoryTable.tsx`

- [ ] **Step 1: Server page**

```tsx
import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { listPortfolioExports } from '@/lib/db/portfolio'
import { HistoryTable } from './HistoryTable'

export default async function PortfolioHistoryPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasFullAccess(session.user.role as any)) redirect('/admin')
  const rows = await listPortfolioExports()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Historique des exports</h1>
      <HistoryTable rows={rows as any} />
    </div>
  )
}
```

- [ ] **Step 2: Client table with delete**

```tsx
'use client'
import { useState } from 'react'

type Row = { e: any; assetUrl: string | null; generatorName: string | null }

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function HistoryTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial)
  async function del(id: string) {
    if (!confirm('Supprimer cet export ?')) return
    const res = await fetch(`/api/portfolio/exports/${id}`, { method: 'DELETE' })
    if (res.ok) setRows((r) => r.filter((x) => x.e.id !== id))
  }
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left p-2">Nom</th><th>Type</th><th>Date</th>
          <th>Projets</th><th>Auteur</th><th>Taille</th><th>Téléchargements</th><th></th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.e.id} className="border-t">
            <td className="p-2">{r.e.name}</td>
            <td className="text-center">{r.e.exportType}</td>
            <td className="text-center">{new Date(r.e.generatedAt).toLocaleDateString('fr-FR')}</td>
            <td className="text-center">{r.e.projectIdsIncluded?.length ?? 0}</td>
            <td className="text-center">{r.generatorName ?? '—'}</td>
            <td className="text-center">{fmtSize(r.e.fileSizeBytes)}</td>
            <td className="text-center">{r.e.downloadCount}</td>
            <td className="text-center">
              {r.assetUrl && (
                <a className="text-emerald-700 underline" href={`/api/portfolio/exports/${r.e.id}/download`} target="_blank" rel="noreferrer">
                  Télécharger
                </a>
              )}
            </td>
            <td className="text-center">
              <button className="text-red-700" onClick={() => del(r.e.id)}>Supprimer</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(dashboard)/direction/portfolio/history
git commit -m "feat(portfolio): history page"
```

---

## Task 20 — Self-review & end-to-end smoke

- [ ] **Step 1: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 2: Tests**

Run: `npx vitest run src/lib/portfolio`
Expected: all PASS.

- [ ] **Step 3: Manual end-to-end smoke**

1. Visit `/admin/settings/portfolio` as admin → fill in CEO name + tagline + ISO number, save.
2. Visit `/admin/direction/portfolio/export` as direction → click Générer with default `Complet`. Watch all four progress lines fire. Click Télécharger.
3. Open the PDF — verify cover, company, certifications, projects, achievements, contacts pages render and that images appear.
4. Visit `/admin/direction/portfolio/history` → the new row is there, download count increments on click, delete removes it.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(portfolio): smoke pass"
```

---

## Self-review (already done)

- Every spec section maps to a task: schema (T1), types (T2), helpers (T3-4), DB (T5), loader (T6), PDF (T7-11), upload (T12), generation API + auth (T13), exports CRUD (T14), settings API (T15), single-project (T16), settings UI (T17), wizard (T18), history (T19), smoke (T20).
- No placeholders left. The one `eq?.(...)` line is fixed in Step 2 of Task 13 — left visible deliberately so the engineer sees the correction.
- Type names consistent: `ExportConfig`, `SectionToggles`, `PortfolioBundle`, `ProjectWithAssets`, `TeamGroup`, `AchievementsNumbers`, `RseEventSummary`, `FeaturedClient` used everywhere.
- `pageCount` is intentionally `0` in the insert — counting pages from `@react-pdf/renderer` would require parsing the rendered PDF; out of v1.
