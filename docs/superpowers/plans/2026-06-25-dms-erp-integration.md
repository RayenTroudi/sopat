# DMS ERP Code Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every NC, CAPA, Purchase Order, and Project created in the ERP automatically receives an ISO 9001 DMS code (e.g. `FOR-MI-18`), stored atomically with the record, displayed read-only in all relevant UI views.

**Architecture:** A single `attachDmsCode(tx, opts)` helper in `src/lib/dms/attach.ts` runs inside the caller's Drizzle transaction, atomically bumps the counter in `dms_code_sequences`, inserts a `dms_documents` registry entry, and inserts a `dms_document_links` row. Each DB query function wraps its insert in `db.transaction()` and calls the helper. A nullable `dms_document_code` column on each ERP table stores the result for fast display.

**Tech Stack:** Next.js App Router, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS / shadcn/ui, Zod (validation already in place).

## Global Constraints

- All DB operations that generate a DMS code MUST run inside a single Drizzle transaction — if any step fails, the entire transaction rolls back including the counter increment.
- `attachDmsCode` must NOT call `getNextCode()` from `numbering.ts` — that function escapes the transaction. Inline the UPDATE SQL directly against the `tx` parameter.
- DMS codes are permanent. Never delete a `dms_documents` row. If an ERP record is deleted, the code column retains its value; the `dms_documents` entry remains.
- Codes are read-only in the UI — never render them in an input users can edit.
- Follow existing Drizzle patterns: raw SQL via `sql` tag, `.returning()` for inserted IDs.
- TypeScript strict mode is in effect. No `any` unless an existing pattern already uses it.

---

## File Map

| Status | File | What changes |
|---|---|---|
| **Create** | `src/lib/dms/attach.ts` | `attachDmsCode()` helper |
| **Create** | `db/migrations/0010_dms_erp_codes.sql` | 4 `ALTER TABLE` statements |
| **Modify** | `db/schema.ts` | Add `dmsDocumentCode` to 4 tables |
| **Modify** | `src/lib/db/iso.ts` | Wrap `createNc` + `createCapa` in transactions, call helper |
| **Modify** | `src/lib/db/realisation.ts` | Wrap `createPurchaseOrder`, call helper |
| **Modify** | `src/lib/db/projects.ts` | Wrap `createProject`, call helper |
| **Modify** | `src/app/admin/(dashboard)/nc/NcPageClient.tsx` | DMS code badge in NC list |
| **Modify** | `src/app/admin/(dashboard)/nc/[id]/NcDetailClient.tsx` | DMS code badge in NC detail |
| **Modify** | `src/app/admin/(dashboard)/projects/ProjectsTable.tsx` | DMS code badge in project list |

---

## Task 1: Migration + Schema

**Files:**
- Create: `db/migrations/0010_dms_erp_codes.sql`
- Modify: `db/schema.ts`

**Interfaces:**
- Produces: `nonConformances.dmsDocumentCode`, `correctiveActions.dmsDocumentCode`, `purchaseOrders.dmsDocumentCode`, `projects.dmsDocumentCode` — all `varchar(20) | null` in Drizzle, `varchar(20) NULL` in Postgres.

- [ ] **Step 1: Write the migration file**

Create `db/migrations/0010_dms_erp_codes.sql` with this exact content:

```sql
-- db/migrations/0010_dms_erp_codes.sql
-- Adds dms_document_code to ERP tables for fast display without DMS join

ALTER TABLE non_conformances    ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE corrective_actions  ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE purchase_orders     ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE projects            ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
```

- [ ] **Step 2: Update Drizzle schema — `non_conformances`**

In `db/schema.ts`, find the `nonConformances` table definition. It currently ends with `createdBy: uuid('created_by').notNull()`. Add `dmsDocumentCode` before `...timestamps`:

```ts
// In the nonConformances pgTable definition, add after createdBy:
dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
```

- [ ] **Step 3: Update Drizzle schema — `corrective_actions`**

In `db/schema.ts`, find the `correctiveActions` table definition. Add after `createdBy`:

```ts
dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
```

- [ ] **Step 4: Update Drizzle schema — `purchase_orders`**

In `db/schema.ts`, find the `purchaseOrders` table definition. Add after `createdBy`:

```ts
dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
```

- [ ] **Step 5: Update Drizzle schema — `projects`**

In `db/schema.ts`, find the `projects` table definition. Add after `createdBy`:

```ts
dmsDocumentCode: varchar('dms_document_code', { length: 20 }),
```

- [ ] **Step 6: Run the migration**

```bash
npx drizzle-kit push
```

Expected: The command reports 4 columns added with no errors. If it asks to confirm destructive changes, there are none here — all are `ADD COLUMN IF NOT EXISTS`.

- [ ] **Step 7: Verify columns exist**

```bash
npx drizzle-kit studio
```

Open the four tables and confirm `dms_document_code varchar(20) NULL` appears. Or run directly in psql:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('non_conformances','corrective_actions','purchase_orders','projects')
  AND column_name = 'dms_document_code';
```

Expected: 4 rows returned.

- [ ] **Step 8: Commit**

```bash
git add db/migrations/0010_dms_erp_codes.sql db/schema.ts
git commit -m "feat: add dms_document_code column to NC, CAPA, PO, and project tables"
```

---

## Task 2: `attachDmsCode()` helper

**Files:**
- Create: `src/lib/dms/attach.ts`

**Interfaces:**
- Consumes:
  - `TypeCode`, `ProcessCode` from `src/lib/dms/codes.ts`
  - `dmsDocuments`, `dmsDocumentLinks` from `db/schema`
  - `sql`, `eq` from `drizzle-orm`
  - Drizzle transaction type: `Parameters<Parameters<typeof db.transaction>[0]>[0]`
- Produces:
  - `attachDmsCode(tx, opts): Promise<string>` — call this inside any `db.transaction()` callback; returns the generated code string (e.g. `"FOR-MI-18"`).

- [ ] **Step 1: Create `src/lib/dms/attach.ts`**

```ts
// src/lib/dms/attach.ts
import { sql, eq } from 'drizzle-orm'
import { db } from '../../../db/index'
import { dmsDocuments, dmsDocumentLinks } from '../../../db/schema'
import { buildCode, TYPE_CODES, PROCESS_CODES, type TypeCode, type ProcessCode } from './codes'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

type DmsDepartment = typeof dmsDocuments.$inferInsert['department']
type DmsCategory   = typeof dmsDocuments.$inferInsert['category']
type DmsLinkEntity = typeof dmsDocumentLinks.$inferInsert['entityType']

export async function attachDmsCode(
  tx: Tx,
  opts: {
    typeCode:    TypeCode
    processCode: ProcessCode
    designation: string
    department:  DmsDepartment
    category:    DmsCategory
    entityType:  DmsLinkEntity
    entityId:    string
    authorId:    string
  },
): Promise<string> {
  if (!TYPE_CODES.includes(opts.typeCode)) {
    throw new Error(`Invalid typeCode: ${opts.typeCode}`)
  }
  if (!PROCESS_CODES.includes(opts.processCode)) {
    throw new Error(`Invalid processCode: ${opts.processCode}`)
  }
  const designation = opts.designation.trim()
  if (!designation) {
    throw new Error('designation is required')
  }

  // 1. Atomic counter bump — inline against tx, never escapes the transaction
  const bump = await tx.execute(sql`
    INSERT INTO dms_code_sequences (type_code, process_code, last_seq, updated_at)
    VALUES (${opts.typeCode}, ${opts.processCode}, 1, now())
    ON CONFLICT (type_code, process_code) DO UPDATE
      SET last_seq   = dms_code_sequences.last_seq + 1,
          updated_at = now()
    RETURNING last_seq
  `)
  const seq = Number((bump.rows[0] as { last_seq: number }).last_seq)
  const code = buildCode(opts.typeCode, opts.processCode, seq)

  // 2. Register in dms_documents
  const [doc] = await tx
    .insert(dmsDocuments)
    .values({
      documentNumber:  code,
      title:           designation.slice(0, 255),
      category:        opts.category,
      department:      opts.department,
      status:          'effective',
      ownerId:         opts.authorId,
      authorId:        opts.authorId,
      isoClauses:      [],
      confidentiality: 'internal',
      tags:            [],
      retentionYears:  10,
      createdBy:       opts.authorId,
    })
    .returning({ id: dmsDocuments.id })

  // 3. Link to ERP entity
  await tx
    .insert(dmsDocumentLinks)
    .values({
      documentId:  doc.id,
      entityType:  opts.entityType,
      entityId:    opts.entityId,
      linkRole:    'origin',
      createdBy:   opts.authorId,
    })

  return code
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to `src/lib/dms/attach.ts`. Fix any type errors before proceeding — common ones:
- `departmentManagerId` is required on `dmsDocuments` — check schema; if `notNull()` without default, add `departmentManagerId: null` to the insert values.
- If `dmsDocumentLinks` has a required `notes` field, add `notes: null`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dms/attach.ts
git commit -m "feat: add attachDmsCode() transactional helper"
```

---

## Task 3: Wire NC creation

**Files:**
- Modify: `src/lib/db/iso.ts`

**Interfaces:**
- Consumes: `attachDmsCode` from `src/lib/dms/attach.ts`
- Produces:
  - `createNc(input)` now returns `Promise<typeof nonConformances.$inferSelect & { dmsDocumentCode: string }>` — same shape as before plus `dmsDocumentCode`.
  - `NcDetail` type gains `dmsDocumentCode: string | null`.
  - `NcListItem` type gains `dmsDocumentCode: string | null`.

- [ ] **Step 1: Add import for `attachDmsCode` in `src/lib/db/iso.ts`**

At the top of the file, after existing imports, add:

```ts
import { attachDmsCode } from '../dms/attach'
```

- [ ] **Step 2: Rewrite `createNc` to use a transaction**

Replace the existing `createNc` function (lines ~223–260) with:

```ts
export async function createNc(input: {
  reference:           string
  projectId?:          string
  processAffected?:    string
  ncType?:             string
  ownerType?:          string
  auditorName?:        string
  description:         string
  rootCause?:          string
  assignedTo?:         string
  deadline?:           Date
  beforePhotoAssetId?: string
  afterPhotoAssetId?:  string
  detectedBy:          string
  createdBy:           string
}) {
  return db.transaction(async (tx) => {
    const [nc] = await tx
      .insert(nonConformances)
      .values({
        reference:          input.reference,
        projectId:          input.projectId || null,
        processAffected:    (input.processAffected as NcProcess) || null,
        ncType:             (input.ncType as typeof nonConformances.$inferInsert['ncType']) || null,
        ownerType:          (input.ownerType as typeof nonConformances.$inferInsert['ownerType']) || null,
        auditorName:        input.auditorName,
        description:        input.description,
        rootCause:          input.rootCause,
        assignedTo:         input.assignedTo || null,
        deadline:           input.deadline,
        beforePhotoAssetId: input.beforePhotoAssetId || null,
        afterPhotoAssetId:  input.afterPhotoAssetId || null,
        detectedBy:         input.detectedBy,
        status:             'open',
        createdBy:          input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'MI',
      designation: input.description,
      department:  'qualite',
      category:    'ncr',
      entityType:  'non_conformance',
      entityId:    nc.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(nonConformances)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(nonConformances.id, nc.id))

    return { ...nc, dmsDocumentCode: dmsCode }
  })
}
```

- [ ] **Step 3: Add `dmsDocumentCode` to `NcListItem` type**

Find the `NcListItem` type (around line 47) and add the field:

```ts
export type NcListItem = {
  id: string
  reference: string
  status: string
  ncType: string | null
  processAffected: string
  description: string
  detectedAt: Date
  deadline: Date | null
  projectId: string | null
  projectName: string | null
  detectedByName: string | null
  assignedToName: string | null
  createdAt: Date
  dmsDocumentCode: string | null   // ← add this
}
```

- [ ] **Step 4: Add `dmsDocumentCode` to the `listNcs` select**

In `listNcs`, find the `.select({` block and add:

```ts
dmsDocumentCode: nonConformances.dmsDocumentCode,
```

- [ ] **Step 5: Add `dmsDocumentCode` to `NcDetail` type**

Find the `NcDetail` type (around line 119) and add:

```ts
dmsDocumentCode: string | null   // ← add this
```

- [ ] **Step 6: Add `dmsDocumentCode` to the `getNcById` select**

In `getNcById`, find the `.select({` block and add:

```ts
dmsDocumentCode: nonConformances.dmsDocumentCode,
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors. The `eq` import from `drizzle-orm` should already be present in `iso.ts`; if not, add it to the existing import line.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/iso.ts
git commit -m "feat: auto-generate DMS code FOR-MI-XX on NC creation"
```

---

## Task 4: Wire CAPA creation

**Files:**
- Modify: `src/lib/db/iso.ts`

**Interfaces:**
- Consumes: `attachDmsCode` (already imported after Task 3)
- Produces: `createCapa(input)` returns the same shape as before plus `dmsDocumentCode: string`. `CapaDetail` type gains `dmsDocumentCode: string | null`.

- [ ] **Step 1: Rewrite `createCapa` to use a transaction**

Replace the existing `createCapa` function (around line 297) with:

```ts
export async function createCapa(input: {
  ncId:              string
  actionDescription: string
  responsibleId:     string
  deadline?:         Date
  notes?:            string
  createdBy:         string
}) {
  return db.transaction(async (tx) => {
    const [capa] = await tx
      .insert(correctiveActions)
      .values({
        ncId:              input.ncId,
        actionDescription: input.actionDescription,
        responsibleId:     input.responsibleId,
        deadline:          input.deadline,
        notes:             input.notes,
        status:            'open',
        createdBy:         input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'PRC',
      processCode: 'MI',
      designation: input.actionDescription,
      department:  'qualite',
      category:    'capa',
      entityType:  'corrective_action',
      entityId:    capa.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(correctiveActions)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(correctiveActions.id, capa.id))

    return { ...capa, dmsDocumentCode: dmsCode }
  })
}
```

- [ ] **Step 2: Add `dmsDocumentCode` to `CapaDetail` type**

Find the `CapaDetail` type (around line 141) and add:

```ts
dmsDocumentCode: string | null   // ← add this
```

- [ ] **Step 3: Add `dmsDocumentCode` to the `getNcById` CAPA subselect**

In `getNcById`, find where CAPA rows are selected (they are fetched in a separate query or subselect after the NC row). Add `dmsDocumentCode: correctiveActions.dmsDocumentCode` to that select block.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/iso.ts
git commit -m "feat: auto-generate DMS code PRC-MI-XX on CAPA creation"
```

---

## Task 5: Wire Purchase Order creation

**Files:**
- Modify: `src/lib/db/realisation.ts`

**Interfaces:**
- Consumes: `attachDmsCode` from `src/lib/dms/attach.ts`
- Produces: `createPurchaseOrder(input)` returns same shape as before plus `dmsDocumentCode: string`.

- [ ] **Step 1: Add import in `src/lib/db/realisation.ts`**

At the top of the file, after existing imports, add:

```ts
import { attachDmsCode } from '../dms/attach'
```

Also ensure `eq` is imported from `drizzle-orm` (it should already be present — if not, add it to the existing import line).

- [ ] **Step 2: Rewrite `createPurchaseOrder` to use a transaction**

Replace the existing `createPurchaseOrder` function with:

```ts
export async function createPurchaseOrder(input: PurchaseOrderInput) {
  const qty   = parseFloat(input.quantityPurchased)
  const price = parseFloat(input.unitPricePaid)
  const total = (qty * price).toFixed(3)

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        projectId:             input.projectId,
        plantListItemId:       input.plantListItemId || null,
        itemDescription:       input.itemDescription,
        quantityPurchased:     input.quantityPurchased,
        unitPricePaid:         input.unitPricePaid,
        totalCost:             total,
        supplierId:            input.supplierId || null,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        invoiceAssetId:        input.invoiceAssetId || null,
        purchaseDate:          input.purchaseDate,
        purchasedBy:           input.purchasedBy,
        status:                'received',
        notes:                 input.notes,
        createdBy:             input.createdBy,
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'AC',
      designation: input.itemDescription,
      department:  'finance',
      category:    'bon_commande',
      entityType:  'purchase_order',
      entityId:    order.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(purchaseOrders)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(purchaseOrders.id, order.id))

    return { ...order, dmsDocumentCode: dmsCode }
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/realisation.ts
git commit -m "feat: auto-generate DMS code FOR-AC-XX on purchase order creation"
```

---

## Task 6: Wire Project creation

**Files:**
- Modify: `src/lib/db/projects.ts`

**Interfaces:**
- Consumes: `attachDmsCode` from `src/lib/dms/attach.ts`
- Produces: `createProject(input)` returns same shape as before plus `dmsDocumentCode: string`.

- [ ] **Step 1: Add import in `src/lib/db/projects.ts`**

At the top of the file, after existing imports, add:

```ts
import { attachDmsCode } from '../dms/attach'
```

Also ensure `eq` is imported from `drizzle-orm`.

- [ ] **Step 2: Rewrite `createProject` to use a transaction**

The current `createProject` (around line 293) does two inserts: the project row, then an initial `projectPhases` row. Both must stay in the same transaction. Replace with:

```ts
export async function createProject(input: CreateProjectInput) {
  const reference = await generateReference()

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        reference,
        name:                    input.name,
        clientName:              input.clientName,
        clientEmail:             input.clientEmail,
        clientPhone:             input.clientPhone,
        siteAddress:             input.siteAddress,
        siteAreaM2:              input.siteAreaM2,
        projectType:             input.projectType,
        status:                  'etudes',
        startDate:               input.startDate,
        estimatedDeliveryDate:   input.estimatedDeliveryDate,
        assignedEtudesChefId:    input.assignedEtudesChefId,
        notes:                   input.notes,
        country:                 input.country ?? 'TN',
        currency:                input.currency ?? 'TND',
        clientSector:            input.clientSector,
        clientAnonymized:        input.clientAnonymized ?? false,
        conceptTitle:            input.conceptTitle,
        conceptDescription:      input.conceptDescription,
        designVocabulary:        input.designVocabulary,
        plantPalettePhilosophy:  input.plantPalettePhilosophy,
        linearMeters:            input.linearMeters,
        floorCount:              input.floorCount,
        municipalityClient:      input.municipalityClient,
        territorySurfaceKm2:     input.territorySurfaceKm2,
        numberOfMunicipalities:  input.numberOfMunicipalities,
        lightingIncluded:        input.lightingIncluded ?? false,
        clientId:                input.clientId ?? null,
        createdBy:               input.createdBy,
      })
      .returning()

    // Initial phase record — stays in same transaction
    await tx.insert(projectPhases).values({
      projectId:  project.id,
      phase:      'etudes',
      status:     'in_progress',
      startedAt:  new Date(),
      createdBy:  input.createdBy,
    })

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'PRS',
      processCode: 'RE',
      designation: input.name,
      department:  'realisation',
      category:    'cartographie_processus',
      entityType:  'project',
      entityId:    project.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(projects)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(projects.id, project.id))

    return { ...project, dmsDocumentCode: dmsCode }
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors. The `generateReference()` call stays **outside** the transaction (it does a count query, not an insert — this is fine; the reference is generated before the transaction opens).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/projects.ts
git commit -m "feat: auto-generate DMS code PRS-RE-XX on project creation"
```

---

## Task 7: UI — NC list and detail badges

**Files:**
- Modify: `src/app/admin/(dashboard)/nc/NcPageClient.tsx`
- Modify: `src/app/admin/(dashboard)/nc/[id]/NcDetailClient.tsx`

**Interfaces:**
- Consumes: `dmsDocumentCode: string | null` on `NcListItem` (from Task 3) and `NcDetail` (from Task 3).

- [ ] **Step 1: Add DMS badge to NC list table — `NcPageClient.tsx`**

Find the table row rendering block in `NcPageClient.tsx`. It currently shows `nc.reference` in a `<span className="font-mono text-xs font-semibold">`. After that span, add the DMS badge on the same line:

```tsx
<span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
  {nc.reference}
</span>
{nc.dmsDocumentCode && (
  <span
    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
    style={{
      background: 'var(--admin-border)',
      color: 'var(--admin-text-muted)',
    }}
  >
    {nc.dmsDocumentCode}
  </span>
)}
```

Also find the `<TableCell>` that shows `nc.reference` in the full-width table view (around line 272) and add the same badge after it:

```tsx
<TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
  <div className="flex items-center gap-1.5 flex-wrap">
    {nc.reference}
    {nc.dmsDocumentCode && (
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
      >
        {nc.dmsDocumentCode}
      </span>
    )}
  </div>
</TableCell>
```

- [ ] **Step 2: Add DMS badge to NC detail — `NcDetailClient.tsx`**

In `NcDetailClient.tsx`, find the header section where `nc.reference` and `nc.status` are displayed. After the reference element, add:

```tsx
{nc.dmsDocumentCode && (
  <a
    href={`/admin/documents?search=${encodeURIComponent(nc.dmsDocumentCode)}`}
    className="font-mono text-[11px] px-2 py-0.5 rounded hover:opacity-75 transition-opacity"
    style={{
      background: 'var(--admin-border)',
      color: 'var(--admin-text-muted)',
    }}
    title="Voir dans le registre documentaire"
  >
    {nc.dmsDocumentCode}
  </a>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/(dashboard)/nc/NcPageClient.tsx src/app/admin/(dashboard)/nc/[id]/NcDetailClient.tsx
git commit -m "feat: show DMS code badge in NC list and detail views"
```

---

## Task 8: UI — Projects table badge

**Files:**
- Modify: `src/app/admin/(dashboard)/projects/ProjectsTable.tsx`

**Interfaces:**
- Consumes: `dmsDocumentCode: string | null` on `ProjectRow` — needs to be added to the local type and passed from the server component (`projects/page.tsx` and the query in `src/lib/db/projects.ts`).

- [ ] **Step 1: Add `dmsDocumentCode` to `ProjectRow` type in `ProjectsTable.tsx`**

Find the `ProjectRow` type (around line 15) and add:

```ts
type ProjectRow = {
  id: string
  reference: string
  name: string
  clientName: string
  status: string
  projectType: string
  approvedBudget: string | null
  country?: string | null
  currency?: string | null
  assignedEtudesChefId: string | null
  estimatedDeliveryDate: Date | null
  createdAt: Date
  dmsDocumentCode?: string | null   // ← add this
}
```

- [ ] **Step 2: Add DMS badge in the project name cell**

Find the `<TableCell>` that renders `row.name` as a `<Link>` (around line 202). Below the `{row.name}` link, there is already a mobile-only fallback `<div>` for `row.reference`. Add the DMS badge after the reference fallback div:

```tsx
{row.dmsDocumentCode && (
  <div className="mt-0.5 text-[10px] font-mono" style={{ color: 'var(--admin-text-muted)' }}>
    {row.dmsDocumentCode}
  </div>
)}
```

- [ ] **Step 3: Ensure the query passes `dmsDocumentCode`**

In `src/lib/db/projects.ts`, find the `listProjects` (or equivalent) function that returns the rows used by `ProjectsTable`. Add `dmsDocumentCode: projects.dmsDocumentCode` to its `.select({})` block. If the projects list query is in `projects/page.tsx` directly, add it there.

Run a quick grep to find the query:

```bash
grep -rn "listProjects\|getProjects\|from(projects)" src/lib/db/projects.ts src/app/admin
```

Add `dmsDocumentCode: projects.dmsDocumentCode` to whatever select object feeds `ProjectsTable`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(dashboard)/projects/ProjectsTable.tsx src/lib/db/projects.ts
git commit -m "feat: show DMS code badge in projects list"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `attachDmsCode()` helper with inline transaction counter bump | Task 2 |
| Schema: `dms_document_code` column on 4 tables | Task 1 |
| NC creation wired | Task 3 |
| CAPA creation wired | Task 4 |
| Purchase Order creation wired | Task 5 |
| Project creation wired | Task 6 |
| NC list badge | Task 7 |
| NC detail badge with link to registry | Task 7 |
| Projects table badge | Task 8 |
| Codes are read-only (no input) | All UI tasks — badges only, never `<input>` |
| DMS registry auto-reflects new entries | Implicit — `attachDmsCode` inserts into `dms_documents` |
| Counter never escapes transaction | Task 2 — inline `INSERT … ON CONFLICT DO UPDATE` against `tx` |

**Gap noted:** The Purchase Order UI badge (inside the project realisation tab) is not a separate task because the PO table component is not a standalone named file visible in the glob. Task 5 adds the data; the developer should also display it in whatever component renders the PO list inside the realisation tab. The `getPurchaseOrders` query return type already gains `dmsDocumentCode` by virtue of `.returning()` on the schema that now includes the column — no explicit query change needed.

**Placeholder scan:** No TBDs, no "implement later", no "handle edge cases" without specifics. All code blocks are complete.

**Type consistency:**
- `attachDmsCode` is defined in Task 2 and consumed identically in Tasks 3–6.
- `dmsDocumentCode: string | null` is the field name used consistently in types (Tasks 3, 4, 8) and in `.set()` calls (Tasks 3–6).
- `dmsDocumentCode` in `ProjectRow` is `string | null | undefined` (optional) to maintain backwards compatibility with rows returned before the migration — correct.
