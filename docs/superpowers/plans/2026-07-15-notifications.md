# In-App Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative bell icon in the admin header with a working notification center, and wire real notifications for project phase transitions and budget-threshold alerts, scoped by the (currently unused) role lists already configurable in Paramètres.

**Architecture:** One new `notifications` table + two dedupe columns on `projects`. A single `src/lib/notifications.ts` module resolves recipients by role and inserts rows; it is called from the one function that handles all phase transitions (`transitionPhase()`) and from the two places project spend increases (purchase order creation, extra expense approval). A polling React component in the header reads/marks them via three small API routes.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM (Neon Postgres), raw-SQL migration applied via `scripts/run-migration.mjs` (this repo's established non-interactive migration path — never `drizzle-kit push`/`migrate`, which require a TTY).

**Spec:** `docs/superpowers/specs/2026-07-15-notifications-design.md`

## Global Constraints

- Branch `feat/notifications` off `main`.
- Migration file: `db/migrations/0022_notifications.sql`, applied with
  `node --env-file=.env scripts/run-migration.mjs db/migrations/0022_notifications.sql`
  (exact command — this is how every prior migration in this repo was applied; do not use
  `drizzle-kit`).
- In-app only — no new emails.
- Recipients are resolved from `NotificationSettings.phaseTransition` / `.budgetAlert`
  (existing type in `src/lib/db/settings.ts`, already editable in Paramètres) — do not
  hardcode role lists in the new code.
- The actor who caused an event is excluded from their own notification.
- French UI strings, matching the rest of the admin.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No test runner exists in this repo (no jest/vitest) — verification is `tsc --noEmit`,
  a production build, and one-off `tsx` scripts against the dev DB, deleted after use
  (matches every prior plan in `docs/superpowers/plans/`).

---

### Task 1: Schema + migration

**Files:**
- Modify: `db/schema.ts` (append near the end, after the last table definition)
- Create: `db/migrations/0022_notifications.sql`

**Interfaces:**
- Produces (used by Tasks 2–5):
  - `notificationTypeEnum` — pgEnum `'phase_transition' | 'budget_alert'`
  - `notifications` table: `id, recipientId, type, title, body, href, projectId, readAt, createdAt, createdBy`
  - `projects.budgetAlert90NotifiedAt: timestamp | null`
  - `projects.budgetAlertOverNotifiedAt: timestamp | null`

- [ ] **Step 1: Add the enum, table, and two project columns to `db/schema.ts`**

Find the `projects` table definition (`export const projects = pgTable('projects', {`)
and add these two lines immediately before the `...timestamps,` line inside it:

```ts
  budgetAlert90NotifiedAt: timestamp('budget_alert_90_notified_at'),
  budgetAlertOverNotifiedAt: timestamp('budget_alert_over_notified_at'),
```

Then append this new block at the end of `db/schema.ts`:

```ts
// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationTypeEnum = pgEnum('notification_type', [
  'phase_transition',
  'budget_alert',
])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  href: varchar('href', { length: 500 }),
  projectId: uuid('project_id'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by'),
}, (t) => [
  index('notifications_recipient_unread_idx').on(t.recipientId, t.readAt),
  index('notifications_recipient_created_idx').on(t.recipientId, t.createdAt),
  foreignKey({ columns: [t.recipientId], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.projectId], foreignColumns: [projects.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])
```

- [ ] **Step 2: Write the migration**

Create `db/migrations/0022_notifications.sql`:

```sql
-- Systeme de notifications in-app : transitions de phase + alertes budget

CREATE TYPE "notification_type" AS ENUM ('phase_transition', 'budget_alert');

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "href" varchar(500),
  "project_id" uuid REFERENCES "projects"("id"),
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" ("recipient_id", "read_at");
CREATE INDEX IF NOT EXISTS "notifications_recipient_created_idx" ON "notifications" ("recipient_id", "created_at");

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_alert_90_notified_at" timestamp;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_alert_over_notified_at" timestamp;
```

- [ ] **Step 3: Apply the migration and verify**

Run: `node --env-file=.env scripts/run-migration.mjs db/migrations/0022_notifications.sql`
Expected: `Done — migration applied successfully.`

Run: `npx tsc --noEmit`
Expected: no errors (confirms the new Drizzle types compile against the schema additions
used nowhere yet, so this just checks `db/schema.ts` itself is well-formed).

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/notifications
git add db/schema.ts db/migrations/0022_notifications.sql
git commit -m "feat: notifications table + budget alert dedupe columns

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Recipient resolution + trigger functions

**Files:**
- Modify: `src/lib/db/settings.ts` (append `getNotificationSettings`)
- Create: `src/lib/notifications.ts`
- Test: `scripts/verify-notifications.ts` (temporary; deleted in Task 6)

**Interfaces:**
- Consumes: `notifications`, `notificationTypeEnum`, `projects`, `users`,
  `purchaseOrders`, `extraExpenses` from `db/schema.ts` (Task 1); `NotificationSettings`
  type from `src/lib/db/settings.ts`.
- Produces (used by Tasks 3, 4, 5):
  - `getNotificationSettings(): Promise<NotificationSettings>`
  - `notifyByRoles(opts: { type: 'phase_transition' | 'budget_alert'; title: string; body: string; href: string; projectId?: string | null; roles: string[]; createdBy: string; excludeUserId?: string }): Promise<void>`
  - `notifyPhaseTransition(opts: { projectId: string; projectReference: string; projectName: string; toPhase: string; actorId: string; actorName: string }): Promise<void>` (the French phase label is derived internally from `toPhase` via a `PHASE_LABELS` map — callers pass the raw phase key)
  - `checkBudgetThresholdAndNotify(projectId: string, actorId: string): Promise<void>`

- [ ] **Step 1: Add `getNotificationSettings` to `src/lib/db/settings.ts`**

Add at the end of the file:

```ts
// ─── Paramètres de notifications (accès direct, sans company/smtp) ───────────

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return getSetting<NotificationSettings>('notifications', DEFAULTS.notifications)
}
```

- [ ] **Step 2: Create `src/lib/notifications.ts`**

```ts
// src/lib/notifications.ts
// Résolution des destinataires par rôle + création des notifications in-app.
// Recipients viennent des listes de rôles déjà configurables dans Paramètres >
// Notifications (jusqu'ici jamais réellement consultées par le code).

import { db } from '../../db/index'
import { notifications, projects, purchaseOrders, extraExpenses, users } from '../../db/schema'
import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { getNotificationSettings } from './db/settings'

const PHASE_LABELS: Record<string, string> = {
  etudes: 'Études',
  realisation: 'Réalisation',
  entretien: 'Entretien',
  completed: 'Terminé',
}

// ─── Bas niveau : insertion par rôles ─────────────────────────────────────────

export async function notifyByRoles(opts: {
  type: 'phase_transition' | 'budget_alert'
  title: string
  body: string
  href: string
  projectId?: string | null
  roles: string[]
  createdBy: string
  excludeUserId?: string
}): Promise<void> {
  if (opts.roles.length === 0) return

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      inArray(users.role, opts.roles as (typeof users.role.enumValues)[number][]),
      eq(users.isActive, true),
      isNull(users.deletedAt),
    ))

  const filtered = opts.excludeUserId
    ? recipients.filter((r) => r.id !== opts.excludeUserId)
    : recipients

  if (filtered.length === 0) return

  await db.insert(notifications).values(
    filtered.map((r) => ({
      recipientId: r.id,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      href: opts.href,
      projectId: opts.projectId ?? null,
      createdBy: opts.createdBy,
    }))
  )
}

// ─── Transition de phase ──────────────────────────────────────────────────────

export async function notifyPhaseTransition(opts: {
  projectId: string
  projectReference: string
  projectName: string
  toPhase: string
  actorId: string
  actorName: string
}): Promise<void> {
  const settings = await getNotificationSettings()
  const toPhaseLabel = PHASE_LABELS[opts.toPhase] ?? opts.toPhase

  await notifyByRoles({
    type: 'phase_transition',
    title: `Projet transféré en ${toPhaseLabel} — ${opts.projectReference}`,
    body: `${opts.projectName} est passé en phase ${toPhaseLabel} (validé par ${opts.actorName}).`,
    href: `/admin/projects/${opts.projectId}`,
    projectId: opts.projectId,
    roles: settings.phaseTransition,
    createdBy: opts.actorId,
    excludeUserId: opts.actorId,
  })
}

// ─── Alerte budget ─────────────────────────────────────────────────────────────

export async function checkBudgetThresholdAndNotify(projectId: string, actorId: string): Promise<void> {
  const [project] = await db
    .select({
      id: projects.id,
      reference: projects.reference,
      name: projects.name,
      approvedBudget: projects.approvedBudget,
      budgetAlert90NotifiedAt: projects.budgetAlert90NotifiedAt,
      budgetAlertOverNotifiedAt: projects.budgetAlertOverNotifiedAt,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project || !project.approvedBudget) return
  const approved = parseFloat(project.approvedBudget)
  if (!(approved > 0)) return

  const [poRow] = await db
    .select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, projectId))

  const [exRow] = await db
    .select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
    .from(extraExpenses)
    .where(and(
      eq(extraExpenses.projectId, projectId),
      eq(extraExpenses.status, 'approved'),
      isNull(extraExpenses.deletedAt),
    ))

  const spent = parseFloat(poRow?.total ?? '0') + parseFloat(exRow?.total ?? '0')
  const percentSpent = Math.round((spent / approved) * 1000) / 10
  const now = new Date()
  const settings = await getNotificationSettings()
  const href = `/admin/projects/${projectId}`

  if (percentSpent >= 100 && !project.budgetAlertOverNotifiedAt) {
    await notifyByRoles({
      type: 'budget_alert',
      title: `Dépassement budget — ${project.reference}`,
      body: `${project.name} a dépassé son budget approuvé (${percentSpent}% dépensé).`,
      href,
      projectId,
      roles: settings.budgetAlert,
      createdBy: actorId,
    })
    await db.update(projects).set({ budgetAlertOverNotifiedAt: now }).where(eq(projects.id, projectId))
    return
  }

  if (percentSpent >= 90 && !project.budgetAlert90NotifiedAt) {
    await notifyByRoles({
      type: 'budget_alert',
      title: `Alerte budget 90% — ${project.reference}`,
      body: `${project.name} a atteint ${percentSpent}% de son budget approuvé.`,
      href,
      projectId,
      roles: settings.budgetAlert,
      createdBy: actorId,
    })
    await db.update(projects).set({ budgetAlert90NotifiedAt: now }).where(eq(projects.id, projectId))
  }
}
```

- [ ] **Step 3: Write the verification script**

Create `scripts/verify-notifications.ts`:

```ts
import { db } from '../db/index'
import { eq } from 'drizzle-orm'
import { projects, users, notifications } from '../db/schema'
import { getNotificationSettings } from '../src/lib/db/settings'
import { notifyByRoles, checkBudgetThresholdAndNotify } from '../src/lib/notifications'

async function main() {
  const settings = await getNotificationSettings()
  console.log('notification settings:', JSON.stringify(settings))
  if (settings.phaseTransition.length === 0 || settings.budgetAlert.length === 0) {
    throw new Error('Expected non-empty default role lists')
  }

  // notifyByRoles: pick a real admin user, verify exclusion + insertion
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1)
  if (!admin) throw new Error('No admin user found in dev DB — cannot verify')

  const before = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  await notifyByRoles({
    type: 'phase_transition',
    title: 'TEST — vérification notifyByRoles',
    body: 'ligne de test',
    href: '/admin',
    roles: ['admin'],
    createdBy: admin.id,
    excludeUserId: admin.id, // admin excluded — should NOT receive this one
  })
  const afterExcluded = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  if (afterExcluded.length !== before.length) {
    throw new Error(`Excluded actor still got notified: before=${before.length} after=${afterExcluded.length}`)
  }
  console.log('✓ excludeUserId correctly skips the actor')

  await notifyByRoles({
    type: 'phase_transition',
    title: 'TEST — vérification notifyByRoles (sans exclusion)',
    body: 'ligne de test',
    href: '/admin',
    roles: ['admin'],
    createdBy: admin.id,
  })
  const afterIncluded = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  if (afterIncluded.length !== before.length + 1) {
    throw new Error(`Expected exactly 1 new row, got ${afterIncluded.length - before.length}`)
  }
  console.log('✓ notifyByRoles inserts exactly one row per matching active user')

  // checkBudgetThresholdAndNotify: find a project with an approved budget
  const [project] = await db
    .select({ id: projects.id, approvedBudget: projects.approvedBudget })
    .from(projects)
    .where(eq(projects.approvedBudget, projects.approvedBudget)) // any non-null via filter below
  const withBudget = (await db.select({ id: projects.id, approvedBudget: projects.approvedBudget }).from(projects))
    .find((p) => p.approvedBudget !== null)
  if (withBudget) {
    await checkBudgetThresholdAndNotify(withBudget.id, admin.id)
    console.log(`✓ checkBudgetThresholdAndNotify ran without throwing for project ${withBudget.id}`)
  } else {
    console.log('⚠ no project with an approved budget in dev DB — skipped threshold check')
  }

  // Cleanup test rows
  await db.delete(notifications).where(eq(notifications.title, 'TEST — vérification notifyByRoles'))
  await db.delete(notifications).where(eq(notifications.title, 'TEST — vérification notifyByRoles (sans exclusion)'))
  console.log('✓ cleaned up test rows')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 4: Run verification**

Run: `npx tsc --noEmit && node --env-file=.env -r tsx/cjs scripts/verify-notifications.ts`

If that invocation errors on ESM/tsx loading, use the pattern already used elsewhere in
this repo instead: `npx tsx --env-file=.env scripts/verify-notifications.ts`

Expected output ends with:
```
✓ excludeUserId correctly skips the actor
✓ notifyByRoles inserts exactly one row per matching active user
✓ checkBudgetThresholdAndNotify ran without throwing for project <uuid>
✓ cleaned up test rows
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/settings.ts src/lib/notifications.ts scripts/verify-notifications.ts
git commit -m "feat: role-based notification recipient resolution + triggers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire the phase-transition trigger

**Files:**
- Modify: `src/lib/db/projects.ts:447-565` (the `transitionPhase` function)

**Interfaces:**
- Consumes: `notifyPhaseTransition` from `src/lib/notifications.ts` (Task 2).

- [ ] **Step 1: Add the import**

At the top of `src/lib/db/projects.ts`, add:

```ts
import { notifyPhaseTransition } from '../notifications'
```

(Check the existing import block first — if a relative path alias is already used for
sibling `lib/` modules in this file, match that style instead of the literal
`'../notifications'` path. The file lives at `src/lib/db/projects.ts`, so
`../notifications` resolves to `src/lib/notifications.ts`, which is correct.)

- [ ] **Step 2: Call it after `logActivity`, before the return**

In `transitionPhase()`, find:

```ts
  await logActivity({
    projectId,
    actorId: signOffData.actorId,
    actorName: signOffData.actorName,
    action: 'project.phase_transition',
    previousState: { phase: currentPhase, phaseStatus: 'in_progress', projectStatus: project.status },
    newState: { phase: next, projectStatus: newStatus },
    metadata: { notes: signOffData.notes },
  })

  return { ok: true, newStatus }
}
```

Replace with:

```ts
  await logActivity({
    projectId,
    actorId: signOffData.actorId,
    actorName: signOffData.actorName,
    action: 'project.phase_transition',
    previousState: { phase: currentPhase, phaseStatus: 'in_progress', projectStatus: project.status },
    newState: { phase: next, projectStatus: newStatus },
    metadata: { notes: signOffData.notes },
  })

  if (next !== 'completed') {
    await notifyPhaseTransition({
      projectId,
      projectReference: project.reference,
      projectName: project.name,
      toPhase: next,
      actorId: signOffData.actorId,
      actorName: signOffData.actorName,
    })
  }

  return { ok: true, newStatus }
}
```

(`next === 'completed'` is not a phase name in `PHASE_LABELS` and the spec scopes this to
phase transitions between Études/Réalisation/Entretien — skip notifying on final project
completion rather than sending a mislabeled notification.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/projects.ts
git commit -m "feat: notify on project phase transition

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire the budget-alert trigger

**Files:**
- Modify: `src/lib/db/realisation.ts:141-185` (`createPurchaseOrder`)
- Modify: `src/lib/actions/achat.ts:96-119` (`decideExtraExpense`)
- Modify: `src/lib/db/predictions.ts:102-139` (`saveBudgetValidation`)

**Interfaces:**
- Consumes: `checkBudgetThresholdAndNotify` from `src/lib/notifications.ts` (Task 2).

- [ ] **Step 1: Call the check after a purchase order is created**

In `src/lib/db/realisation.ts`, add the import at the top:

```ts
import { checkBudgetThresholdAndNotify } from '../notifications'
```

Find `createPurchaseOrder`:

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

Replace the whole function with (adds the budget check after the transaction commits —
never inside it, so a notification failure can never roll back a real purchase order):

```ts
export async function createPurchaseOrder(input: PurchaseOrderInput) {
  const qty   = parseFloat(input.quantityPurchased)
  const price = parseFloat(input.unitPricePaid)
  const total = (qty * price).toFixed(3)

  const result = await db.transaction(async (tx) => {
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

  await checkBudgetThresholdAndNotify(input.projectId, input.createdBy)

  return result
}
```

- [ ] **Step 2: Call the check after an extra expense is approved**

In `src/lib/actions/achat.ts`, add the import at the top:

```ts
import { checkBudgetThresholdAndNotify } from '@/lib/notifications'
```

Find `decideExtraExpense`:

```ts
export async function decideExtraExpense(
  id: string,
  decision: 'approved' | 'rejected',
  rejectReason?: string,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  // La validation des dépenses est réservée à la direction
  if (!['admin', 'direction'].includes(session.user.role))
    return { success: false, error: 'Validation réservée à la direction' }

  await db
    .update(extraExpenses)
    .set({
      status: decision,
      approvedBy: session.user.userId,
      approvedAt: new Date(),
      rejectReason: decision === 'rejected' ? rejectReason : null,
      updatedAt: new Date(),
    })
    .where(eq(extraExpenses.id, id))
  revalidatePath('/admin/achat/extra-expenses')
  return { success: true }
}
```

Replace with:

```ts
export async function decideExtraExpense(
  id: string,
  decision: 'approved' | 'rejected',
  rejectReason?: string,
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Non autorisé' }
  // La validation des dépenses est réservée à la direction
  if (!['admin', 'direction'].includes(session.user.role))
    return { success: false, error: 'Validation réservée à la direction' }

  const [updated] = await db
    .update(extraExpenses)
    .set({
      status: decision,
      approvedBy: session.user.userId,
      approvedAt: new Date(),
      rejectReason: decision === 'rejected' ? rejectReason : null,
      updatedAt: new Date(),
    })
    .where(eq(extraExpenses.id, id))
    .returning({ projectId: extraExpenses.projectId })

  if (decision === 'approved' && updated?.projectId) {
    await checkBudgetThresholdAndNotify(updated.projectId, session.user.userId)
  }

  revalidatePath('/admin/achat/extra-expenses')
  return { success: true }
}
```

- [ ] **Step 3: Reset the dedupe columns whenever a new budget is approved**

In `src/lib/db/predictions.ts`, find in `saveBudgetValidation`:

```ts
  // Write the approved budget to the project
  await db
    .update(projects)
    .set({ approvedBudget: String(input.approvedAmount), updatedAt: now })
    .where(eq(projects.id, input.projectId))
```

Replace with:

```ts
  // Write the approved budget to the project — reset the alert dedupe columns so
  // a re-approved budget starts a fresh 90%/100% notification cycle.
  await db
    .update(projects)
    .set({
      approvedBudget: String(input.approvedAmount),
      budgetAlert90NotifiedAt: null,
      budgetAlertOverNotifiedAt: null,
      updatedAt: now,
    })
    .where(eq(projects.id, input.projectId))
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/realisation.ts src/lib/actions/achat.ts src/lib/db/predictions.ts
git commit -m "feat: notify on budget threshold crossing (90%% / dépassement)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: API routes + header UI

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/route.ts`
- Create: `src/app/api/notifications/mark-all-read/route.ts`
- Create: `src/components/AdminNotifications.tsx`
- Modify: `src/components/AdminHeader.tsx`

**Interfaces:**
- Consumes: `notifications` table (Task 1).
- Produces: `GET /api/notifications` → `{ notifications: NotificationRow[]; unreadCount: number }`
  where `NotificationRow = { id: string; type: string; title: string; body: string | null; href: string | null; projectId: string | null; createdAt: string; readAt: string | null }`.

- [ ] **Step 1: `GET /api/notifications`**

Create `src/app/api/notifications/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../db/index'
import { notifications } from '../../../../db/schema'
import { eq, desc, and, isNull, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const recipientId = session.user.userId

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id:        notifications.id,
        type:      notifications.type,
        title:     notifications.title,
        body:      notifications.body,
        href:      notifications.href,
        projectId: notifications.projectId,
        createdAt: notifications.createdAt,
        readAt:    notifications.readAt,
      })
      .from(notifications)
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt))
      .limit(20),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt))),
  ])

  return NextResponse.json({ notifications: rows, unreadCount: count })
}
```

- [ ] **Step 2: `PATCH /api/notifications/[id]`**

Create `src/app/api/notifications/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { notifications } from '../../../../../db/schema'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.userId)))
    .returning({ id: notifications.id })

  if (!row) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: `POST /api/notifications/mark-all-read`**

Create `src/app/api/notifications/mark-all-read/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { notifications } from '../../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, session.user.userId), isNull(notifications.readAt)))

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create the header component**

Create `src/components/AdminNotifications.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  projectId: string | null
  createdAt: string
  readAt: string | null
}

const POLL_MS = 30_000

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export function AdminNotifications() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notifications: NotificationRow[]; unreadCount: number } | null) => {
        if (!data) return
        setItems(data.notifications)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSelect(n: NotificationRow) {
    setOpen(false)
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      fetch(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => {})
    }
    if (n.href) router.push(n.href)
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    fetch('/api/notifications/mark-all-read', { method: 'POST' }).catch(() => {})
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        style={{ color: 'rgba(0,0,0,0.5)' }}
        onClick={() => setOpen((p) => !p)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center text-white"
            style={{ background: '#DC2626' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border shadow-lg overflow-hidden z-50"
          style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.12)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-semibold" style={{ color: 'rgba(0,0,0,0.8)' }}>Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium"
                style={{ color: '#1F6B3D' }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-center" style={{ color: 'rgba(0,0,0,0.4)' }}>
              Aucune notification
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(n)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-[rgba(0,0,0,0.03)]"
                    style={{ borderColor: 'rgba(0,0,0,0.06)', background: n.readAt ? 'transparent' : 'rgba(31,107,61,0.05)' }}
                  >
                    <p className="text-sm" style={{ color: 'rgba(0,0,0,0.85)', fontWeight: n.readAt ? 400 : 600 }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(0,0,0,0.5)' }}>{n.body}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(0,0,0,0.35)' }}>{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire it into the header**

In `src/components/AdminHeader.tsx`, replace the import:

```ts
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { AdminSearch } from '@/components/AdminSearch'
```

with:

```ts
import { Menu, ChevronDown } from 'lucide-react'
import { AdminSearch } from '@/components/AdminSearch'
import { AdminNotifications } from '@/components/AdminNotifications'
```

Then find the decorative bell button:

```tsx
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          style={{ color: 'rgba(0,0,0,0.5)' }}
        >
          <Bell className="w-4 h-4" />
        </Button>
```

Replace it with:

```tsx
        <AdminNotifications />
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors — confirms `Bell` import removal didn't leave a dangling reference and
the new component's props/types line up.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/notifications src/components/AdminNotifications.tsx src/components/AdminHeader.tsx
git commit -m "feat: notification center UI (badge, dropdown, mark as read)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end verification, cleanup, build, PR

**Files:**
- Delete: `scripts/verify-notifications.ts`

- [ ] **Step 1: Full type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds (145+ routes, matching the route count from prior plans in this
repo plus the 3 new `/api/notifications*` routes).

- [ ] **Step 2: End-to-end check against the dev DB — insert a project in a known state, transition it, confirm notifications land**

Create a throwaway verification script `scripts/verify-phase-transition-e2e.ts`:

```ts
import { db } from '../db/index'
import { eq, and } from 'drizzle-orm'
import { projects, projectPhases, users, notifications } from '../db/schema'
import { transitionPhase } from '../src/lib/db/projects'

async function main() {
  const [admin] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, 'admin')).limit(1)
  if (!admin) throw new Error('No admin user in dev DB')

  const [project] = await db
    .insert(projects)
    .values({
      reference: `TEST-NOTIF-${Date.now()}`,
      name: 'Projet test notifications',
      clientName: 'Client test',
      siteAddress: 'Adresse test',
      projectType: 'residentiel',
      status: 'etudes',
      createdBy: admin.id,
    })
    .returning({ id: projects.id })

  await db.insert(projectPhases).values({
    projectId: project.id,
    phase: 'etudes',
    status: 'in_progress',
    startedAt: new Date(),
    createdBy: admin.id,
  })

  const result = await transitionPhase(project.id, 'etudes', {
    actorId: admin.id,
    actorName: admin.name,
    notes: 'test e2e',
  })
  if (!result.ok) throw new Error(`transitionPhase failed: ${result.message}`)
  console.log('✓ transitionPhase succeeded, newStatus =', result.newStatus)

  const rows = await db
    .select({ title: notifications.title, recipientId: notifications.recipientId })
    .from(notifications)
    .where(eq(notifications.projectId, project.id))
  if (rows.length === 0) throw new Error('Expected at least one notification row, got 0')
  console.log(`✓ ${rows.length} notification(s) created:`, JSON.stringify(rows))

  const actorGotOne = rows.some((r) => r.recipientId === admin.id)
  if (actorGotOne) throw new Error('Actor (admin) should have been excluded but received a notification')
  console.log('✓ actor correctly excluded from their own notification')

  // Cleanup
  await db.delete(notifications).where(eq(notifications.projectId, project.id))
  await db.delete(projectPhases).where(eq(projectPhases.projectId, project.id))
  await db.delete(projects).where(eq(projects.id, project.id))
  console.log('✓ cleaned up test project')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

Run: `npx tsx --env-file=.env scripts/verify-phase-transition-e2e.ts`
Expected: all four `✓` lines print, script exits 0. This proves Tasks 1–3 are wired
correctly end to end: the migration's table accepts writes, `transitionPhase` calls
`notifyPhaseTransition`, role resolution finds real recipients via the default
`phaseTransition` role list (`admin`, `etudes_chef`, `realisation_chef`, `entretien_chef`
— the seed data used throughout this project includes chef accounts for each, so at least
one non-admin recipient always exists even when the acting admin is excluded from their
own notification), and the actor-exclusion logic works.

If the row-count assertion fails with 0 rows, check first whether the dev DB actually has
an active user in one of those four roles — the test's correctness depends on that seed
data existing, not just on the code being right.

```bash
git rm scripts/verify-phase-transition-e2e.ts
```

- [ ] **Step 3: Remove the temporary verification script**

```bash
git rm scripts/verify-notifications.ts
```

- [ ] **Step 4: Commit, push, PR, merge**

```bash
git add -A
git commit -m "chore: drop notifications verification script

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push -u origin feat/notifications
```

Create the PR with `gh pr create --title "In-app notifications: phase transitions + budget alerts" --body-file <temp file>` (body via `--body-file`, this repo's established convention — avoids PowerShell `&` parsing issues), covering: why (dead bell icon, dead `NotificationSettings`, `triggerBudgetAlertEmail` never called), the two trigger points, the dedupe mechanism, and verification evidence. Then `gh pr merge --merge --delete-branch`, `git checkout main && git pull`.
