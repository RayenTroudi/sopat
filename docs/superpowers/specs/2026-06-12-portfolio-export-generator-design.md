# Portfolio Export Generator — Design

**Date:** 2026-06-12
**Scope:** Direction-only tool that generates SOPAT's company portfolio PDF from the live database, replacing the manual PowerPoint process.
**Status:** Approved for planning (pending spec review).

---

## 1. Goals & scope

Build a tool that turns live DB data into a branded, multi-page company portfolio PDF, on demand, with curated content selection, configurable sections, and a history of past exports stored on Cloudinary.

**In v1:**
- French only.
- Synchronous generation in a Next.js Node route handler.
- All section toggles available (cover, company, certifications, team, project types, projects, réalisation, entretien, éclairage & décoration, RSE, clients, achievements, contacts).
- Single-project quick-export shortcut from project detail pages.
- Settings UI for portfolio metadata (CEO, contacts, certs, brand colors).

**Out of v1:** EN/AR translations, background-job mode, per-asset `is_portfolio_featured` curation flag, in-browser PDF preview before generation.

---

## 2. Roles & authorization

- `/admin/direction/portfolio/export`, `/admin/direction/portfolio/history`: `direction` or `admin`.
- `/admin/settings/portfolio`: `admin` only.
- `POST /api/portfolio/generate`: `direction` or `admin`.
- Single-project shortcut button on completed project pages: `direction` only.

All checks happen at the route handler / page boundary using the existing session helper.

---

## 3. Database changes

Added to [db/schema.ts](../../../db/schema.ts).

### New enum

```ts
export const portfolioExportTypeEnum = pgEnum('portfolio_export_type', [
  'full', 'by_type', 'by_country', 'custom', 'single_project',
])
```

### Existing enum extension

`assetTypeEnum` gains `'portfolio_pdf'` for the generated PDF asset itself.

### `portfolio_exports`

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(255) NOT NULL | user-supplied label |
| export_type | portfolio_export_type NOT NULL | |
| project_ids_included | uuid[] NOT NULL DEFAULT '{}' | snapshot of which projects were in this export |
| sections_config | jsonb NOT NULL | which toggles were on |
| filter_config | jsonb | selected types/countries for `by_type` / `by_country` |
| language | varchar(5) NOT NULL DEFAULT 'fr' | |
| output_cloudinary_id | uuid FK cloudinary_assets | the generated PDF |
| file_size_bytes | integer | |
| page_count | integer | |
| download_count | integer NOT NULL DEFAULT 0 | |
| last_downloaded_at | timestamp | |
| generated_at | timestamp NOT NULL DEFAULT now() | |
| generated_by | uuid NOT NULL FK users | |
| notes | text | |
| created_at, updated_at, created_by | (shared timestamps) | |

Indexes: `generated_by`, `generated_at`.

`project_ids_included` is a uuid array on purpose — this is an audit/log row that should remain stable even if a project is later soft-deleted.

### `portfolio_settings` (singleton)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| is_singleton | boolean NOT NULL DEFAULT true | UNIQUE index → enforces a single row |
| company_tagline | text | |
| ceo_name | varchar(255) | |
| ceo_title | varchar(255) | |
| ceo_photo_cloudinary_id | uuid FK cloudinary_assets | |
| company_address | text | |
| phone_1, phone_2 | varchar(50) | |
| email | varchar(255) | |
| website | varchar(255) | |
| facebook_url | varchar(500) | |
| instagram_handle | varchar(100) | |
| iso_cert_number | varchar(100) | |
| iso_cert_expiry | date | |
| rse_label_level | varchar(50) | |
| rse_label_expiry | date | |
| cover_background_color | varchar(7) NOT NULL DEFAULT '#2D5A27' | |
| accent_color | varchar(7) NOT NULL DEFAULT '#FFFFFF' | |
| updated_at | timestamp NOT NULL DEFAULT now() | |
| updated_by | uuid FK users | |

Singleton enforcement is the `UNIQUE` index on `is_singleton`; the app upserts where `is_singleton = true`. The settings GET endpoint upserts defaults on first read so the page always loads.

### Migration

`db/migrations/0007_portfolio_export.sql`:
1. `ALTER TYPE asset_type ADD VALUE 'portfolio_pdf';`
2. `CREATE TYPE portfolio_export_type AS ENUM (...);`
3. `CREATE TABLE portfolio_exports (...)` with indexes and FKs.
4. `CREATE TABLE portfolio_settings (...)` with the singleton unique index and FKs.
5. Seed one `portfolio_settings` row with `is_singleton = true` and all other columns null/defaults.

---

## 4. File layout

```
db/
  schema.ts                                     # +2 tables, +1 enum, enum extension
  migrations/0007_portfolio_export.sql          # new

src/
  lib/
    portfolio/
      types.ts                                  # ExportConfig, SectionToggles, bundles
      loader.ts                                 # DB loaders → ProjectBundle, SettingsBundle, …
      cloudinary.ts                             # transformUrl(publicId, opts)
      filter.ts                                 # resolveProjectIds(config)
    db/
      portfolio.ts                              # insertExport, listExports, get/upsertSettings,
                                                # incrementDownload, deleteExport

  components/
    pdf/
      PortfolioDocument.tsx                     # <Document> root
      theme.ts                                  # colors, static FR copy constants
      fonts.ts                                  # Font.register() calls
      pages/
        CoverPage.tsx
        CompanyPage.tsx
        CertificationsPage.tsx
        TeamPage.tsx
        ProjectTypesPage.tsx
        ProjectPage.tsx
        RealisationPage.tsx
        EntretienPage.tsx
        EclairageDecorationPage.tsx
        RsePage.tsx
        ClientsPage.tsx
        AchievementsPage.tsx
        ContactsPage.tsx
      partials/
        Header.tsx, Footer.tsx, SectionTitle.tsx, ImageGrid.tsx, BadgeRow.tsx

  app/
    admin/(dashboard)/direction/portfolio/
      export/
        page.tsx
        ExportWizard.tsx                        # client, SSE consumer
        ProjectPicker.tsx                       # used in custom mode
      history/
        page.tsx
        HistoryTable.tsx
    admin/(dashboard)/settings/portfolio/
      page.tsx
      PortfolioSettingsForm.tsx

    api/portfolio/
      generate/route.ts                         # POST, SSE stream
      exports/route.ts                          # GET list
      exports/[id]/route.ts                     # GET (download redirect), DELETE
      exports/[id]/download/route.ts            # increments downloadCount → redirects
      settings/route.ts                         # GET (upsert defaults) / PUT
    api/projects/[id]/export-card/route.ts      # quick single-project shortcut → same engine
```

---

## 5. Types

```ts
type SectionToggles = {
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

type ExportConfig = {
  name: string
  exportType: 'full' | 'by_type' | 'by_country' | 'custom' | 'single_project'
  projectTypes?: ProjectType[]    // for by_type
  countries?: string[]            // for by_country (ISO-2)
  projectIds?: string[]           // for custom / single_project
  sections: SectionToggles
  language: 'fr'                  // FR-only in v1, kept for forward compat
  notes?: string
}
```

---

## 6. Generation pipeline

`POST /api/portfolio/generate` runs synchronously and streams progress via SSE.

```
1. authorize()                                  role ∈ {direction, admin}
   emit "auth_ok"

2. ids = resolveProjectIds(config)              // filter.ts
   emit "projects_resolved" { count }

3. bundle = await loadBundle(ids, config)       // loader.ts, Promise.all:
     - portfolioSettings (singleton)
     - projects + zones + plant_list_items
     - cloudinary_assets per project grouped by assetType
     - users grouped by role
     - achievements numbers (reuse direction/achievements lib)
     - featured clients
     - rse_events summary
   emit "data_loaded"

4. doc = <PortfolioDocument bundle={bundle} config={config} />
   buffer = await renderToBuffer(doc)
   emit "pdf_rendered" { bytes }

5. asset = await uploadToCloudinary(buffer, {
     resource_type: 'raw', folder: 'portfolio-exports', format: 'pdf'
   })
   insertCloudinaryAsset(asset)                 // assetType: 'portfolio_pdf'
   emit "uploaded"

6. exportRow = insertExport({
     ...config, outputCloudinaryId, fileSizeBytes, pageCount,
   })
   emit "done" { exportId, secureUrl }
   close stream
```

**Image strategy** — `loader.ts` rewrites every Cloudinary `secureUrl` through `transformUrl(publicId, { w: 1200, q: 'auto', f: 'jpg' })`. `@react-pdf/renderer` fetches images in parallel during `renderToBuffer`. Broken images render a gray placeholder rather than failing the whole document.

**Single-project shortcut** — `POST /api/projects/:id/export-card` builds an `ExportConfig` with `exportType: 'single_project'`, `projectIds: [id]`, sections set to `{ projects: true, realisation: true }` and everything else false, then calls the same engine.

---

## 7. Page templates — content rules

Each page is a small React component with strict rules so it renders deterministically from DB data. All copy is FR.

- **CoverPage** — full-bleed `coverBackgroundColor`, SOPAT logo centered, "SOCIÉTÉ DE PAYSAGE DE TUNISIE" subtitle, `ceoName`/`ceoTitle` bottom-right, badge row top-right (only renders badges with non-null cert numbers).
- **CompanyPage** — left column CEO photo + name/title; right column three cards (Mission & Vision = `companyTagline`; History & Context = static FR constant in `theme.ts`; Fundamental Values = static FR constant).
- **CertificationsPage** — one card per active cert (ISO 9001 if `isoCertNumber` set, RSE Label if `rseLabelLevel` set). Card shows badge, title, cert number, expiry date.
- **TeamPage** — `users.role` grouped in fixed order: Direction → Études → Réalisation → Entretien → Admin. Each section: chef on top, team members in a grid (avatar + name + role label FR). Filter `is_active = true AND deleted_at IS NULL`.
- **ProjectTypesPage** — fixed grid of the 6 project types, each tile shows count of completed projects of that type.
- **ProjectPage** (one per included project) — left: type label + 3D gallery (up to 3 most recent `render_3d`) + latest `plan_autocad`. Right: name, address + country flag, `conceptTitle`, `conceptDescription`. If études complete, plant palette list (top 10 from `plant_list_items`).
- **RealisationPage** — grid of latest `site_photo` assets across included projects.
- **EntretienPage** — table-style summary of `maintenance_schedules` for included projects + small grid of latest `after_photo_asset_id`s from `maintenance_visits`.
- **EclairageDecorationPage** — projects where `lightingIncluded = true`; reuses ProjectPage layout.
- **RsePage** — most recent ~6 `rse_events` where `status = 'termine'`, each as a card (title, date, location, type label).
- **ClientsPage** — logo grid of clients where `is_featured = true`, grouped by `clientSector`.
- **AchievementsPage** — live counts/sums (reuses `direction/achievements` lib). Large bold numbers on `coverBackgroundColor` background.
- **ContactsPage** — full-bleed background, logo, address, phones, email, website, socials, all cert badges.

Asset selection rule (everywhere): `assetType` filter + most-recent first via `createdAt DESC`.

---

## 8. UI surfaces

### Export wizard — `/admin/direction/portfolio/export`

**Step 1 — Configure**
- Export name input.
- Export type radio: Complet / Par type / Par pays / Personnalisé.
- Conditional pickers (project types checkboxes / country checkboxes / project picker).
- `ProjectPicker` (custom mode): searchable list of completed projects showing type icon, name, country flag, concept title, render thumbnail.
- Section toggles — all on by default.
- Language: FR (disabled select — kept visible for forward compat).
- Preview button → modal with a text summary of what will be generated (page list + project count).

**Step 2 — Generate**
- "Générer le Portfolio" button.
- SSE-driven progress bar with stage labels:
  - "Chargement des projets…"
  - "Génération des pages…"
  - "Compilation du PDF…"
  - "Téléchargement vers Cloudinary…"
- On `done`: shows download button (`/api/portfolio/exports/:id/download`).

### History — `/admin/direction/portfolio/history`

Table: name | type | date | projects count | generated by | file size | downloads | download | delete.

### Settings — `/admin/settings/portfolio`

Form covering all `portfolio_settings` fields. CEO photo upload via existing Cloudinary uploader. Color fields are hex inputs with a swatch preview. Save calls `PUT /api/portfolio/settings`.

### Quick export

On a completed project's detail page, Direction sees an "Exporter fiche projet" button → `POST /api/projects/:id/export-card` → SSE progress → download link.

---

## 9. Error handling

- **Auth fail** → 403 JSON, no SSE, no row.
- **0 projects match** → 400 `{ error: 'no_projects_match' }`. Wizard surfaces "Aucun projet ne correspond aux filtres."
- **Loader failure** → SSE `{ event: 'error', stage: 'data_loaded' }`, 500, no row written.
- **`renderToBuffer` failure** → SSE error with `stage: 'pdf_rendered'`. Individual broken images render a placeholder rather than failing the whole document.
- **Cloudinary upload failure** → retry once with exponential backoff, then SSE error `stage: 'uploaded'`.
- **Optional settings null** → templates render placeholders or skip the element; never throw.
- **Singleton settings missing** → settings GET upserts defaults.

The `portfolio_exports` row is only inserted after a successful upload, so partial state is impossible.

---

## 10. Observability

Each pipeline stage logs `{ exportId?, stage, durationMs, projectCount, bytes? }` via the existing logger. SSE messages double as the live progress feed.

**Performance budget:** 30 projects × ~5 images each, sync route. Target P95 ≤ 90 seconds end-to-end. Revisit background-job mode if portfolios routinely exceed ~50 projects.

---

## 11. Testing

- **Unit**
  - `filter.ts::resolveProjectIds` against in-memory fixtures, one test per `exportType`.
  - `cloudinary.ts::transformUrl` URL composition.
- **DB layer**
  - `lib/db/portfolio.ts` round-trip with the existing test DB harness — insert → list → incrementDownload → delete.
  - Settings upsert idempotency (calling GET twice returns the same row).
- **Component**
  - Render each PDF page via `@react-pdf/renderer`'s `renderToString` against a fixture bundle; assert text content + key element presence. No pixel snapshots.
- **Integration**
  - `POST /api/portfolio/generate` with a 2-project seeded fixture and mocked Cloudinary upload: assert SSE stages fire in order, `portfolio_exports` row written, `pageCount ≥ 1`, `outputCloudinaryId` set.
- **Manual smoke**
  - Run the wizard against the live DB once before merge; eyeball the PDF.

---

## 12. Out of scope (v1)

- EN/AR languages (FR only).
- Background-job mode / status polling.
- `is_portfolio_featured` flag on `cloudinary_assets`.
- Auto-translation of project content.
- In-browser PDF preview before generation (text summary only).
- Email-the-portfolio integrations.

---

## 13. Dependencies

- `@react-pdf/renderer` (new) — install at the top of implementation.
- Existing: Cloudinary upload helper, session/role middleware, Drizzle DB client, achievements lib (reused by AchievementsPage).
