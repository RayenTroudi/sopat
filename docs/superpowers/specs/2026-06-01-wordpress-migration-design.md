# WordPress → Next.js Migration Design
**Date:** 2026-06-01  
**Status:** Approved

## Overview

Migrate sopat.tn WordPress site to a self-contained Next.js app backed by Neon PostgreSQL (via Prisma) and Cloudinary for images. After migration, the app has zero runtime dependency on the WordPress API.

## Architecture

Two outputs:

1. **`scripts/migrate.ts`** — one-time migration script (idempotent, safe to re-run)
2. **`src/lib/api.ts` rewrite** — same exported function signatures, Prisma instead of `fetch()`

App pages and components change zero lines.

## Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Post {
  id            Int      @id
  slug          String   @unique
  title         String
  content       String   @db.Text
  excerpt       String   @db.Text
  date          DateTime
  modified      DateTime?
  author        Int
  featuredImage String?
  categories    Int[]
  tags          Int[]
  status        String
  createdAt     DateTime @default(now())
}

model Page {
  id            Int      @id
  slug          String   @unique
  title         String
  content       String   @db.Text
  parent        Int
  menuOrder     Int
  featuredImage String?
  status        String
  createdAt     DateTime @default(now())
}

model Tag {
  id    Int    @id
  slug  String @unique
  name  String
  count Int
}

model Category {
  id    Int    @id
  slug  String @unique
  name  String
  count Int
}

model MediaMapping {
  id            Int      @id @default(autoincrement())
  originalUrl   String   @unique
  cloudinaryUrl String
  publicId      String
  createdAt     DateTime @default(now())
}
```

## `src/lib/db.ts`

Singleton Prisma client (standard Next.js pattern):

```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Migration Script (`scripts/migrate.ts`)

### Phase 1 — Cloudinary Upload
- Read 1,645 URLs from `scripts/image-urls.json`
- Check `MediaMapping` table before uploading (idempotent)
- Batch of 5 concurrent uploads via `Promise.all`, 100ms delay between batches
- Options: `folder: "sopat"`, `use_filename: true`, `unique_filename: false`, `overwrite: false`, `resource_type: "auto"`
- Log every 50 uploads; log failures without stopping
- Update `scripts/migration-progress.json` on phase complete

### Phase 2 — Content Transform
- Load `MediaMapping` into `Map<originalUrl, cloudinaryUrl>`
- `replaceImageUrls(html)` — replaces all `sopat.tn/wp-content/uploads/` URLs from map; logs warnings for misses
- `cleanElementorContent(html)` — extracts `.elementor-widget-container` inner content if Elementor wrapper detected, then runs `replaceImageUrls`

### Phase 3 — Save to DB
Order: Categories → Tags → Posts → Pages (all upserted)
- Posts: `cleanElementorContent(content.rendered)`, `replaceImageUrls(excerpt.rendered)`, resolve `featuredImage` from `/wp-json/wp/v2/media/{id}` → Cloudinary lookup
- Pages: same pattern

### Phase 4 — Verification
- DB counts vs expected: posts=14, pages=7, tags=22, categories=1, MediaMapping≈1645
- Scan 3 random post contents for remaining `sopat.tn/wp-content/uploads/` URLs
- Log all posts/pages with unreplaced URLs

### Phase 5 — Progress File
`scripts/migration-progress.json` updated after each phase:
```json
{
  "phase1_images": { "total": 1645, "uploaded": 0, "failed": 0, "skipped": 0 },
  "phase2_content": { "status": "pending" },
  "phase3_database": { "posts": 0, "pages": 0, "tags": 0, "categories": 0 },
  "phase4_verification": { "status": "pending" },
  "lastRun": ""
}
```

### Error Handling
Every phase wrapped in try/catch — individual failures logged, script continues.

### Concurrency & Rate Limits
- Cloudinary: 5 concurrent, 100ms between batches
- DB upserts: sequential per entity type

### Final Summary Output
```
╔══════════════════════════════╗
║     MIGRATION SUMMARY        ║
╠══════════════════════════════╣
║ Images uploaded:   XXXX      ║
║ Images skipped:    XXXX      ║
║ Images failed:     XXXX      ║
║ Posts saved:       14        ║
║ Pages saved:       7         ║
║ Tags saved:        22        ║
║ Categories saved:  1         ║
║ Old URLs remaining: 0        ║
╚══════════════════════════════╝
```

## `src/lib/api.ts` Rewrite

### Unchanged (zero caller changes)
All exported types: `WPPost`, `WPPage`, `WPMedia`, `WPCategory`, `WPTag`, `WPUser`, `BlogPost`

All exported functions with identical signatures:
`getPosts`, `getPostBySlug`, `getAllPostSlugs`, `getPages`, `getPageBySlug`, `getAllPageSlugs`, `getMediaById`, `getCategories`, `getTags`, `getAllBlogPosts`, `getBlogPostBySlug`, `sanitizeHtml`, `stripHtml`, `extractFirstImage`, `proxyContentImages`, `cleanWordPressContent`, `formatDate`, `inferBlogCategory`

### Changed Internally
- `wpFetch` / `wpFetchAll` removed
- All data functions use `prisma.*` queries
- `getMediaById(id)` reads from `MediaMapping` table
- `proxyContentImages()` kept as no-op passthrough (URLs already Cloudinary)
- `revalidate` cache hints removed

### DB → WP Shape Mapping
Prisma row fields are wrapped to match `WPRendered` shape callers expect:
```ts
{ title: { rendered: row.title }, content: { rendered: row.content }, ... }
```

## Dependencies to Install
```
npm install @prisma/client prisma cloudinary dotenv
```

## `package.json` Script Addition
```json
"migrate": "npx tsx scripts/migrate.ts"
```
