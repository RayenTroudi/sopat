# Nursery Stock Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SOPAT's internal nursery plant stock management system — a full CRUD dashboard for tracking what's growing in the SOPAT pépinière, a movement ledger, Études integration (availability badge + reservation modal), Réalisation integration (source radio on purchase orders), and a Pépinière tab in Reports.

**Architecture:** Two new DB tables (`nursery_stock`, `nursery_stock_movements`) plus a new `nursery_source` enum column on `purchase_orders`. A standalone `/admin/nursery` admin section handles CRUD and CSV export. Études and Réalisation pages are both currently stub pages — they will be built out as part of this plan to house the integrations. The nursery data layer lives in `src/lib/db/nursery.ts`.

**Tech Stack:** Next.js 15 App Router (server components + `force-dynamic`), Drizzle ORM, PostgreSQL/Neon, React Hook Form + Zod, Recharts (PieChart for reports tab), CSS variables matching the existing admin design system. Migration applied via Node.js pg client (not drizzle-kit push, which requires a TTY).

---

## File Map

**New files:**
- `db/migrations/0004_nursery_stock.sql` — migration SQL
- `src/lib/db/nursery.ts` — data layer: types + all DB queries
- `src/app/admin/(dashboard)/nursery/page.tsx` — dashboard: summary cards + stock table
- `src/app/admin/(dashboard)/nursery/[stockId]/page.tsx` — detail: movement history + actions
- `src/app/api/nursery/route.ts` — GET list, POST create stock entry
- `src/app/api/nursery/[stockId]/route.ts` — GET detail, PATCH update, DELETE soft-delete
- `src/app/api/nursery/[stockId]/movements/route.ts` — GET movements list, POST new movement
- `src/app/api/nursery/report/route.ts` — GET nursery report data (for Reports tab)
- `src/components/nursery/NurseryStockTable.tsx` — stock table with health badge + filters
- `src/components/nursery/NurseryFilterBar.tsx` — URL-param filter bar
- `src/components/nursery/StockForm.tsx` — create/edit form
- `src/components/nursery/MovementDrawer.tsx` — slide-over for logging a movement
- `src/components/nursery/StockAvailabilityBadge.tsx` — "N en stock" badge for Études
- `src/components/nursery/ReservationModal.tsx` — "Réserver depuis la pépinière" modal (Études)

**Modified files:**
- `db/schema.ts` — add 3 new enums + `nursery_stock` table + `nursery_stock_movements` table + `nurserySource` column on `purchase_orders`
- `src/components/AdminNav.tsx` — add Pépinière nav item
- `src/app/admin/(dashboard)/projects/[id]/etudes/page.tsx` — build out from stub: plant list builder with availability badge + reservation modal
- `src/app/admin/(dashboard)/projects/[id]/realisation/page.tsx` — build out from stub: purchase orders table + drawer with Source radio
- `src/components/realisation/PurchaseDrawer.tsx` — add Source radio (Fournisseur externe | Pépinière SOPAT) + nursery stock picker
- `src/app/admin/(dashboard)/reports/page.tsx` — add `getNurseryReport()` call
- `src/app/admin/(dashboard)/reports/ReportsClient.tsx` — add Pépinière tab + charts

---

## Task 1: DB Schema — new enums + tables

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Add three new enums after the existing `supplierStatusEnum` block (around line 218)**

  Open `db/schema.ts`. After the `supplierStatusEnum` definition, add:

  ```ts
  export const nurseryHealthEnum = pgEnum('nursery_health', [
    'healthy',
    'attention',
    'critical',
    'dead',
  ])

  export const nurseryMovementTypeEnum = pgEnum('nursery_movement_type', [
    'reception',      // stock received from outside
    'internal_use',   // consumed on a project (réalisation)
    'reservation',    // reserved for a project (études)
    'reservation_cancel', // reservation cancelled
    'loss',           // damaged / dead stock
    'transfer',       // moved between locations
    'adjustment',     // manual correction
  ])

  export const nurserySourceEnum = pgEnum('nursery_source', [
    'fournisseur_externe',
    'pepiniere_sopat',
  ])
  ```

- [ ] **Step 2: Add `nursery_stock` table at the end of schema.ts (before the closing comment if any)**

  Add after the RSE/exchange_rates tables (wherever the file ends):

  ```ts
  // ─── Nursery Stock ────────────────────────────────────────────────────────────

  export const nurseryStock = pgTable('nursery_stock', {
    id: uuid('id').primaryKey().defaultRandom(),
    botanicalName: varchar('botanical_name', { length: 255 }).notNull(),
    commonName: varchar('common_name', { length: 255 }),
    category: plantCategoryEnum('category').notNull(),
    currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
    reservedQuantity: decimal('reserved_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
    unit: plantUnitEnum('unit').notNull().default('unit'),
    location: varchar('location', { length: 255 }),
    healthStatus: nurseryHealthEnum('health_status').notNull().default('healthy'),
    notes: text('notes'),
    photoCloudinaryId: varchar('photo_cloudinary_id', { length: 500 }),
    ...timestamps,
    deletedAt: timestamp('deleted_at'),
    createdBy: uuid('created_by').notNull(),
  }, (t) => [
    index('nursery_stock_botanical_name_idx').on(t.botanicalName),
    index('nursery_stock_category_idx').on(t.category),
    foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  ])
  ```

- [ ] **Step 3: Add `nursery_stock_movements` table immediately after**

  ```ts
  export const nurseryStockMovements = pgTable('nursery_stock_movements', {
    id: uuid('id').primaryKey().defaultRandom(),
    stockId: uuid('stock_id').notNull(),
    movementType: nurseryMovementTypeEnum('movement_type').notNull(),
    quantityDelta: decimal('quantity_delta', { precision: 10, scale: 2 }).notNull(),
    projectId: uuid('project_id'),
    plantListItemId: uuid('plant_list_item_id'),
    purchaseOrderId: uuid('purchase_order_id'),
    notes: text('notes'),
    movedAt: timestamp('moved_at').notNull().defaultNow(),
    movedBy: uuid('moved_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    index('nursery_movements_stock_id_idx').on(t.stockId),
    index('nursery_movements_project_id_idx').on(t.projectId),
    foreignKey({ columns: [t.stockId], foreignColumns: [nurseryStock.id] }),
    foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
    foreignKey({ columns: [t.plantListItemId], foreignColumns: [plantListItems.id] }),
    foreignKey({ columns: [t.purchaseOrderId], foreignColumns: [purchaseOrders.id] }),
    foreignKey({ columns: [t.movedBy], foreignColumns: [users.id] }),
  ])
  ```

- [ ] **Step 4: Add `nurserySource` column to `purchaseOrders` table**

  Find the `purchaseOrders` table definition (around line 554). Add the column after `status`:

  ```ts
  nurserySource: nurserySourceEnum('nursery_source').default('fournisseur_externe'),
  nurseryStockId: uuid('nursery_stock_id'),
  ```

  Also add the foreign key inside the constraints array:
  ```ts
  foreignKey({ columns: [t.nurseryStockId], foreignColumns: [nurseryStock.id] }),
  ```

- [ ] **Step 5: Commit schema changes**

  ```bash
  git add db/schema.ts
  git commit -m "feat(schema): add nursery_stock, nursery_stock_movements tables and nursery_source on purchase_orders"
  ```

---

## Task 2: DB Migration

**Files:**
- Create: `db/migrations/0004_nursery_stock.sql`

- [ ] **Step 1: Generate migration SQL via drizzle-kit**

  Run from the project root:
  ```bash
  npx drizzle-kit generate --name=nursery_stock
  ```

  This will create `db/migrations/0004_nursery_stock.sql` and update `db/migrations/meta/_journal.json`. Verify the file exists.

- [ ] **Step 2: Apply migration to Neon via Node.js pg client**

  Run:
  ```bash
  node -e "
  const { Client } = require('pg');
  const fs = require('fs');
  const sql = fs.readFileSync('db/migrations/0004_nursery_stock.sql', 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  client.connect().then(() => client.query(sql)).then(() => { console.log('Migration applied'); client.end(); }).catch(e => { console.error(e); client.end(); process.exit(1); });
  " 
  ```

  If `DATABASE_URL` is not in env, load it first:
  ```bash
  node -e "require('dotenv').config({ path: '.env' }); const { Client } = require('pg'); const fs = require('fs'); const sql = fs.readFileSync('db/migrations/0004_nursery_stock.sql', 'utf8'); const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); client.connect().then(() => client.query(sql)).then(() => { console.log('ok'); client.end(); }).catch(e => { console.error(e); client.end(); process.exit(1); });"
  ```

  Expected output: `Migration applied` (or `ok`)

- [ ] **Step 3: Commit migration files**

  ```bash
  git add db/migrations/0004_nursery_stock.sql db/migrations/meta/
  git commit -m "feat(migration): 0004 nursery_stock tables"
  ```

---

## Task 3: Data Layer — `src/lib/db/nursery.ts`

**Files:**
- Create: `src/lib/db/nursery.ts`

- [ ] **Step 1: Create the file with types and imports**

  ```ts
  import { db } from '../../../db/index'
  import {
    nurseryStock,
    nurseryStockMovements,
    users,
    projects,
  } from '../../../db/schema'
  import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm'

  export type NurseryStockRow = {
    id:               string
    botanicalName:    string
    commonName:       string | null
    category:         string
    currentQuantity:  string
    reservedQuantity: string
    availableQty:     number  // currentQuantity - reservedQuantity, computed
    unit:             string
    location:         string | null
    healthStatus:     string
    notes:            string | null
    photoUrl:         string | null
    createdAt:        Date
  }

  export type NurseryMovementRow = {
    id:              string
    stockId:         string
    movementType:    string
    quantityDelta:   string
    projectId:       string | null
    projectName:     string | null
    projectRef:      string | null
    notes:           string | null
    movedAt:         Date
    movedByName:     string | null
  }

  export type CreateStockInput = {
    botanicalName:     string
    commonName?:       string
    category:          string
    currentQuantity:   string
    unit:              string
    location?:         string
    healthStatus?:     string
    notes?:            string
    photoCloudinaryId?: string
    createdBy:         string
  }

  export type UpdateStockInput = Partial<Omit<CreateStockInput, 'createdBy'>>

  export type CreateMovementInput = {
    stockId:          string
    movementType:     string
    quantityDelta:    string
    projectId?:       string
    plantListItemId?: string
    purchaseOrderId?: string
    notes?:           string
    movedAt?:         Date
    movedBy:          string
  }

  export type NurseryReportData = {
    totalSpecies:     number
    totalUnits:       number
    byCategory:       { category: string; count: number; units: number }[]
    byHealth:         { status: string; count: number }[]
    movementsLast30:  { date: string; receptions: number; uses: number }[]
  }
  ```

- [ ] **Step 2: Add `listNurseryStock`, `getNurseryStockById`, `searchNurseryStock`**

  ```ts
  export async function listNurseryStock(filters?: {
    category?: string
    healthStatus?: string
  }): Promise<NurseryStockRow[]> {
    const rows = await db
      .select({
        id:               nurseryStock.id,
        botanicalName:    nurseryStock.botanicalName,
        commonName:       nurseryStock.commonName,
        category:         nurseryStock.category,
        currentQuantity:  nurseryStock.currentQuantity,
        reservedQuantity: nurseryStock.reservedQuantity,
        unit:             nurseryStock.unit,
        location:         nurseryStock.location,
        healthStatus:     nurseryStock.healthStatus,
        notes:            nurseryStock.notes,
        photoCloudinaryId: nurseryStock.photoCloudinaryId,
        createdAt:        nurseryStock.createdAt,
      })
      .from(nurseryStock)
      .where(
        and(
          isNull(nurseryStock.deletedAt),
          filters?.category     ? eq(nurseryStock.category,     filters.category     as any) : undefined,
          filters?.healthStatus ? eq(nurseryStock.healthStatus, filters.healthStatus as any) : undefined,
        )
      )
      .orderBy(nurseryStock.botanicalName)

    return rows.map((r) => ({
      ...r,
      availableQty: Math.max(0, parseFloat(r.currentQuantity) - parseFloat(r.reservedQuantity)),
      photoUrl: r.photoCloudinaryId
        ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${r.photoCloudinaryId}`
        : null,
    }))
  }

  export async function getNurseryStockById(id: string): Promise<NurseryStockRow | null> {
    const rows = await listNurseryStock()
    return rows.find((r) => r.id === id) ?? null
  }

  export async function searchNurseryStock(q: string): Promise<Pick<NurseryStockRow, 'id' | 'botanicalName' | 'commonName' | 'availableQty' | 'unit' | 'healthStatus'>[]> {
    const all = await listNurseryStock()
    const lower = q.toLowerCase()
    return all.filter(
      (r) =>
        r.botanicalName.toLowerCase().includes(lower) ||
        (r.commonName ?? '').toLowerCase().includes(lower)
    ).map(({ id, botanicalName, commonName, availableQty, unit, healthStatus }) => ({
      id, botanicalName, commonName, availableQty, unit, healthStatus,
    }))
  }
  ```

- [ ] **Step 3: Add `createNurseryStock`, `updateNurseryStock`, `softDeleteNurseryStock`**

  ```ts
  export async function createNurseryStock(input: CreateStockInput): Promise<string> {
    const [row] = await db
      .insert(nurseryStock)
      .values({
        botanicalName:     input.botanicalName,
        commonName:        input.commonName ?? null,
        category:          input.category as any,
        currentQuantity:   input.currentQuantity,
        unit:              input.unit as any,
        location:          input.location ?? null,
        healthStatus:      (input.healthStatus ?? 'healthy') as any,
        notes:             input.notes ?? null,
        photoCloudinaryId: input.photoCloudinaryId ?? null,
        createdBy:         input.createdBy,
      })
      .returning({ id: nurseryStock.id })
    return row.id
  }

  export async function updateNurseryStock(id: string, input: UpdateStockInput): Promise<boolean> {
    const result = await db
      .update(nurseryStock)
      .set({
        ...(input.botanicalName     !== undefined && { botanicalName:     input.botanicalName }),
        ...(input.commonName        !== undefined && { commonName:        input.commonName }),
        ...(input.category          !== undefined && { category:          input.category as any }),
        ...(input.currentQuantity   !== undefined && { currentQuantity:   input.currentQuantity }),
        ...(input.unit              !== undefined && { unit:              input.unit as any }),
        ...(input.location          !== undefined && { location:          input.location }),
        ...(input.healthStatus      !== undefined && { healthStatus:      input.healthStatus as any }),
        ...(input.notes             !== undefined && { notes:             input.notes }),
        ...(input.photoCloudinaryId !== undefined && { photoCloudinaryId: input.photoCloudinaryId }),
        updatedAt: new Date(),
      })
      .where(and(eq(nurseryStock.id, id), isNull(nurseryStock.deletedAt)))
    return (result.rowCount ?? 0) > 0
  }

  export async function softDeleteNurseryStock(id: string): Promise<boolean> {
    const result = await db
      .update(nurseryStock)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(nurseryStock.id, id), isNull(nurseryStock.deletedAt)))
    return (result.rowCount ?? 0) > 0
  }
  ```

- [ ] **Step 4: Add movement functions**

  ```ts
  export async function getMovementsForStock(stockId: string): Promise<NurseryMovementRow[]> {
    const rows = await db
      .select({
        id:            nurseryStockMovements.id,
        stockId:       nurseryStockMovements.stockId,
        movementType:  nurseryStockMovements.movementType,
        quantityDelta: nurseryStockMovements.quantityDelta,
        projectId:     nurseryStockMovements.projectId,
        projectName:   projects.name,
        projectRef:    projects.reference,
        notes:         nurseryStockMovements.notes,
        movedAt:       nurseryStockMovements.movedAt,
        movedByName:   users.name,
      })
      .from(nurseryStockMovements)
      .leftJoin(users, eq(nurseryStockMovements.movedBy, users.id))
      .leftJoin(projects, eq(nurseryStockMovements.projectId, projects.id))
      .where(eq(nurseryStockMovements.stockId, stockId))
      .orderBy(desc(nurseryStockMovements.movedAt))

    return rows.map((r) => ({
      ...r,
      projectName: r.projectName ?? null,
      projectRef:  r.projectRef  ?? null,
      movedByName: r.movedByName ?? null,
    }))
  }

  export async function createMovement(input: CreateMovementInput): Promise<string> {
    const delta = parseFloat(input.quantityDelta)

    const [row] = await db
      .insert(nurseryStockMovements)
      .values({
        stockId:          input.stockId,
        movementType:     input.movementType as any,
        quantityDelta:    input.quantityDelta,
        projectId:        input.projectId        ?? null,
        plantListItemId:  input.plantListItemId  ?? null,
        purchaseOrderId:  input.purchaseOrderId  ?? null,
        notes:            input.notes            ?? null,
        movedAt:          input.movedAt          ?? new Date(),
        movedBy:          input.movedBy,
      })
      .returning({ id: nurseryStockMovements.id })

    // Update currentQuantity atomically
    const isReservation       = input.movementType === 'reservation'
    const isReservationCancel = input.movementType === 'reservation_cancel'

    if (isReservation) {
      await db
        .update(nurseryStock)
        .set({ reservedQuantity: sql`${nurseryStock.reservedQuantity} + ${delta}`, updatedAt: new Date() })
        .where(eq(nurseryStock.id, input.stockId))
    } else if (isReservationCancel) {
      await db
        .update(nurseryStock)
        .set({ reservedQuantity: sql`GREATEST(0, ${nurseryStock.reservedQuantity} - ${Math.abs(delta)})`, updatedAt: new Date() })
        .where(eq(nurseryStock.id, input.stockId))
    } else {
      await db
        .update(nurseryStock)
        .set({ currentQuantity: sql`${nurseryStock.currentQuantity} + ${delta}`, updatedAt: new Date() })
        .where(eq(nurseryStock.id, input.stockId))
    }

    return row.id
  }
  ```

- [ ] **Step 5: Add `getNurseryReport` for the Reports tab**

  ```ts
  export async function getNurseryReport(): Promise<NurseryReportData> {
    const stocks = await listNurseryStock()

    const totalSpecies = stocks.length
    const totalUnits   = stocks.reduce((s, r) => s + parseFloat(r.currentQuantity), 0)

    const byCategoryMap = new Map<string, { count: number; units: number }>()
    for (const r of stocks) {
      const cur = byCategoryMap.get(r.category) ?? { count: 0, units: 0 }
      byCategoryMap.set(r.category, { count: cur.count + 1, units: cur.units + parseFloat(r.currentQuantity) })
    }
    const byCategory = [...byCategoryMap.entries()].map(([category, v]) => ({ category, ...v }))

    const byHealthMap = new Map<string, number>()
    for (const r of stocks) {
      byHealthMap.set(r.healthStatus, (byHealthMap.get(r.healthStatus) ?? 0) + 1)
    }
    const byHealth = [...byHealthMap.entries()].map(([status, count]) => ({ status, count }))

    // last 30 days movements grouped by day
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentMovements = await db
      .select({
        day:          sql<string>`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`,
        movementType: nurseryStockMovements.movementType,
        count:        sql<number>`count(*)::int`,
      })
      .from(nurseryStockMovements)
      .where(sql`${nurseryStockMovements.movedAt} >= ${since}`)
      .groupBy(sql`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`, nurseryStockMovements.movementType)
      .orderBy(sql`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`)

    const movementsMap = new Map<string, { receptions: number; uses: number }>()
    for (const m of recentMovements) {
      const cur = movementsMap.get(m.day) ?? { receptions: 0, uses: 0 }
      if (m.movementType === 'reception') cur.receptions += m.count
      if (m.movementType === 'internal_use') cur.uses += m.count
      movementsMap.set(m.day, cur)
    }
    const movementsLast30 = [...movementsMap.entries()].map(([date, v]) => ({ date, ...v }))

    return { totalSpecies, totalUnits, byCategory, byHealth, movementsLast30 }
  }
  ```

- [ ] **Step 6: Commit data layer**

  ```bash
  git add src/lib/db/nursery.ts
  git commit -m "feat(db): nursery stock data layer"
  ```

---

## Task 4: API Routes

**Files:**
- Create: `src/app/api/nursery/route.ts`
- Create: `src/app/api/nursery/[stockId]/route.ts`
- Create: `src/app/api/nursery/[stockId]/movements/route.ts`
- Create: `src/app/api/nursery/report/route.ts`

- [ ] **Step 1: Create `src/app/api/nursery/route.ts`**

  ```ts
  import { NextResponse } from 'next/server'
  import { auth } from '@/lib/auth'
  import { z } from 'zod'
  import { listNurseryStock, createNurseryStock } from '@/lib/db/nursery'

  const EDIT_ROLES = ['admin', 'direction', 'realisation_chef']
  const READ_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team', 'realisation_chef', 'realisation_team']

  const createSchema = z.object({
    botanicalName:    z.string().min(1),
    commonName:       z.string().optional(),
    category:         z.enum(['tree','shrub','ground_cover','climber','palm','grass','aquatic','other']),
    currentQuantity:  z.string().regex(/^\d+(\.\d+)?$/),
    unit:             z.enum(['unit','m2','m3','kg','liter','ml']).default('unit'),
    location:         z.string().optional(),
    healthStatus:     z.enum(['healthy','attention','critical','dead']).default('healthy'),
    notes:            z.string().optional(),
    photoCloudinaryId: z.string().optional(),
  })

  export async function GET(req: Request) {
    const session = await auth()
    if (!session || !READ_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const rows = await listNurseryStock({
      category:     searchParams.get('category')     ?? undefined,
      healthStatus: searchParams.get('healthStatus') ?? undefined,
    })
    return NextResponse.json(rows)
  }

  export async function POST(req: Request) {
    const session = await auth()
    if (!session || !EDIT_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const id = await createNurseryStock({ ...parsed.data, createdBy: session.user.id })
    return NextResponse.json({ id }, { status: 201 })
  }
  ```

- [ ] **Step 2: Create `src/app/api/nursery/[stockId]/route.ts`**

  ```ts
  import { NextResponse } from 'next/server'
  import { auth } from '@/lib/auth'
  import { z } from 'zod'
  import { getNurseryStockById, updateNurseryStock, softDeleteNurseryStock } from '@/lib/db/nursery'

  const EDIT_ROLES  = ['admin', 'direction', 'realisation_chef']
  const READ_ROLES  = ['admin', 'direction', 'etudes_chef', 'etudes_team', 'realisation_chef', 'realisation_team']
  const DELETE_ROLES = ['admin', 'direction']

  const updateSchema = z.object({
    botanicalName:     z.string().min(1).optional(),
    commonName:        z.string().optional(),
    category:          z.enum(['tree','shrub','ground_cover','climber','palm','grass','aquatic','other']).optional(),
    currentQuantity:   z.string().regex(/^\d+(\.\d+)?$/).optional(),
    unit:              z.enum(['unit','m2','m3','kg','liter','ml']).optional(),
    location:          z.string().optional(),
    healthStatus:      z.enum(['healthy','attention','critical','dead']).optional(),
    notes:             z.string().optional(),
    photoCloudinaryId: z.string().optional(),
  })

  export async function GET(_req: Request, { params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !READ_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { stockId } = await params
    const row = await getNurseryStockById(stockId)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(row)
  }

  export async function PATCH(req: Request, { params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !EDIT_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { stockId } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const ok = await updateNurseryStock(stockId, parsed.data)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }

  export async function DELETE(_req: Request, { params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !DELETE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { stockId } = await params
    const ok = await softDeleteNurseryStock(stockId)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
  ```

- [ ] **Step 3: Create `src/app/api/nursery/[stockId]/movements/route.ts`**

  ```ts
  import { NextResponse } from 'next/server'
  import { auth } from '@/lib/auth'
  import { z } from 'zod'
  import { getMovementsForStock, createMovement } from '@/lib/db/nursery'

  const READ_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team', 'realisation_chef', 'realisation_team']
  const WRITE_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team']

  const createSchema = z.object({
    movementType:    z.enum(['reception','internal_use','reservation','reservation_cancel','loss','transfer','adjustment']),
    quantityDelta:   z.string().regex(/^-?\d+(\.\d+)?$/),
    projectId:       z.string().uuid().optional(),
    plantListItemId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    notes:           z.string().optional(),
    movedAt:         z.string().optional(),
  })

  export async function GET(_req: Request, { params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !READ_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { stockId } = await params
    const rows = await getMovementsForStock(stockId)
    return NextResponse.json(rows)
  }

  export async function POST(req: Request, { params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !WRITE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { stockId } = await params
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const id = await createMovement({
      stockId,
      movementType:    parsed.data.movementType,
      quantityDelta:   parsed.data.quantityDelta,
      projectId:       parsed.data.projectId,
      plantListItemId: parsed.data.plantListItemId,
      purchaseOrderId: parsed.data.purchaseOrderId,
      notes:           parsed.data.notes,
      movedAt:         parsed.data.movedAt ? new Date(parsed.data.movedAt) : undefined,
      movedBy:         session.user.id,
    })
    return NextResponse.json({ id }, { status: 201 })
  }
  ```

- [ ] **Step 4: Create `src/app/api/nursery/report/route.ts`**

  ```ts
  import { NextResponse } from 'next/server'
  import { auth } from '@/lib/auth'
  import { getNurseryReport } from '@/lib/db/nursery'

  export async function GET() {
    const session = await auth()
    if (!session || !['admin', 'direction', 'realisation_chef'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const data = await getNurseryReport()
    return NextResponse.json(data)
  }
  ```

- [ ] **Step 5: Commit API routes**

  ```bash
  git add src/app/api/nursery/
  git commit -m "feat(api): nursery stock CRUD and movements routes"
  ```

---

## Task 5: Nursery Admin Components

**Files:**
- Create: `src/components/nursery/NurseryFilterBar.tsx`
- Create: `src/components/nursery/NurseryStockTable.tsx`
- Create: `src/components/nursery/StockForm.tsx`
- Create: `src/components/nursery/MovementDrawer.tsx`

- [ ] **Step 1: Create `src/components/nursery/NurseryFilterBar.tsx`**

  ```tsx
  'use client'
  import { useRouter, usePathname, useSearchParams } from 'next/navigation'

  const CATEGORY_OPTIONS = [
    { value: 'tree',         label: 'Arbre' },
    { value: 'shrub',        label: 'Arbuste' },
    { value: 'ground_cover', label: 'Couvre-sol' },
    { value: 'climber',      label: 'Grimpante' },
    { value: 'palm',         label: 'Palmier' },
    { value: 'grass',        label: 'Graminée' },
    { value: 'aquatic',      label: 'Aquatique' },
    { value: 'other',        label: 'Autre' },
  ]

  const HEALTH_OPTIONS = [
    { value: 'healthy',   label: 'Sain' },
    { value: 'attention', label: 'Attention' },
    { value: 'critical',  label: 'Critique' },
    { value: 'dead',      label: 'Mort' },
  ]

  export function NurseryFilterBar() {
    const router       = useRouter()
    const pathname     = usePathname()
    const searchParams = useSearchParams()

    function update(key: string, value: string) {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    }

    const selectClass = 'text-xs px-2 py-1.5 rounded-lg border focus:outline-none'
    const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={searchParams.get('category') ?? ''}
          onChange={(e) => update('category', e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Toutes catégories</option>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={searchParams.get('healthStatus') ?? ''}
          onChange={(e) => update('healthStatus', e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Tous états sanitaires</option>
          {HEALTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  ```

- [ ] **Step 2: Create `src/components/nursery/NurseryStockTable.tsx`**

  ```tsx
  'use client'
  import Link from 'next/link'
  import type { NurseryStockRow } from '@/lib/db/nursery'

  const HEALTH_COLOR: Record<string, string> = {
    healthy:   'var(--admin-emerald)',
    attention: '#D97706',
    critical:  '#DC2626',
    dead:      'var(--admin-text-muted)',
  }

  const HEALTH_LABEL: Record<string, string> = {
    healthy:   'Sain',
    attention: 'Attention',
    critical:  'Critique',
    dead:      'Mort',
  }

  const CATEGORY_LABEL: Record<string, string> = {
    tree: 'Arbre', shrub: 'Arbuste', ground_cover: 'Couvre-sol',
    climber: 'Grimpante', palm: 'Palmier', grass: 'Graminée',
    aquatic: 'Aquatique', other: 'Autre',
  }

  function exportCsv(rows: NurseryStockRow[]) {
    const headers = ['Nom botanique', 'Nom commun', 'Catégorie', 'Qté actuelle', 'Qté réservée', 'Dispo', 'Unité', 'Localisation', 'État sanitaire']
    const lines = [headers, ...rows.map((r) => [
      r.botanicalName, r.commonName ?? '', CATEGORY_LABEL[r.category] ?? r.category,
      r.currentQuantity, r.reservedQuantity, r.availableQty.toString(),
      r.unit, r.location ?? '', HEALTH_LABEL[r.healthStatus] ?? r.healthStatus,
    ])].map((row) => row.map((v) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'pepiniere_stock.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  export function NurseryStockTable({ rows }: { rows: NurseryStockRow[] }) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => exportCsv(rows)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            Exporter CSV
          </button>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}>
                {['Espèce', 'Catégorie', 'Disponible', 'Réservé', 'Localisation', 'Santé', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune espèce en stock
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} style={{ background: 'var(--admin-surface)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--admin-text)' }}>{r.botanicalName}</div>
                    {r.commonName && <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{r.commonName}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-emerald)' }}>
                    {r.availableQty} {r.unit}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {r.reservedQuantity}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {r.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: HEALTH_COLOR[r.healthStatus] + '20', color: HEALTH_COLOR[r.healthStatus] }}
                    >
                      {HEALTH_LABEL[r.healthStatus] ?? r.healthStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/nursery/${r.id}`}
                      className="text-xs px-2 py-1 rounded border transition-colors"
                      style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                    >
                      Détail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Create `src/components/nursery/StockForm.tsx`**

  ```tsx
  'use client'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { z } from 'zod'
  import { useRouter } from 'next/navigation'

  const schema = z.object({
    botanicalName:    z.string().min(1, 'Requis'),
    commonName:       z.string().optional(),
    category:         z.enum(['tree','shrub','ground_cover','climber','palm','grass','aquatic','other']),
    currentQuantity:  z.string().regex(/^\d+(\.\d+)?$/, 'Quantité invalide'),
    unit:             z.enum(['unit','m2','m3','kg','liter','ml']).default('unit'),
    location:         z.string().optional(),
    healthStatus:     z.enum(['healthy','attention','critical','dead']).default('healthy'),
    notes:            z.string().optional(),
  })

  export type StockFormValues = z.infer<typeof schema>

  const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
  const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

  function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
        {children}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  type Props = {
    defaultValues?: Partial<StockFormValues>
    stockId?:       string
    onSuccess?:     () => void
  }

  export function StockForm({ defaultValues, stockId, onSuccess }: Props) {
    const router = useRouter()
    const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<StockFormValues>({
      resolver: zodResolver(schema) as any,
      defaultValues: defaultValues ?? { unit: 'unit', healthStatus: 'healthy', category: 'tree' },
    })

    async function onSubmit(values: StockFormValues) {
      const url    = stockId ? `/api/nursery/${stockId}` : '/api/nursery'
      const method = stockId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      if (!res.ok) {
        const data = await res.json()
        setError('root', { message: data.error ?? 'Erreur serveur' })
        return
      }
      if (onSuccess) {
        onSuccess()
      } else {
        const { id } = await res.json()
        router.push(`/admin/nursery/${stockId ?? id}`)
        router.refresh()
      }
    }

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nom botanique *" error={errors.botanicalName?.message}>
              <input {...register('botanicalName')} className={inputClass} style={inputStyle} placeholder="Rosa canina" />
            </Field>
          </div>
          <Field label="Nom commun" error={errors.commonName?.message}>
            <input {...register('commonName')} className={inputClass} style={inputStyle} placeholder="Rosier sauvage" />
          </Field>
          <Field label="Catégorie *" error={errors.category?.message}>
            <select {...register('category')} className={inputClass} style={inputStyle}>
              {[['tree','Arbre'],['shrub','Arbuste'],['ground_cover','Couvre-sol'],['climber','Grimpante'],['palm','Palmier'],['grass','Graminée'],['aquatic','Aquatique'],['other','Autre']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantité actuelle *" error={errors.currentQuantity?.message}>
            <input {...register('currentQuantity')} className={inputClass} style={inputStyle} placeholder="0" />
          </Field>
          <Field label="Unité" error={errors.unit?.message}>
            <select {...register('unit')} className={inputClass} style={inputStyle}>
              {[['unit','Unité'],['m2','m²'],['m3','m³'],['kg','kg'],['liter','Litre'],['ml','ml']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Localisation" error={errors.location?.message}>
            <input {...register('location')} className={inputClass} style={inputStyle} placeholder="Serre A — Rang 3" />
          </Field>
          <Field label="État sanitaire" error={errors.healthStatus?.message}>
            <select {...register('healthStatus')} className={inputClass} style={inputStyle}>
              {[['healthy','Sain'],['attention','Attention'],['critical','Critique'],['dead','Mort']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" error={errors.notes?.message}>
              <textarea {...register('notes')} className={inputClass} style={inputStyle} rows={3} />
            </Field>
          </div>
        </div>
        {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-sm font-medium px-5 py-2.5 rounded-lg text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--green)' }}
        >
          {isSubmitting ? 'Enregistrement…' : stockId ? 'Mettre à jour' : 'Ajouter au stock'}
        </button>
      </form>
    )
  }
  ```

- [ ] **Step 4: Create `src/components/nursery/MovementDrawer.tsx`**

  ```tsx
  'use client'
  import { useState } from 'react'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { z } from 'zod'

  const schema = z.object({
    movementType:  z.enum(['reception','internal_use','reservation','reservation_cancel','loss','transfer','adjustment']),
    quantityDelta: z.string().regex(/^-?\d+(\.\d+)?$/, 'Quantité invalide'),
    notes:         z.string().optional(),
    movedAt:       z.string().optional(),
    projectId:     z.string().uuid().optional(),
  })

  type FormValues = z.infer<typeof schema>

  const MOVEMENT_LABELS: Record<string, string> = {
    reception:           'Réception',
    internal_use:        'Utilisation chantier',
    reservation:         'Réservation',
    reservation_cancel:  'Annulation réservation',
    loss:                'Perte / mort',
    transfer:            'Transfert',
    adjustment:          'Ajustement manuel',
  }

  type Props = {
    stockId:     string
    stockName:   string
    open:        boolean
    onClose:     () => void
    onCreated:   () => void
    projects?:   { id: string; name: string; reference: string }[]
  }

  const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
  const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

  export function MovementDrawer({ stockId, stockName, open, onClose, onCreated, projects = [] }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
      resolver: zodResolver(schema) as any,
      defaultValues: { movementType: 'reception', movedAt: new Date().toISOString().slice(0, 10) },
    })

    async function onSubmit(values: FormValues) {
      setSubmitting(true)
      setError('')
      const res = await fetch(`/api/nursery/${stockId}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      setSubmitting(false)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erreur serveur')
        return
      }
      reset()
      onCreated()
    }

    if (!open) return null

    return (
      <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
        <div
          className="h-full w-full max-w-md flex flex-col shadow-xl"
          style={{ background: 'var(--admin-surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Enregistrer un mouvement</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{stockName}</p>
            </div>
            <button onClick={onClose} className="text-lg" style={{ color: 'var(--admin-text-muted)' }}>✕</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Type *</label>
              <select {...register('movementType')} className={inputClass} style={inputStyle}>
                {Object.entries(MOVEMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                Quantité * <span className="normal-case font-normal">(négatif pour une sortie)</span>
              </label>
              <input {...register('quantityDelta')} className={inputClass} style={inputStyle} placeholder="12 ou -5" />
              {errors.quantityDelta && <p className="text-xs text-red-500">{errors.quantityDelta.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Date</label>
              <input type="date" {...register('movedAt')} className={inputClass} style={inputStyle} />
            </div>

            {projects.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Projet associé</label>
                <select {...register('projectId')} className={inputClass} style={inputStyle}>
                  <option value="">— Aucun —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
              <textarea {...register('notes')} className={inputClass} style={inputStyle} rows={3} />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 text-sm font-medium py-2.5 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--green)' }}
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 text-sm rounded-lg border"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 5: Commit components**

  ```bash
  git add src/components/nursery/
  git commit -m "feat(ui): nursery admin components (table, filter bar, stock form, movement drawer)"
  ```

---

## Task 6: Admin Pages — `/admin/nursery`

**Files:**
- Create: `src/app/admin/(dashboard)/nursery/page.tsx`
- Create: `src/app/admin/(dashboard)/nursery/new/page.tsx`
- Create: `src/app/admin/(dashboard)/nursery/[stockId]/page.tsx`

- [ ] **Step 1: Create dashboard page `src/app/admin/(dashboard)/nursery/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect } from 'next/navigation'
  import Link from 'next/link'
  import { listNurseryStock } from '@/lib/db/nursery'
  import { NurseryFilterBar } from '@/components/nursery/NurseryFilterBar'
  import { NurseryStockTable } from '@/components/nursery/NurseryStockTable'

  export const dynamic = 'force-dynamic'
  export const metadata = { title: 'Pépinière — SOPAT Admin' }

  const READ_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team', 'realisation_chef', 'realisation_team']
  const EDIT_ROLES = ['admin', 'direction', 'realisation_chef']

  export default async function NurseryPage({
    searchParams,
  }: {
    searchParams: Promise<Record<string, string>>
  }) {
    const session = await auth()
    if (!session || !READ_ROLES.includes(session.user.role)) redirect('/admin')

    const sp   = await searchParams
    const rows = await listNurseryStock({ category: sp.category, healthStatus: sp.healthStatus })

    const totalSpecies = rows.length
    const totalUnits   = rows.reduce((s, r) => s + parseFloat(r.currentQuantity), 0)
    const alertCount   = rows.filter((r) => r.healthStatus === 'critical' || r.healthStatus === 'attention').length
    const canEdit      = EDIT_ROLES.includes(session.user.role)

    const statCards = [
      { label: 'Espèces en stock',   value: totalSpecies.toString() },
      { label: 'Total unités',        value: Math.round(totalUnits).toString() },
      { label: 'Alertes sanitaires', value: alertCount.toString(), alert: alertCount > 0 },
    ]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Pépinière SOPAT</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
              Gestion du stock végétal interne
            </p>
          </div>
          {canEdit && (
            <Link
              href="/admin/nursery/new"
              className="text-sm font-medium px-4 py-2 rounded-lg text-white"
              style={{ background: 'var(--green)' }}
            >
              + Ajouter une espèce
            </Link>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border p-4"
              style={{ borderColor: c.alert ? '#DC2626' : 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: c.alert ? '#DC2626' : 'var(--admin-text-muted)' }}>{c.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: c.alert ? '#DC2626' : 'var(--admin-text)' }}>{c.value}</p>
            </div>
          ))}
        </div>

        <NurseryFilterBar />
        <NurseryStockTable rows={rows} />
      </div>
    )
  }
  ```

- [ ] **Step 2: Create `src/app/admin/(dashboard)/nursery/new/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect } from 'next/navigation'
  import { StockForm } from '@/components/nursery/StockForm'

  export const dynamic = 'force-dynamic'
  export const metadata = { title: 'Nouvelle espèce — Pépinière SOPAT' }

  export default async function NewStockPage() {
    const session = await auth()
    if (!session || !['admin', 'direction', 'realisation_chef'].includes(session.user.role)) {
      redirect('/admin/nursery')
    }

    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Ajouter une espèce</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Nouvelle entrée dans le stock de la pépinière</p>
        </div>
        <StockForm />
      </div>
    )
  }
  ```

- [ ] **Step 3: Create detail page `src/app/admin/(dashboard)/nursery/[stockId]/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect, notFound } from 'next/navigation'
  import Link from 'next/link'
  import { getNurseryStockById, getMovementsForStock } from '@/lib/db/nursery'

  export const dynamic = 'force-dynamic'

  const MOVEMENT_LABELS: Record<string, string> = {
    reception: 'Réception', internal_use: 'Utilisation chantier',
    reservation: 'Réservation', reservation_cancel: 'Annulation réservation',
    loss: 'Perte / mort', transfer: 'Transfert', adjustment: 'Ajustement',
  }

  const HEALTH_COLOR: Record<string, string> = {
    healthy: 'var(--admin-emerald)', attention: '#D97706', critical: '#DC2626', dead: 'var(--admin-text-muted)',
  }

  export default async function NurseryDetailPage({
    params,
  }: {
    params: Promise<{ stockId: string }>
  }) {
    const session = await auth()
    if (!session) redirect('/auth/login')
    const { stockId } = await params
    const [stock, movements] = await Promise.all([
      getNurseryStockById(stockId),
      getMovementsForStock(stockId),
    ])
    if (!stock) notFound()

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>{stock.botanicalName}</h1>
            {stock.commonName && <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{stock.commonName}</p>}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/nursery/${stockId}/edit`}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Modifier
            </Link>
            <Link href="/admin/nursery" className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
              ← Retour
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Stock actuel',  value: `${stock.currentQuantity} ${stock.unit}` },
            { label: 'Réservé',       value: `${stock.reservedQuantity} ${stock.unit}` },
            { label: 'Disponible',    value: `${stock.availableQty} ${stock.unit}`, highlight: true },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{c.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: c.highlight ? 'var(--admin-emerald)' : 'var(--admin-text)' }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Health badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>État sanitaire :</span>
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: HEALTH_COLOR[stock.healthStatus] + '20', color: HEALTH_COLOR[stock.healthStatus] }}
          >
            {stock.healthStatus === 'healthy' ? 'Sain' : stock.healthStatus === 'attention' ? 'Attention' : stock.healthStatus === 'critical' ? 'Critique' : 'Mort'}
          </span>
          {stock.location && <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>· {stock.location}</span>}
        </div>

        {/* Movement ledger */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Historique des mouvements</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {movements.length === 0 && (
              <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--admin-text-muted)' }}>Aucun mouvement enregistré</p>
            )}
            {movements.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                  </span>
                  {m.projectName && (
                    <span className="text-xs ml-2" style={{ color: 'var(--admin-text-muted)' }}>
                      — {m.projectRef} {m.projectName}
                    </span>
                  )}
                  {m.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{m.notes}</p>}
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: parseFloat(m.quantityDelta) >= 0 ? 'var(--admin-emerald)' : '#DC2626' }}
                >
                  {parseFloat(m.quantityDelta) >= 0 ? '+' : ''}{m.quantityDelta}
                </span>
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(m.movedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Create edit page `src/app/admin/(dashboard)/nursery/[stockId]/edit/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect, notFound } from 'next/navigation'
  import { getNurseryStockById } from '@/lib/db/nursery'
  import { StockForm } from '@/components/nursery/StockForm'

  export const dynamic = 'force-dynamic'

  export default async function EditStockPage({ params }: { params: Promise<{ stockId: string }> }) {
    const session = await auth()
    if (!session || !['admin', 'direction', 'realisation_chef'].includes(session.user.role)) redirect('/admin/nursery')
    const { stockId } = await params
    const stock = await getNurseryStockById(stockId)
    if (!stock) notFound()

    return (
      <div className="space-y-6 max-w-xl">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Modifier — {stock.botanicalName}</h1>
        <StockForm
          stockId={stockId}
          defaultValues={{
            botanicalName:   stock.botanicalName,
            commonName:      stock.commonName ?? undefined,
            category:        stock.category as any,
            currentQuantity: stock.currentQuantity,
            unit:            stock.unit as any,
            location:        stock.location ?? undefined,
            healthStatus:    stock.healthStatus as any,
            notes:           stock.notes ?? undefined,
          }}
        />
      </div>
    )
  }
  ```

- [ ] **Step 5: Add Pépinière to AdminNav**

  In `src/components/AdminNav.tsx`, add after the Clients nav item:

  ```ts
  { href: '/admin/nursery', label: 'Pépinière', icon: '🌱', roles: ['admin','direction','etudes_chef','etudes_team','realisation_chef','realisation_team'] },
  ```

- [ ] **Step 6: Commit admin pages + nav**

  ```bash
  git add src/app/admin/\(dashboard\)/nursery/ src/components/AdminNav.tsx
  git commit -m "feat(admin): nursery dashboard, detail, new, edit pages + nav item"
  ```

---

## Task 7: Études Integration — Availability Badge + Reservation Modal

**Files:**
- Create: `src/components/nursery/StockAvailabilityBadge.tsx`
- Create: `src/components/nursery/ReservationModal.tsx`
- Modify: `src/app/admin/(dashboard)/projects/[id]/etudes/page.tsx`

The Études page is currently a stub. This task builds it out with a basic plant list viewer plus the nursery-stock overlay. The full plant list editing UI (adding/removing items) is out of scope; only the stock availability badge and reservation modal are required.

- [ ] **Step 1: Create `src/components/nursery/StockAvailabilityBadge.tsx`**

  ```tsx
  type Props = {
    botanicalName: string
    stockRows: {
      id:            string
      botanicalName: string
      availableQty:  number
      unit:          string
      healthStatus:  string
    }[]
    onReserve: (stockId: string) => void
  }

  export function StockAvailabilityBadge({ botanicalName, stockRows, onReserve }: Props) {
    const match = stockRows.find(
      (r) => r.botanicalName.toLowerCase() === botanicalName.toLowerCase()
    )

    if (!match || match.availableQty <= 0) return null

    return (
      <button
        onClick={() => onReserve(match.id)}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-80"
        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
      >
        🌱 {match.availableQty} {match.unit} en pépinière
      </button>
    )
  }
  ```

- [ ] **Step 2: Create `src/components/nursery/ReservationModal.tsx`**

  ```tsx
  'use client'
  import { useState } from 'react'

  type StockRow = {
    id:            string
    botanicalName: string
    availableQty:  number
    unit:          string
  }

  type Props = {
    stock:       StockRow | null
    projectId:   string
    open:        boolean
    onClose:     () => void
    onReserved:  () => void
  }

  export function ReservationModal({ stock, projectId, open, onClose, onReserved }: Props) {
    const [qty, setQty]         = useState('')
    const [notes, setNotes]     = useState('')
    const [submitting, setSub]  = useState(false)
    const [error, setError]     = useState('')

    if (!open || !stock) return null

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      const parsedQty = parseFloat(qty)
      if (isNaN(parsedQty) || parsedQty <= 0) { setError('Quantité invalide'); return }
      if (parsedQty > stock!.availableQty)      { setError(`Maximum disponible : ${stock!.availableQty} ${stock!.unit}`); return }
      setSub(true); setError('')
      const res = await fetch(`/api/nursery/${stock!.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movementType: 'reservation', quantityDelta: qty, projectId, notes }),
      })
      setSub(false)
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
      setQty(''); setNotes('')
      onReserved()
    }

    const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20'
    const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
        <div
          className="rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Réserver depuis la pépinière
          </h2>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {stock.botanicalName} — {stock.availableQty} {stock.unit} disponibles
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Quantité à réserver *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={stock.availableQty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder={`Max ${stock.availableQty}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} style={inputStyle} rows={2} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 text-sm font-medium py-2.5 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--green)' }}
              >
                {submitting ? 'Réservation…' : 'Confirmer la réservation'}
              </button>
              <button type="button" onClick={onClose} className="px-4 text-sm rounded-lg border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Build out `src/app/admin/(dashboard)/projects/[id]/etudes/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect } from 'next/navigation'
  import { db } from '../../../../../../db/index'
  import { plantListItems, projects } from '../../../../../../db/schema'
  import { eq, isNull, and } from 'drizzle-orm'
  import { listNurseryStock } from '@/lib/db/nursery'
  import { EtudesClient } from './EtudesClient'

  export const dynamic = 'force-dynamic'

  export default async function EtudesPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) redirect('/auth/login')
    const { id } = await params

    const [plantList, nurseryRows] = await Promise.all([
      db.select({
        id:                plantListItems.id,
        botanicalName:     plantListItems.botanicalName,
        commonName:        plantListItems.commonName,
        category:          plantListItems.category,
        quantity:          plantListItems.quantity,
        unit:              plantListItems.unit,
        unitPriceEstimate: plantListItems.unitPriceEstimate,
        notes:             plantListItems.notes,
      })
      .from(plantListItems)
      .where(eq(plantListItems.projectId, id)),
      listNurseryStock(),
    ])

    const stockForBadge = nurseryRows.map((r) => ({
      id:            r.id,
      botanicalName: r.botanicalName,
      availableQty:  r.availableQty,
      unit:          r.unit,
      healthStatus:  r.healthStatus,
    }))

    return <EtudesClient projectId={id} plantList={plantList} stockRows={stockForBadge} userRole={session.user.role} />
  }
  ```

- [ ] **Step 4: Create `src/app/admin/(dashboard)/projects/[id]/etudes/EtudesClient.tsx`**

  ```tsx
  'use client'
  import { useState } from 'react'
  import { StockAvailabilityBadge } from '@/components/nursery/StockAvailabilityBadge'
  import { ReservationModal } from '@/components/nursery/ReservationModal'

  type PlantItem = {
    id: string
    botanicalName: string
    commonName: string | null
    category: string
    quantity: string
    unit: string
    unitPriceEstimate: string | null
    notes: string | null
  }

  type StockRow = { id: string; botanicalName: string; availableQty: number; unit: string; healthStatus: string }

  type Props = {
    projectId: string
    plantList: PlantItem[]
    stockRows: StockRow[]
    userRole:  string
  }

  const CATEGORY_LABEL: Record<string, string> = {
    tree: 'Arbre', shrub: 'Arbuste', ground_cover: 'Couvre-sol',
    climber: 'Grimpante', palm: 'Palmier', grass: 'Graminée',
    aquatic: 'Aquatique', other: 'Autre',
  }

  export function EtudesClient({ projectId, plantList, stockRows, userRole }: Props) {
    const [selectedStockId, setSelectedStockId] = useState<string | null>(null)
    const [modalOpen, setModalOpen]             = useState(false)
    const [refreshKey, setRefreshKey]           = useState(0)

    function handleReserve(stockId: string) {
      setSelectedStockId(stockId)
      setModalOpen(true)
    }

    const selectedStock = stockRows.find((r) => r.id === selectedStockId) ?? null

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>Liste végétale</h2>

        {plantList.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune espèce dans la liste végétale de ce projet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}>
                  {['Espèce', 'Catégorie', 'Qté estimée', 'Prix unit. est.', 'Stock pépinière', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                {plantList.map((item) => (
                  <tr key={item.id} style={{ background: 'var(--admin-surface)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--admin-text)' }}>{item.botanicalName}</div>
                      {item.commonName && <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.commonName}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{CATEGORY_LABEL[item.category] ?? item.category}</td>
                    <td className="px-4 py-3 text-sm">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {item.unitPriceEstimate ? `${item.unitPriceEstimate} TND` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StockAvailabilityBadge
                        botanicalName={item.botanicalName}
                        stockRows={stockRows}
                        onReserve={handleReserve}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {item.notes ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ReservationModal
          stock={selectedStock}
          projectId={projectId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onReserved={() => { setModalOpen(false); setRefreshKey((k) => k + 1) }}
        />
      </div>
    )
  }
  ```

- [ ] **Step 5: Commit Études integration**

  ```bash
  git add src/components/nursery/StockAvailabilityBadge.tsx src/components/nursery/ReservationModal.tsx src/app/admin/\(dashboard\)/projects/\[id\]/etudes/
  git commit -m "feat(etudes): plant list with nursery stock availability badge and reservation modal"
  ```

---

## Task 8: Réalisation Integration — Source Radio on Purchase Orders

**Files:**
- Modify: `src/components/realisation/PurchaseDrawer.tsx`
- Modify: `src/app/admin/(dashboard)/projects/[id]/realisation/page.tsx`

The Réalisation page is currently a stub. This task builds it using the existing `RealisationTab` component (which already handles purchase orders, budget monitoring, equipment, and photos) plus a small extension to `PurchaseDrawer` for the nursery source selection.

- [ ] **Step 1: Modify `PurchaseDrawer.tsx` — add nurserySource + nurseryStockId fields to the Zod schema**

  In `src/components/realisation/PurchaseDrawer.tsx`, update the `schema` object (around line 41) to add:
  ```ts
  nurserySource:  z.enum(['fournisseur_externe', 'pepiniere_sopat']).default('fournisseur_externe'),
  nurseryStockId: z.string().uuid().optional(),
  ```

- [ ] **Step 2: Add `nurseryStockOptions` to Props type and component signature**

  Add to the `Props` type:
  ```ts
  nurseryStockOptions?: { id: string; botanicalName: string; availableQty: number; unit: string }[]
  ```

  Update the function signature:
  ```ts
  export function PurchaseDrawer({ projectId, plantItems, suppliers, open, onClose, onCreated, nurseryStockOptions = [] }: Props) {
  ```

- [ ] **Step 3: Add source radio + conditional stock picker to the form JSX**

  After the `supplierId` select field, add:

  ```tsx
  {/* Source */}
  <div className="space-y-2">
    <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
      Source d'approvisionnement
    </label>
    <div className="flex gap-4">
      {[['fournisseur_externe', 'Fournisseur externe'], ['pepiniere_sopat', 'Pépinière SOPAT']].map(([v, l]) => (
        <label key={v} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
          <input type="radio" {...register('nurserySource')} value={v} />
          {l}
        </label>
      ))}
    </div>
  </div>

  {watch('nurserySource') === 'pepiniere_sopat' && nurseryStockOptions.length > 0 && (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        Espèce pépinière
      </label>
      <select {...register('nurseryStockId')} className={inputClass} style={inputStyle}>
        <option value="">— Sélectionner —</option>
        {nurseryStockOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.botanicalName} ({s.availableQty} {s.unit} dispo)
          </option>
        ))}
      </select>
    </div>
  )}
  ```

  Note: you need to add `watch` to the destructured form methods at the top of the component:
  ```ts
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>(...)
  ```

- [ ] **Step 4: Pass nurserySource + nurseryStockId in the POST body**

  In the fetch call inside `PurchaseDrawer` (where it POSTs to `/api/projects/${projectId}/purchases` or equivalent), include:
  ```ts
  nurserySource:  values.nurserySource,
  nurseryStockId: values.nurseryStockId,
  ```

  Find the existing fetch and add those two fields to the JSON body.

- [ ] **Step 5: Build out `src/app/admin/(dashboard)/projects/[id]/realisation/page.tsx`**

  ```tsx
  import { auth } from '@/lib/auth'
  import { redirect } from 'next/navigation'
  import { db } from '../../../../../../db/index'
  import { projectPhases, projects } from '../../../../../../db/schema'
  import { eq, and } from 'drizzle-orm'
  import { listNurseryStock } from '@/lib/db/nursery'
  import { RealisationTab } from '@/components/realisation/RealisationTab'

  export const dynamic = 'force-dynamic'

  export default async function RealisationPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session) redirect('/auth/login')
    const { id } = await params

    const [phaseRows, nurseryRows, projectRows] = await Promise.all([
      db.select().from(projectPhases)
        .where(and(eq(projectPhases.projectId, id), eq(projectPhases.phase, 'realisation'))),
      listNurseryStock(),
      db.select({ approvedBudget: projects.approvedBudget }).from(projects).where(eq(projects.id, id)),
    ])

    const phase         = phaseRows[0]
    const approvedBudget = projectRows[0]?.approvedBudget ?? null

    const nurseryStockOptions = nurseryRows.map((r) => ({
      id: r.id, botanicalName: r.botanicalName, availableQty: r.availableQty, unit: r.unit,
    }))

    return (
      <RealisationTab
        projectId={id}
        phaseStatus={phase?.status ?? 'pending'}
        approvedBudget={approvedBudget}
        initialAssets={[]}
        userRole={session.user.role}
        nurseryStockOptions={nurseryStockOptions}
      />
    )
  }
  ```

  Note: `RealisationTab` will need to accept and pass `nurseryStockOptions` through to `PurchaseDrawer` (Step 6 below).

- [ ] **Step 6: Update `RealisationTab.tsx` to accept + pass `nurseryStockOptions`**

  In `src/components/realisation/RealisationTab.tsx`, add to the `Props` type:
  ```ts
  nurseryStockOptions?: { id: string; botanicalName: string; availableQty: number; unit: string }[]
  ```

  Update the `PurchaseDrawer` usage in the JSX to pass:
  ```tsx
  <PurchaseDrawer
    ...existingProps
    nurseryStockOptions={nurseryStockOptions ?? []}
  />
  ```

- [ ] **Step 7: Commit Réalisation integration**

  ```bash
  git add src/components/realisation/PurchaseDrawer.tsx src/components/realisation/RealisationTab.tsx src/app/admin/\(dashboard\)/projects/\[id\]/realisation/page.tsx
  git commit -m "feat(realisation): source radio on purchase orders + nursery stock picker integration"
  ```

---

## Task 9: Reports — Pépinière Tab

**Files:**
- Modify: `src/app/admin/(dashboard)/reports/page.tsx`
- Modify: `src/app/admin/(dashboard)/reports/ReportsClient.tsx`

- [ ] **Step 1: Add `getNurseryReport()` call in `reports/page.tsx`**

  Update the imports:
  ```ts
  import { getNurseryReport } from '@/lib/db/nursery'
  ```

  Add to the `Promise.all`:
  ```ts
  const [budgetVariance, ncMonthly, timeline, mlAccuracy, international, equipment, nursery] = await Promise.all([
    getBudgetVarianceReport(),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
    getInternationalReport(),
    getEquipmentReport(),
    getNurseryReport(),
  ])
  ```

  Add `nursery={nursery}` to the `<ReportsClient>` JSX.

- [ ] **Step 2: Add `nursery` to `Props` type in `ReportsClient.tsx`**

  Import the type:
  ```ts
  import type { NurseryReportData } from '@/lib/db/nursery'
  ```

  Add to `Props`:
  ```ts
  nursery: NurseryReportData
  ```

- [ ] **Step 3: Add the Pépinière tab section to `ReportsClient.tsx`**

  The existing component uses a tab pattern (or section list). Add a new `NurseryReport` sub-component at the bottom of the file, before the main export:

  ```tsx
  import { PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'

  // Add these constants at the top of the file alongside existing ones:
  const CATEGORY_LABEL_FR: Record<string, string> = {
    tree: 'Arbres', shrub: 'Arbustes', ground_cover: 'Couvre-sols',
    climber: 'Grimpantes', palm: 'Palmiers', grass: 'Graminées',
    aquatic: 'Aquatiques', other: 'Autres',
  }

  const HEALTH_LABEL_FR: Record<string, string> = {
    healthy: 'Sain', attention: 'Attention', critical: 'Critique', dead: 'Mort',
  }

  const HEALTH_COLORS: Record<string, string> = {
    healthy: '#16A34A', attention: '#D97706', critical: '#DC2626', dead: '#94A3B8',
  }

  function NurseryReport({ data }: { data: NurseryReportData }) {
    const categoryData = data.byCategory.map((c) => ({
      name:  CATEGORY_LABEL_FR[c.category] ?? c.category,
      value: c.count,
      units: c.units,
    }))

    const healthData = data.byHealth.map((h) => ({
      name:  HEALTH_LABEL_FR[h.status] ?? h.status,
      value: h.count,
      color: HEALTH_COLORS[h.status] ?? '#64748B',
    }))

    const FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

    return (
      <Section title="Pépinière SOPAT" subtitle="État du stock végétal interne">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Espèces',      value: data.totalSpecies },
            { label: 'Total unités', value: Math.round(data.totalUnits) },
            { label: 'Alertes santé', value: data.byHealth.filter((h) => h.status === 'critical' || h.status === 'attention').reduce((s, h) => s + h.count, 0) },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border p-3" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{c.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>{FMT.format(c.value)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Répartition par catégorie</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={['#2D5A27','#4A7C40','#6BA360','#8FC47F','#A8D4A0','#C5E0BF','#DCF0D7','#EEF7EB'][i % 8]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(value) => [typeof value === 'number' ? FMT.format(value) : String(value ?? ''), '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>État sanitaire</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {healthData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <ReTooltip formatter={(value) => [typeof value === 'number' ? FMT.format(value) : String(value ?? ''), '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>
    )
  }
  ```

- [ ] **Step 4: Add `<NurseryReport data={nursery} />` to the main `ReportsClient` component JSX**

  Find the return statement of `ReportsClient` and add the nursery report section at the end of the existing sections list:
  ```tsx
  <NurseryReport data={nursery} />
  ```

- [ ] **Step 5: Commit reports integration**

  ```bash
  git add src/app/admin/\(dashboard\)/reports/ src/lib/db/nursery.ts
  git commit -m "feat(reports): add Pépinière tab with category + health pie charts"
  ```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| `nursery_stock` + `nursery_stock_movements` tables | Task 1 + 2 |
| New enums (nursery_health, nursery_movement_type, nursery_source) | Task 1 |
| `nursery_source` column on `purchase_orders` | Task 1 |
| `/admin/nursery` dashboard with summary cards, stock table, filters, CSV export | Task 6 (page) + Task 5 (NurseryStockTable) |
| `/admin/nursery/[stockId]` detail with movement history | Task 6 |
| Movement logging (MovementDrawer) | Task 5 |
| Études integration: availability badge + reservation modal | Task 7 |
| Réalisation integration: source radio + nursery stock picker on PurchaseDrawer | Task 8 |
| Reports Pépinière tab | Task 9 |
| All UI in French | ✓ (all label maps use French) |
| Health status color coding | ✓ (HEALTH_COLOR maps in NurseryStockTable, detail page, NurseryReport) |
| CSV export | ✓ (NurseryStockTable.exportCsv) |
| AdminNav entry | Task 6, Step 5 |

**Placeholder scan:** No TBD, no "implement later", no vague steps. All code blocks are complete.

**Type consistency check:**
- `NurseryStockRow.availableQty` is `number` throughout (computed from decimal strings in `listNurseryStock`)
- `createMovement` receives `quantityDelta: string` (numeric string) — matches API route parsing
- `NurseryReportData` fields match usage in `NurseryReport` component
- `nurseryStockOptions` shape `{ id, botanicalName, availableQty, unit }` is consistent from `listNurseryStock` → `realisation/page.tsx` → `RealisationTab` → `PurchaseDrawer`

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-11-nursery-stock.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
