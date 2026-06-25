# DMS Code Auto-Generation — ERP Module Integration

**Date:** 2026-06-25  
**Status:** Approved  
**Approach:** Shared `attachDmsCode()` helper (Approach B)

---

## Context

The DMS infrastructure is already built:

- `dms_code_sequences` table — atomic counters per `(type_code, process_code)`, seeded from LIS-MI-01
- `dms_documents` table — full document registry with lifecycle, versioning, audit log
- `src/lib/dms/codes.ts` — type/process constants, validation, `buildCode()`
- `src/lib/dms/numbering.ts` — `getNextCode()` (atomic UPDATE…RETURNING) and `peekNextCode()`
- `src/lib/dms/queries.ts` — `listDmsDocuments()`, `createDmsDocument()`
- `GET /api/dms/next-code` and `POST /api/dms` — preview and create endpoints
- `/admin/documents` — working Document Registry page with filters and creation form

**Gap:** Other ERP modules (NC, Purchase Orders, Projects, CAPAs) do not generate DMS codes when they create records. This feature closes that gap.

---

## Goals

1. Every NC, Purchase Order, Project, and CAPA created in the ERP automatically receives a DMS code, atomically with record creation.
2. The code is displayed in the ERP module's own list and detail views as a read-only badge.
3. The DMS Document Registry automatically reflects all new entries — no registry changes needed.
4. One reusable function handles all modules; no logic is duplicated across routes.

---

## Non-Goals

- Changing the DMS Document Registry UI (`/admin/documents`) — it works already.
- Generating codes for records that already exist (migration of historical records is out of scope).
- Making codes editable by users — codes are always system-assigned and read-only.

---

## Section 1 — Core Helper: `attachDmsCode()`

**File:** `src/lib/dms/attach.ts`

### Signature

```ts
import type { DrizzleTransaction } from '@/lib/db/types' // existing or add alias

export async function attachDmsCode(
  tx: DrizzleTransaction,
  opts: {
    typeCode:    TypeCode       // 'FOR' | 'INS' | 'LIS' | 'ORG' | 'PLA' | 'PRC' | 'PRS'
    processCode: ProcessCode    // 'MI' | 'RH' | 'CO' | 'RE' | 'ET' | 'AC'
    designation: string        // becomes dms_documents.title (truncated to 255 chars)
    department:  DmsDepartment // maps to dms_documents.department
    category:    DmsCategory   // maps to dms_documents.category
    entityType:  DmsLinkEntity // 'non_conformance' | 'purchase_order' | 'project' | 'corrective_action'
    entityId:    string        // UUID of the ERP record
    authorId:    string        // user creating the record
  }
): Promise<string>             // returns the generated code, e.g. "FOR-MI-18"
```

### Behaviour

Executes three statements within the **caller-provided transaction**:

1. **Atomic counter bump:**
   ```sql
   UPDATE dms_code_sequences
   SET last_seq = last_seq + 1, updated_at = now()
   WHERE type_code = $typeCode AND process_code = $processCode
   RETURNING last_seq
   ```
   If no row exists (new combination), inserts one with `last_seq = 1` via `ON CONFLICT DO UPDATE`. The UPDATE itself is atomic — no `SELECT FOR UPDATE` required.

2. **Registry entry:**
   ```ts
   INSERT INTO dms_documents (document_number, title, category, department,
     status, owner_id, author_id, created_by, retention_years, ...)
   ```
   `status` is set to `'effective'` immediately (these are auto-generated operational records, not documents going through a draft/review lifecycle).

3. **Entity link:**
   ```ts
   INSERT INTO dms_document_links (document_id, entity_type, entity_id, link_role, created_by)
   VALUES ($docId, $entityType, $entityId, 'origin', $authorId)
   ```
   `link_role = 'origin'` means "this DMS entry was created by this ERP record" — distinguishes from manually attached documents.

Returns the code string (e.g. `"FOR-MI-18"`).

### Transaction contract

The caller wraps their entire ERP insert in `db.transaction(async (tx) => { ... })` and passes `tx` to `attachDmsCode`. If any step fails — including the ERP insert itself — the transaction rolls back atomically. The counter reverts. No orphaned codes are issued.

### Error handling

- If `typeCode`/`processCode` are not in the canonical lists, throw before touching the DB (validated via `isValidCode` from `codes.ts`).
- If `designation` is empty, throw `Error('designation is required')`.
- DB errors propagate — the caller's transaction catches and rolls back.

---

## Section 2 — Schema Additions

**Migration file:** `db/migrations/0010_dms_erp_codes.sql`

One nullable `varchar(20)` column added to each target table, storing the generated DMS code directly on the ERP record for fast display (no join to DMS required in list views):

```sql
ALTER TABLE non_conformances  ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE purchase_orders   ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE projects          ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
```

**Nullable** because existing records have no code. New records will always have a code after this feature ships.

**Drizzle schema** (`db/schema.ts`) updated to add `dmsDocumentCode: varchar('dms_document_code', { length: 20 })` to each of the four table definitions.

---

## Section 3 — Per-Module Wiring

Each module's DB query function (not the API route) is updated to:
1. Accept an optional `tx` parameter (or open its own transaction).
2. Call `attachDmsCode(tx, opts)` after the ERP insert.
3. Update the inserted row with the returned code.
4. Return the code alongside the existing return value.

### Module mapping

| ERP Entity | typeCode | processCode | department | category | entityType |
|---|---|---|---|---|---|
| Non-Conformance | `FOR` | `MI` | `qualite` | `ncr` | `non_conformance` |
| Corrective Action (CAPA) | `PRC` | `MI` | `qualite` | `capa` | `corrective_action` |
| Purchase Order | `FOR` | `AC` | `finance` | `bon_commande` | `purchase_order` |
| Project | `PRS` | `RE` | `realisation` | `cartographie_processus` | `project` |

### `createNc` (`src/lib/db/iso.ts`)

```ts
// Before: plain db.insert
// After:
export async function createNc(input: CreateNcInput) {
  return db.transaction(async (tx) => {
    const [nc] = await tx.insert(nonConformances).values({ ... }).returning()
    const code = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'MI',
      designation: input.description.slice(0, 255),
      department:  'qualite',
      category:    'ncr',
      entityType:  'non_conformance',
      entityId:    nc.id,
      authorId:    input.createdBy,
    })
    await tx.update(nonConformances)
      .set({ dmsDocumentCode: code })
      .where(eq(nonConformances.id, nc.id))
    return { ...nc, dmsDocumentCode: code }
  })
}
```

### `createCorrectiveAction` (`src/lib/db/iso.ts`)

Same pattern: `typeCode: 'PRC'`, `processCode: 'MI'`, `designation: input.actionDescription`.

### `createPurchaseOrder` (`src/lib/db/realisation.ts`)

Same pattern: `typeCode: 'FOR'`, `processCode: 'AC'`, `designation: input.itemDescription`.

### Project creation (`src/lib/db/projects.ts`)

Same pattern: `typeCode: 'PRS'`, `processCode: 'RE'`, `designation: input.name`.

**Note:** The existing `generateNcReference()` is untouched — NCs keep their `NC-YYYY-NNN` reference AND gain a separate `dms_document_code`. These serve different purposes: the NC reference is the quality tracking ID; the DMS code is the ISO document registry ID.

---

## Section 4 — UI Display

No new pages. Three targeted additions to existing components:

### NC list (`src/app/admin/(dashboard)/nc/NcPageClient.tsx`)
- Add `dmsDocumentCode` to the `NcListItem` type returned by `listNcs()`
- In the table row, render a small monospace badge next to the existing `reference` column:  
  `<span className="font-mono text-xs text-[var(--admin-text-muted)]">{row.dmsDocumentCode}</span>`

### NC detail (`src/app/admin/(dashboard)/nc/[id]/NcDetailClient.tsx`)
- Show `dmsDocumentCode` in the meta header row alongside `reference`, `status`, `detectedAt`
- Badge links to `/admin/documents?search={dmsDocumentCode}`

### Purchase Orders table (inside project realisation tab)
- Add `dmsDocumentCode` to the `getPurchaseOrders()` return type
- Render as first column in the PO table

### Projects table (`src/app/admin/(dashboard)/projects/ProjectsTable.tsx`)
- Add `dmsDocumentCode` to the project row type
- Render in the project name cell as a secondary line in muted text

### Project detail header
- Show `dmsDocumentCode` badge in the meta row alongside client name, status, dates

**All badges are read-only.** Users cannot edit or override codes.

---

## Section 5 — What Does Not Change

- `/api/dms/next-code` — still used by the Documents page creation form, unchanged
- `/api/dms` POST — still used by the Documents page for manually registered documents, unchanged
- `src/lib/dms/numbering.ts` — `getNextCode()` is called internally by `attachDmsCode()`, not changed
- `src/lib/dms/queries.ts` — `listDmsDocuments()` unchanged; new entries appear automatically
- `/admin/documents` page — zero changes; auto-generated entries appear in the registry immediately

---

## Files to Create / Modify

### New
- `src/lib/dms/attach.ts` — the `attachDmsCode()` helper
- `db/migrations/0010_dms_erp_codes.sql` — schema migration

### Modified
- `db/schema.ts` — add `dmsDocumentCode` column to 4 table definitions
- `src/lib/db/iso.ts` — wrap `createNc` and `createCorrectiveAction` in transactions, call `attachDmsCode`
- `src/lib/db/realisation.ts` — wrap `createPurchaseOrder`, call `attachDmsCode`
- `src/lib/db/projects.ts` — wrap project creation, call `attachDmsCode`
- `src/app/admin/(dashboard)/nc/NcPageClient.tsx` — display code badge in list
- `src/app/admin/(dashboard)/nc/[id]/NcDetailClient.tsx` — display code badge in detail
- Realisation tab PO table component — display code badge
- `src/app/admin/(dashboard)/projects/ProjectsTable.tsx` — display code badge
- Project detail header component — display code badge

---

## Invariants

- A DMS code, once issued, is never deleted. If an ERP record is soft-deleted, its `dmsDocumentCode` column retains the code. The `dms_documents` entry is never deleted.
- Counter never goes backwards. Even if a transaction rolls back, the next successful call gets the next integer. Gaps in the sequence are acceptable and expected.
- `attachDmsCode` must always be called inside a transaction. Calling it outside a transaction is a programming error (the DB insert could succeed while the caller's ERP insert fails, orphaning the code).
