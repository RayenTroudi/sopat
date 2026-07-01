# SMQ Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all ISO 9001:2015 quality and environmental management documents from the `Management de la qualité & environnement` folder into the ERP platform as structured database modules with full CRUD UI.

**Architecture:** Each ISO form/register maps to Drizzle ORM tables following the existing pattern (`uuid PK defaultRandom()`, `...timestamps`, `createdBy uuid FK`, soft deletes via `deletedAt`). Server actions live in `src/lib/actions/`, DB queries in `src/lib/db/`, UI pages under `src/app/admin/(dashboard)/`. New enums are added to `db/schema.ts` at the top of the enums section.

**Tech Stack:** Next.js App Router, Drizzle ORM + PostgreSQL (Neon), Tailwind CSS, TypeScript, `drizzle-kit push` for migrations.

## Global Constraints

- All tables use `uuid('id').primaryKey().defaultRandom()` — no serial/autoincrement
- All tables spread `...timestamps` (createdAt + updatedAt)
- All tables with user ownership add `createdBy: uuid('created_by').notNull()` with FK to `users`
- Soft deletes via `deletedAt: timestamp('deleted_at')` on any entity that should be recoverable
- Always add `index()` on FK columns and status/year columns
- Run `npx drizzle-kit push` (not `migrate`) — this project uses push-based migrations
- Auth pattern: `const session = await auth(); if (!session) redirect('/login');`
- Data fetch pattern: `const [a, b] = await Promise.all([getA(), getB()])`
- Server actions return `{ success: boolean; error?: string }` and use `revalidatePath`
- `searchParams` in page components typed as `Promise<Record<string, string | string[] | undefined>>`

---

## Build Sequence

1. Schema + migration (all 9 tables at once)
2. Module 1 — Risks & Opportunities (FOR-MI-07)
3. Module 2 — Stakeholders & Écoute PI (FOR-MI-08 / FOR-MI-09)
4. Module 3 — Regulatory Watch (LIS-MI-07 partial)
5. Module 4 — Internal Auditors list (LIS-MI-05)
6. Module 5 — Waste Tracking (FOR-MI-11)
7. Module 6 — HSE Checklist (FOR-MI-12)
8. Module 7 — Annual Management Plan + Communication (PLA-MI-01 / PLA-MI-02)
9. Module 8 — KPI Live Dashboard (FOR-MI-10 tab on /admin/dashboard)
10. DMS seed — register PRC/INS/PRS/ORG documents into `dms_documents`

---

### Task 1: Schema — All New Tables

**Files:**
- Modify: `db/schema.ts` (append new enums + tables at end of each section)

**Interfaces:**
- Produces: exported table constants used by all subsequent tasks

- [ ] **Step 1: Add new enums** — open `db/schema.ts`, find the last existing enum (search for `export const interactionTypeEnum`) and insert after it:

```typescript
// ─── SMQ Enums ────────────────────────────────────────────────────────────────

export const roTypeEnum = pgEnum('ro_type', ['risk', 'opportunity'])

export const roCategoryEnum = pgEnum('ro_category', [
  'contexte_interne',
  'contexte_externe',
  'partie_interessee',
  'processus',
  'environnement',
  'autre',
])

export const roStatusEnum = pgEnum('ro_status', [
  'identified',
  'treated',
  'monitored',
  'closed',
])

export const stakeholderTypeEnum = pgEnum('stakeholder_type', [
  'client',
  'fournisseur',
  'partenaire',
  'employe',
  'actionnaire',
  'autorite_reglementaire',
  'communaute',
  'autre',
])

export const feedbackChannelEnum = pgEnum('feedback_channel', [
  'enquete_satisfaction',
  'reunion',
  'email',
  'reclamation',
  'audit',
  'autre',
])

export const regulatoryStatusEnum = pgEnum('regulatory_status', [
  'applicable',
  'non_applicable',
  'en_veille',
])

export const wasteTypeEnum = pgEnum('waste_type', [
  'papier_carton',
  'plastique',
  'verre',
  'metal',
  'dechets_verts',
  'dechets_chimiques',
  'electronique',
  'autre',
])

export const wasteDisposalEnum = pgEnum('waste_disposal', [
  'tri_selectif',
  'collecte_municipale',
  'prestataire_agree',
  'incineration',
  'autre',
])

export const hseSubmissionStatusEnum = pgEnum('hse_submission_status', [
  'conforme',
  'non_conforme',
  'partiel',
])

export const planActivityStatusEnum = pgEnum('plan_activity_status', [
  'planifie',
  'realise_dans_delai',
  'realise_avec_retard',
  'non_realise',
  'cloture',
])

export const communicationDirectionEnum = pgEnum('communication_direction', [
  'interne',
  'externe',
])
```

- [ ] **Step 2: Add new tables** — at the end of `db/schema.ts`, append:

```typescript
// ─── Risks & Opportunities (FOR-MI-07) ───────────────────────────────────────

export const risksOpportunities = pgTable('risks_opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 30 }).notNull().unique(), // e.g. R-2025-001
  type: roTypeEnum('type').notNull(),
  category: roCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  context: text('context'), // source / origin
  // Risk scoring
  gravity: integer('gravity'),          // 1–4
  probability: integer('probability'),  // 1–4
  criticality: integer('criticality'), // gravity × probability (computed on insert/update)
  // Opportunity scoring
  priority: integer('priority'),    // 1–4
  importance: integer('importance'), // 1–4
  score: integer('score'),           // priority × importance (computed on insert/update)
  status: roStatusEnum('status').notNull().default('identified'),
  owner: text('owner'), // responsible person name/role
  targetDate: date('target_date'),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('ro_type_idx').on(t.type),
  index('ro_status_idx').on(t.status),
  index('ro_category_idx').on(t.category),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const roActions = pgTable('ro_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roId: uuid('ro_id').notNull(),
  description: text('description').notNull(),
  responsible: text('responsible'),
  targetDate: date('target_date'),
  completedAt: timestamp('completed_at'),
  result: text('result'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('ro_actions_ro_idx').on(t.roId),
  foreignKey({ columns: [t.roId], foreignColumns: [risksOpportunities.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Stakeholders & Écoute Parties Intéressées (FOR-MI-08/09) ────────────────

export const stakeholders = pgTable('stakeholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 30 }).notNull().unique(), // e.g. PI-001
  name: varchar('name', { length: 255 }).notNull(),
  type: stakeholderTypeEnum('type').notNull(),
  needs: text('needs'),       // Besoins & attentes
  influence: integer('influence').notNull().default(1), // 1–4
  interaction: integer('interaction').notNull().default(1), // 1–4
  isPip: boolean('is_pip').notNull().default(false), // influence >= 2 AND interaction >= 2
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('stakeholders_type_idx').on(t.type),
  index('stakeholders_pip_idx').on(t.isPip),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const stakeholderFeedback = pgTable('stakeholder_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  stakeholderId: uuid('stakeholder_id').notNull(),
  channel: feedbackChannelEnum('channel').notNull(),
  date: date('date').notNull(),
  summary: text('summary').notNull(),
  satisfactionScore: integer('satisfaction_score'), // 1–5 optional
  responseActions: text('response_actions'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('stakeholder_feedback_sh_idx').on(t.stakeholderId),
  foreignKey({ columns: [t.stakeholderId], foreignColumns: [stakeholders.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const staffSuggestions = pgTable('staff_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  suggestionText: text('suggestion_text').notNull(),
  responseText: text('response_text'),
  respondedAt: timestamp('responded_at'),
  respondedBy: uuid('responded_by'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('staff_suggestions_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.respondedBy], foreignColumns: [users.id] }),
])

// ─── Regulatory Watch (LIS-MI-07) ────────────────────────────────────────────

export const regulatoryWatch = pgTable('regulatory_watch', {
  id: uuid('id').primaryKey().defaultRandom(),
  reference: varchar('reference', { length: 50 }),
  title: varchar('title', { length: 500 }).notNull(),
  domain: varchar('domain', { length: 100 }), // e.g. "Environnement", "Sécurité"
  issuingBody: varchar('issuing_body', { length: 255 }), // organisme émetteur
  publicationDate: date('publication_date'),
  effectiveDate: date('effective_date'),
  status: regulatoryStatusEnum('status').notNull().default('applicable'),
  complianceNotes: text('compliance_notes'),
  nextReviewDate: date('next_review_date'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('regulatory_watch_status_idx').on(t.status),
  index('regulatory_watch_domain_idx').on(t.domain),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Waste Tracking (FOR-MI-11) ───────────────────────────────────────────────

export const wasteRecords = pgTable('waste_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(),   // 1–12
  year: integer('year').notNull(),
  wasteType: wasteTypeEnum('waste_type').notNull(),
  quantityKg: real('quantity_kg'),
  disposal: wasteDisposalEnum('disposal').notNull(),
  contractor: varchar('contractor', { length: 255 }), // prestataire
  cost: decimal('cost', { precision: 10, scale: 3 }),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('waste_records_year_month_idx').on(t.year, t.month),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── HSE Checklist (FOR-MI-12) ───────────────────────────────────────────────

export const hseChecklistItems = pgTable('hse_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(), // e.g. HSE-01
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }), // e.g. "Énergie", "Tri sélectif"
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const hseChecklistSubmissions = pgTable('hse_checklist_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  submittedDate: date('submitted_date').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  overallStatus: hseSubmissionStatusEnum('overall_status').notNull(),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('hse_submissions_date_idx').on(t.submittedDate),
  index('hse_submissions_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const hseChecklistAnswers = pgTable('hse_checklist_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').notNull(),
  itemId: uuid('item_id').notNull(),
  isCompliant: boolean('is_compliant'),
  comment: text('comment'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('hse_answers_submission_idx').on(t.submissionId),
  foreignKey({ columns: [t.submissionId], foreignColumns: [hseChecklistSubmissions.id] }),
  foreignKey({ columns: [t.itemId], foreignColumns: [hseChecklistItems.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Annual Management Plan (PLA-MI-01) ───────────────────────────────────────

export const managementPlanActivities = pgTable('management_plan_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  dept: ncDeptEnum('dept').notNull(),
  objective: text('objective').notNull(),
  action: text('action').notNull(),
  responsible: varchar('responsible', { length: 255 }),
  // Planned weeks (week numbers 1–52 stored as int array via jsonb)
  plannedWeeks: jsonb('planned_weeks'), // number[]
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('mgmt_plan_year_idx').on(t.year),
  index('mgmt_plan_dept_idx').on(t.dept),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

export const managementPlanExecutions = pgTable('management_plan_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull(),
  week: integer('week').notNull(),   // ISO week number 1–52
  year: integer('year').notNull(),
  status: planActivityStatusEnum('status').notNull().default('planifie'),
  notes: text('notes'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('mgmt_exec_activity_idx').on(t.activityId),
  index('mgmt_exec_year_week_idx').on(t.year, t.week),
  foreignKey({ columns: [t.activityId], foreignColumns: [managementPlanActivities.id] }),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
])

// ─── Communication Plan (PLA-MI-02) ───────────────────────────────────────────

export const communicationPlan = pgTable('communication_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  direction: communicationDirectionEnum('direction').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  target: varchar('target', { length: 255 }), // cible
  channel: varchar('channel', { length: 255 }), // moyen
  frequency: varchar('frequency', { length: 100 }), // fréquence
  responsible: varchar('responsible', { length: 255 }),
  plannedDate: date('planned_date'),
  doneAt: timestamp('done_at'),
  doneBy: uuid('done_by'),
  deletedAt: timestamp('deleted_at'),
  ...timestamps,
  createdBy: uuid('created_by').notNull(),
}, (t) => [
  index('comm_plan_year_idx').on(t.year),
  index('comm_plan_direction_idx').on(t.direction),
  foreignKey({ columns: [t.createdBy], foreignColumns: [users.id] }),
  foreignKey({ columns: [t.doneBy], foreignColumns: [users.id] }),
])
```

- [ ] **Step 3: Run push migration**

```bash
npx drizzle-kit push
```

Expected: `[✓] Changes applied` with lines for each new table. If there is an enum conflict, the command will list it — fix by renaming or reordering.

- [ ] **Step 4: Verify tables exist**

```bash
npx drizzle-kit studio
```

Open `http://localhost:4983` and confirm all 12 new tables appear in the left sidebar.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts
git commit -m "feat(smq): add schema for all SMQ integration modules (R&O, stakeholders, regulatory watch, waste, HSE, management plan, comms plan)"
```

---

### Task 2: Risks & Opportunities Module (FOR-MI-07)

**Files:**
- Create: `src/lib/db/risks-opportunities.ts`
- Create: `src/lib/actions/risks-opportunities.ts`
- Create: `src/app/admin/(dashboard)/risks-opportunities/page.tsx`
- Create: `src/app/admin/(dashboard)/risks-opportunities/new/page.tsx`
- Create: `src/app/admin/(dashboard)/risks-opportunities/[id]/page.tsx`
- Create: `src/app/admin/(dashboard)/risks-opportunities/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `risksOpportunities`, `roActions` tables from Task 1; `users` table FK
- Produces: `/admin/risks-opportunities` list, detail, create, edit pages

- [ ] **Step 1: Write DB query functions** — create `src/lib/db/risks-opportunities.ts`:

```typescript
import { db } from '@/lib/db'
import { risksOpportunities, roActions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type RiskOpportunity = typeof risksOpportunities.$inferSelect
export type RoAction = typeof roActions.$inferSelect

export async function getRisksOpportunities(filters?: {
  type?: 'risk' | 'opportunity'
  status?: string
}) {
  return db
    .select({
      ro: risksOpportunities,
      creatorName: users.name,
    })
    .from(risksOpportunities)
    .leftJoin(users, eq(risksOpportunities.createdBy, users.id))
    .where(
      and(
        isNull(risksOpportunities.deletedAt),
        filters?.type ? eq(risksOpportunities.type, filters.type) : undefined,
        filters?.status ? eq(risksOpportunities.status, filters.status as any) : undefined,
      )
    )
    .orderBy(desc(risksOpportunities.createdAt))
}

export async function getRiskOpportunityById(id: string) {
  const [ro] = await db
    .select()
    .from(risksOpportunities)
    .where(and(eq(risksOpportunities.id, id), isNull(risksOpportunities.deletedAt)))
  if (!ro) return null
  const actions = await db
    .select()
    .from(roActions)
    .where(eq(roActions.roId, id))
    .orderBy(roActions.createdAt)
  return { ro, actions }
}

export async function getNextRoReference(type: 'risk' | 'opportunity') {
  const prefix = type === 'risk' ? 'R' : 'O'
  const year = new Date().getFullYear()
  const [{ total }] = await db
    .select({ total: count() })
    .from(risksOpportunities)
    .where(eq(risksOpportunities.type, type))
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `${prefix}-${year}-${seq}`
}
```

- [ ] **Step 2: Write server actions** — create `src/lib/actions/risks-opportunities.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { risksOpportunities, roActions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextRoReference } from '@/lib/db/risks-opportunities'

export async function createRiskOpportunity(data: {
  type: 'risk' | 'opportunity'
  category: string
  description: string
  context?: string
  gravity?: number
  probability?: number
  priority?: number
  importance?: number
  owner?: string
  targetDate?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const reference = await getNextRoReference(data.type)
  const criticality =
    data.gravity && data.probability ? data.gravity * data.probability : null
  const score =
    data.priority && data.importance ? data.priority * data.importance : null

  await db.insert(risksOpportunities).values({
    reference,
    type: data.type as any,
    category: data.category as any,
    description: data.description,
    context: data.context,
    gravity: data.gravity,
    probability: data.probability,
    criticality,
    priority: data.priority,
    importance: data.importance,
    score,
    owner: data.owner,
    targetDate: data.targetDate,
    notes: data.notes,
    createdBy: session.user.id,
  })

  revalidatePath('/admin/risks-opportunities')
  return { success: true }
}

export async function updateRiskOpportunity(
  id: string,
  data: Partial<{
    description: string
    context: string
    gravity: number
    probability: number
    priority: number
    importance: number
    status: string
    owner: string
    targetDate: string
    notes: string
  }>
) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const updates: Record<string, unknown> = { ...data }
  if (data.gravity && data.probability) {
    updates.criticality = data.gravity * data.probability
  }
  if (data.priority && data.importance) {
    updates.score = data.priority * data.importance
  }
  updates.updatedAt = new Date()

  await db.update(risksOpportunities).set(updates as any).where(eq(risksOpportunities.id, id))
  revalidatePath('/admin/risks-opportunities')
  revalidatePath(`/admin/risks-opportunities/${id}`)
  return { success: true }
}

export async function deleteRiskOpportunity(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db
    .update(risksOpportunities)
    .set({ deletedAt: new Date() })
    .where(eq(risksOpportunities.id, id))
  revalidatePath('/admin/risks-opportunities')
  return { success: true }
}

export async function addRoAction(data: {
  roId: string
  description: string
  responsible?: string
  targetDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(roActions).values({
    roId: data.roId,
    description: data.description,
    responsible: data.responsible,
    targetDate: data.targetDate,
    createdBy: session.user.id,
  })
  revalidatePath(`/admin/risks-opportunities/${data.roId}`)
  return { success: true }
}
```

- [ ] **Step 3: Write list page** — create `src/app/admin/(dashboard)/risks-opportunities/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRisksOpportunities } from '@/lib/db/risks-opportunities'
import Link from 'next/link'

export default async function RisksOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const type = params.type as 'risk' | 'opportunity' | undefined
  const status = params.status as string | undefined

  const rows = await getRisksOpportunities({ type, status })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Risques & Opportunités</h1>
        <Link
          href="/admin/risks-opportunities/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouveau
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Risques', value: 'risk' },
          { label: 'Opportunités', value: 'opportunity' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `?type=${value}` : '/admin/risks-opportunities'}
            className={`px-3 py-1 rounded-full text-sm border ${
              type === value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Réf.</th>
              <th className="text-left p-3 border">Type</th>
              <th className="text-left p-3 border">Catégorie</th>
              <th className="text-left p-3 border">Description</th>
              <th className="text-left p-3 border">Score</th>
              <th className="text-left p-3 border">Statut</th>
              <th className="text-left p-3 border">Responsable</th>
              <th className="text-left p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ro, creatorName }) => {
              const score = ro.type === 'risk' ? ro.criticality : ro.score
              const scoreColor =
                score && score >= 12
                  ? 'text-red-600 font-bold'
                  : score && score >= 6
                  ? 'text-orange-500'
                  : 'text-green-600'
              return (
                <tr key={ro.id} className="hover:bg-gray-50 border-b">
                  <td className="p-3 border font-mono">{ro.reference}</td>
                  <td className="p-3 border">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        ro.type === 'risk'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {ro.type === 'risk' ? 'Risque' : 'Opportunité'}
                    </span>
                  </td>
                  <td className="p-3 border">{ro.category}</td>
                  <td className="p-3 border max-w-xs truncate">{ro.description}</td>
                  <td className={`p-3 border ${scoreColor}`}>{score ?? '—'}</td>
                  <td className="p-3 border">{ro.status}</td>
                  <td className="p-3 border">{ro.owner ?? '—'}</td>
                  <td className="p-3 border">
                    <Link
                      href={`/admin/risks-opportunities/${ro.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  Aucun enregistrement
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify page loads** — start dev server (`npm run dev`) and navigate to `http://localhost:3000/admin/risks-opportunities`. Expect an empty table with a "+ Nouveau" button.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/risks-opportunities.ts src/lib/actions/risks-opportunities.ts src/app/admin/(dashboard)/risks-opportunities/
git commit -m "feat(smq): add Risks & Opportunities module (FOR-MI-07)"
```

---

### Task 3: Stakeholders & Écoute PI Module (FOR-MI-08/09)

**Files:**
- Create: `src/lib/db/stakeholders.ts`
- Create: `src/lib/actions/stakeholders.ts`
- Create: `src/app/admin/(dashboard)/stakeholders/page.tsx`
- Create: `src/app/admin/(dashboard)/stakeholders/new/page.tsx`
- Create: `src/app/admin/(dashboard)/stakeholders/[id]/page.tsx`

**Interfaces:**
- Consumes: `stakeholders`, `stakeholderFeedback`, `staffSuggestions` from Task 1
- Produces: `/admin/stakeholders` list and detail pages with feedback log

- [ ] **Step 1: Write DB query functions** — create `src/lib/db/stakeholders.ts`:

```typescript
import { db } from '@/lib/db'
import { stakeholders, stakeholderFeedback, staffSuggestions, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export type Stakeholder = typeof stakeholders.$inferSelect
export type StakeholderFeedback = typeof stakeholderFeedback.$inferSelect
export type StaffSuggestion = typeof staffSuggestions.$inferSelect

export async function getStakeholders() {
  return db
    .select({ sh: stakeholders, creatorName: users.name })
    .from(stakeholders)
    .leftJoin(users, eq(stakeholders.createdBy, users.id))
    .where(isNull(stakeholders.deletedAt))
    .orderBy(stakeholders.name)
}

export async function getStakeholderById(id: string) {
  const [sh] = await db
    .select()
    .from(stakeholders)
    .where(and(eq(stakeholders.id, id), isNull(stakeholders.deletedAt)))
  if (!sh) return null
  const feedback = await db
    .select()
    .from(stakeholderFeedback)
    .where(eq(stakeholderFeedback.stakeholderId, id))
    .orderBy(desc(stakeholderFeedback.date))
  return { sh, feedback }
}

export async function getStaffSuggestions() {
  return db
    .select({ s: staffSuggestions, creatorName: users.name })
    .from(staffSuggestions)
    .leftJoin(users, eq(staffSuggestions.createdBy, users.id))
    .orderBy(desc(staffSuggestions.date))
}

export async function getNextStakeholderReference() {
  const [{ total }] = await db.select({ total: count() }).from(stakeholders)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `PI-${seq}`
}
```

- [ ] **Step 2: Write server actions** — create `src/lib/actions/stakeholders.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { stakeholders, stakeholderFeedback, staffSuggestions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getNextStakeholderReference } from '@/lib/db/stakeholders'

export async function createStakeholder(data: {
  name: string
  type: string
  needs?: string
  influence: number
  interaction: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  const reference = await getNextStakeholderReference()
  const isPip = data.influence >= 2 && data.interaction >= 2
  await db.insert(stakeholders).values({
    reference,
    name: data.name,
    type: data.type as any,
    needs: data.needs,
    influence: data.influence,
    interaction: data.interaction,
    isPip,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    notes: data.notes,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/stakeholders')
  return { success: true }
}

export async function addStakeholderFeedback(data: {
  stakeholderId: string
  channel: string
  date: string
  summary: string
  satisfactionScore?: number
  responseActions?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(stakeholderFeedback).values({
    stakeholderId: data.stakeholderId,
    channel: data.channel as any,
    date: data.date,
    summary: data.summary,
    satisfactionScore: data.satisfactionScore,
    responseActions: data.responseActions,
    createdBy: session.user.id,
  })
  revalidatePath(`/admin/stakeholders/${data.stakeholderId}`)
  return { success: true }
}

export async function addStaffSuggestion(data: {
  date: string
  dept: string
  suggestionText: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(staffSuggestions).values({
    date: data.date,
    dept: data.dept as any,
    suggestionText: data.suggestionText,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/stakeholders')
  return { success: true }
}
```

- [ ] **Step 3: Write list page** — create `src/app/admin/(dashboard)/stakeholders/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStakeholders, getStaffSuggestions } from '@/lib/db/stakeholders'
import Link from 'next/link'

export default async function StakeholdersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [stakeholders, suggestions] = await Promise.all([
    getStakeholders(),
    getStaffSuggestions(),
  ])

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parties Intéressées & Écoute PI</h1>
        <Link
          href="/admin/stakeholders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouvelle PI
        </Link>
      </div>

      {/* PIP badge summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total PI</p>
          <p className="text-3xl font-bold">{stakeholders.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">PIP (forte influence)</p>
          <p className="text-3xl font-bold text-orange-600">
            {stakeholders.filter(({ sh }) => sh.isPip).length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Suggestions du personnel</p>
          <p className="text-3xl font-bold">{suggestions.length}</p>
        </div>
      </div>

      {/* Stakeholder table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Réf.</th>
              <th className="text-left p-3 border">Nom</th>
              <th className="text-left p-3 border">Type</th>
              <th className="text-left p-3 border">Besoins / Attentes</th>
              <th className="text-left p-3 border">Influence</th>
              <th className="text-left p-3 border">Interaction</th>
              <th className="text-left p-3 border">PIP</th>
              <th className="text-left p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stakeholders.map(({ sh }) => (
              <tr key={sh.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 border font-mono">{sh.reference}</td>
                <td className="p-3 border font-medium">{sh.name}</td>
                <td className="p-3 border">{sh.type}</td>
                <td className="p-3 border max-w-xs truncate">{sh.needs ?? '—'}</td>
                <td className="p-3 border text-center">{sh.influence}</td>
                <td className="p-3 border text-center">{sh.interaction}</td>
                <td className="p-3 border text-center">
                  {sh.isPip ? (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">PIP</span>
                  ) : '—'}
                </td>
                <td className="p-3 border">
                  <Link href={`/admin/stakeholders/${sh.id}`} className="text-blue-600 hover:underline">
                    Voir
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

- [ ] **Step 4: Verify page loads** at `http://localhost:3000/admin/stakeholders`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/stakeholders.ts src/lib/actions/stakeholders.ts src/app/admin/(dashboard)/stakeholders/
git commit -m "feat(smq): add Stakeholders & Écoute PI module (FOR-MI-08/09)"
```

---

### Task 4: Regulatory Watch Module (LIS-MI-07)

**Files:**
- Create: `src/lib/db/regulatory-watch.ts`
- Create: `src/lib/actions/regulatory-watch.ts`
- Create: `src/app/admin/(dashboard)/regulatory-watch/page.tsx`
- Create: `src/app/admin/(dashboard)/regulatory-watch/new/page.tsx`

**Interfaces:**
- Consumes: `regulatoryWatch` table from Task 1
- Produces: `/admin/regulatory-watch` list page with status filter

- [ ] **Step 1: Write DB query functions** — create `src/lib/db/regulatory-watch.ts`:

```typescript
import { db } from '@/lib/db'
import { regulatoryWatch, users } from '@/db/schema'
import { eq, and, isNull, desc, asc } from 'drizzle-orm'

export type RegulatoryWatchEntry = typeof regulatoryWatch.$inferSelect

export async function getRegulatoryWatchEntries(status?: string) {
  return db
    .select({ entry: regulatoryWatch, creatorName: users.name })
    .from(regulatoryWatch)
    .leftJoin(users, eq(regulatoryWatch.createdBy, users.id))
    .where(
      and(
        isNull(regulatoryWatch.deletedAt),
        status ? eq(regulatoryWatch.status, status as any) : undefined,
      )
    )
    .orderBy(asc(regulatoryWatch.domain), desc(regulatoryWatch.effectiveDate))
}
```

- [ ] **Step 2: Write server action** — create `src/lib/actions/regulatory-watch.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { regulatoryWatch } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

export async function createRegulatoryEntry(data: {
  reference?: string
  title: string
  domain?: string
  issuingBody?: string
  publicationDate?: string
  effectiveDate?: string
  status: string
  complianceNotes?: string
  nextReviewDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(regulatoryWatch).values({
    ...data,
    status: data.status as any,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}

export async function updateRegulatoryEntry(id: string, data: Partial<{
  title: string
  status: string
  complianceNotes: string
  nextReviewDate: string
}>) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.update(regulatoryWatch).set({ ...data as any, updatedAt: new Date() }).where(eq(regulatoryWatch.id, id))
  revalidatePath('/admin/regulatory-watch')
  return { success: true }
}
```

- [ ] **Step 3: Write list page** — create `src/app/admin/(dashboard)/regulatory-watch/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRegulatoryWatchEntries } from '@/lib/db/regulatory-watch'
import Link from 'next/link'

export default async function RegulatoryWatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const status = params.status as string | undefined

  const entries = await getRegulatoryWatchEntries(status)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Veille Réglementaire</h1>
        <Link
          href="/admin/regulatory-watch/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouveau texte
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Applicable', value: 'applicable' },
          { label: 'En veille', value: 'en_veille' },
          { label: 'Non applicable', value: 'non_applicable' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `?status=${value}` : '/admin/regulatory-watch'}
            className={`px-3 py-1 rounded-full text-sm border ${
              status === value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Réf.</th>
              <th className="text-left p-3 border">Titre</th>
              <th className="text-left p-3 border">Domaine</th>
              <th className="text-left p-3 border">Organisme</th>
              <th className="text-left p-3 border">Date effet</th>
              <th className="text-left p-3 border">Statut</th>
              <th className="text-left p-3 border">Prochaine révision</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ entry }) => (
              <tr key={entry.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 border font-mono">{entry.reference ?? '—'}</td>
                <td className="p-3 border">{entry.title}</td>
                <td className="p-3 border">{entry.domain ?? '—'}</td>
                <td className="p-3 border">{entry.issuingBody ?? '—'}</td>
                <td className="p-3 border">{entry.effectiveDate ?? '—'}</td>
                <td className="p-3 border">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    entry.status === 'applicable' ? 'bg-green-100 text-green-700' :
                    entry.status === 'en_veille' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="p-3 border">{entry.nextReviewDate ?? '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Aucun texte réglementaire enregistré
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify** at `http://localhost:3000/admin/regulatory-watch`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/regulatory-watch.ts src/lib/actions/regulatory-watch.ts src/app/admin/(dashboard)/regulatory-watch/
git commit -m "feat(smq): add Regulatory Watch module (LIS-MI-07)"
```

---

### Task 5: Internal Auditors List (LIS-MI-05)

**Files:**
- Modify: `db/schema.ts` — add 4 columns to `users` table
- Create: `src/app/admin/(dashboard)/auditors/page.tsx`
- Create: `src/lib/actions/auditors.ts`

**Interfaces:**
- Consumes: `users` table
- Produces: `/admin/auditors` page listing users with `is_internal_auditor = true`

- [ ] **Step 1: Add columns to users table** — in `db/schema.ts`, find `isActive: boolean('is_active')...` in the `users` table and add the four auditor columns after it:

```typescript
  // Auditor capabilities (LIS-MI-05)
  isInternalAuditor: boolean('is_internal_auditor').notNull().default(false),
  auditorDomain: text('auditor_domain'),           // e.g. "Processus CO / MI"
  auditorQualifiedDate: date('auditor_qualified_date'),
  auditorQualificationProof: varchar('auditor_qualification_proof', { length: 500 }),
```

- [ ] **Step 2: Run push**

```bash
npx drizzle-kit push
```

Expected: 4 new columns added to `users` table.

- [ ] **Step 3: Write server action** — create `src/lib/actions/auditors.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

export async function setAuditorStatus(userId: string, data: {
  isInternalAuditor: boolean
  auditorDomain?: string
  auditorQualifiedDate?: string
  auditorQualificationProof?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.update(users).set({
    isInternalAuditor: data.isInternalAuditor,
    auditorDomain: data.auditorDomain,
    auditorQualifiedDate: data.auditorQualifiedDate,
    auditorQualificationProof: data.auditorQualificationProof,
    updatedAt: new Date(),
  }).where(eq(users.id, userId))
  revalidatePath('/admin/auditors')
  return { success: true }
}
```

- [ ] **Step 4: Write auditors page** — create `src/app/admin/(dashboard)/auditors/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'

export default async function AuditorsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allUsers = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.name)

  const auditors = allUsers.filter((u) => u.isInternalAuditor)
  const nonAuditors = allUsers.filter((u) => !u.isInternalAuditor)

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Liste des Auditeurs Internes (LIS-MI-05)</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Auditeurs qualifiés ({auditors.length})</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Nom</th>
              <th className="text-left p-3 border">Domaine d'audit</th>
              <th className="text-left p-3 border">Date qualification</th>
              <th className="text-left p-3 border">Preuve</th>
            </tr>
          </thead>
          <tbody>
            {auditors.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 border">{u.name}</td>
                <td className="p-3 border">{u.auditorDomain ?? '—'}</td>
                <td className="p-3 border">{u.auditorQualifiedDate ?? '—'}</td>
                <td className="p-3 border">{u.auditorQualificationProof ?? '—'}</td>
              </tr>
            ))}
            {auditors.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  Aucun auditeur qualifié
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Verify** at `http://localhost:3000/admin/auditors`.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts src/lib/actions/auditors.ts src/app/admin/(dashboard)/auditors/
git commit -m "feat(smq): add Internal Auditors list (LIS-MI-05) with user table extension"
```

---

### Task 6: Waste Tracking Module (FOR-MI-11)

**Files:**
- Create: `src/lib/db/waste.ts`
- Create: `src/lib/actions/waste.ts`
- Create: `src/app/admin/(dashboard)/environment/waste/page.tsx`
- Create: `src/app/admin/(dashboard)/environment/waste/new/page.tsx`

**Interfaces:**
- Consumes: `wasteRecords` table from Task 1
- Produces: `/admin/environment/waste` monthly waste tracking page

- [ ] **Step 1: Write DB query** — create `src/lib/db/waste.ts`:

```typescript
import { db } from '@/lib/db'
import { wasteRecords, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export type WasteRecord = typeof wasteRecords.$inferSelect

export async function getWasteRecords(year?: number) {
  return db
    .select({ record: wasteRecords, creatorName: users.name })
    .from(wasteRecords)
    .leftJoin(users, eq(wasteRecords.createdBy, users.id))
    .where(year ? eq(wasteRecords.year, year) : undefined)
    .orderBy(desc(wasteRecords.year), desc(wasteRecords.month))
}
```

- [ ] **Step 2: Write server action** — create `src/lib/actions/waste.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { wasteRecords } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createWasteRecord(data: {
  month: number
  year: number
  wasteType: string
  quantityKg?: number
  disposal: string
  contractor?: string
  cost?: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(wasteRecords).values({
    month: data.month,
    year: data.year,
    wasteType: data.wasteType as any,
    quantityKg: data.quantityKg,
    disposal: data.disposal as any,
    contractor: data.contractor,
    cost: data.cost,
    notes: data.notes,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/environment/waste')
  return { success: true }
}
```

- [ ] **Step 3: Write list page** — create `src/app/admin/(dashboard)/environment/waste/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWasteRecords } from '@/lib/db/waste'
import Link from 'next/link'

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default async function WastePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const year = params.year ? parseInt(params.year as string) : new Date().getFullYear()

  const records = await getWasteRecords(year)

  const totalKg = records.reduce((sum, { record }) => sum + (record.quantityKg ?? 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suivi des Déchets (FOR-MI-11)</h1>
        <Link
          href="/admin/environment/waste/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouveau
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium">Année:</label>
        <div className="flex gap-2">
          {[year - 1, year, year + 1].map((y) => (
            <Link
              key={y}
              href={`?year=${y}`}
              className={`px-3 py-1 rounded border text-sm ${y === year ? 'bg-blue-600 text-white' : 'border-gray-300'}`}
            >
              {y}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-600">
          Total: <strong>{totalKg.toFixed(1)} kg</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Mois</th>
              <th className="text-left p-3 border">Type de déchet</th>
              <th className="text-left p-3 border">Quantité (kg)</th>
              <th className="text-left p-3 border">Mode élimination</th>
              <th className="text-left p-3 border">Prestataire</th>
              <th className="text-left p-3 border">Coût (TND)</th>
            </tr>
          </thead>
          <tbody>
            {records.map(({ record }) => (
              <tr key={record.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 border">{MONTH_NAMES[record.month - 1]}</td>
                <td className="p-3 border">{record.wasteType}</td>
                <td className="p-3 border">{record.quantityKg ?? '—'}</td>
                <td className="p-3 border">{record.disposal}</td>
                <td className="p-3 border">{record.contractor ?? '—'}</td>
                <td className="p-3 border">{record.cost ? Number(record.cost).toFixed(3) : '—'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Aucun enregistrement pour {year}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify** at `http://localhost:3000/admin/environment/waste`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/waste.ts src/lib/actions/waste.ts src/app/admin/(dashboard)/environment/
git commit -m "feat(smq): add Waste Tracking module (FOR-MI-11)"
```

---

### Task 7: HSE Checklist Module (FOR-MI-12)

**Files:**
- Create: `src/lib/db/hse.ts`
- Create: `src/lib/actions/hse.ts`
- Create: `src/app/admin/(dashboard)/environment/hse-checklist/page.tsx`
- Create: `src/app/admin/(dashboard)/environment/hse-checklist/new/page.tsx`

**Interfaces:**
- Consumes: `hseChecklistItems`, `hseChecklistSubmissions`, `hseChecklistAnswers` from Task 1
- Produces: `/admin/environment/hse-checklist` — submission history + new submission form

- [ ] **Step 1: Seed HSE reference items** — create a seed script `db/seed-hse.ts`:

```typescript
import { db } from '@/lib/db'
import { hseChecklistItems } from './schema'

const items = [
  { code: 'HSE-01', description: 'Climatiseur réglé à 23°C maximum', category: 'Énergie' },
  { code: 'HSE-02', description: 'Lumières éteintes en quittant la salle', category: 'Énergie' },
  { code: 'HSE-03', description: 'Ordinateurs en veille ou éteints à la fin de journée', category: 'Énergie' },
  { code: 'HSE-04', description: 'Tri sélectif respecté (papier / plastique / verre)', category: 'Tri sélectif' },
  { code: 'HSE-05', description: 'Déchets chimiques isolés dans le bac dédié', category: 'Tri sélectif' },
  { code: 'HSE-06', description: 'Robinets fermés après utilisation', category: 'Eau' },
  { code: 'HSE-07', description: 'Fuites d\'eau signalées immédiatement', category: 'Eau' },
  { code: 'HSE-08', description: 'Extincteurs accessibles et non obstrués', category: 'Sécurité incendie' },
  { code: 'HSE-09', description: 'Sorties de secours dégagées', category: 'Sécurité incendie' },
  { code: 'HSE-10', description: 'Produits chimiques correctement étiquetés et stockés', category: 'Produits dangereux' },
  { code: 'HSE-11', description: 'EPI disponibles et en bon état', category: 'Sécurité' },
  { code: 'HSE-12', description: 'Zone de travail propre et dégagée', category: 'Ordre & propreté' },
  { code: 'HSE-13', description: 'Câbles et fils rangés (pas de risque de chute)', category: 'Ordre & propreté' },
  { code: 'HSE-14', description: 'Registre des incidents à jour', category: 'Gestion des incidents' },
  { code: 'HSE-15', description: 'Fiche de données de sécurité disponible pour produits chimiques', category: 'Produits dangereux' },
]

async function seed() {
  for (const item of items) {
    await db.insert(hseChecklistItems).values({
      ...item,
      sortOrder: parseInt(item.code.split('-')[1]),
      createdBy: '00000000-0000-0000-0000-000000000000', // system user
    }).onConflictDoNothing()
  }
  console.log('HSE items seeded')
}

seed()
```

Run: `npx tsx db/seed-hse.ts`

Note: replace the system user UUID with the actual admin user UUID from your database.

- [ ] **Step 2: Write DB queries** — create `src/lib/db/hse.ts`:

```typescript
import { db } from '@/lib/db'
import { hseChecklistItems, hseChecklistSubmissions, hseChecklistAnswers, users } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export type HseItem = typeof hseChecklistItems.$inferSelect
export type HseSubmission = typeof hseChecklistSubmissions.$inferSelect

export async function getHseItems() {
  return db
    .select()
    .from(hseChecklistItems)
    .where(eq(hseChecklistItems.isActive, true))
    .orderBy(hseChecklistItems.sortOrder)
}

export async function getHseSubmissions() {
  return db
    .select({ submission: hseChecklistSubmissions, creatorName: users.name })
    .from(hseChecklistSubmissions)
    .leftJoin(users, eq(hseChecklistSubmissions.createdBy, users.id))
    .orderBy(desc(hseChecklistSubmissions.submittedDate))
}

export async function getHseSubmissionWithAnswers(submissionId: string) {
  const [submission] = await db
    .select()
    .from(hseChecklistSubmissions)
    .where(eq(hseChecklistSubmissions.id, submissionId))
  if (!submission) return null
  const answers = await db
    .select({ answer: hseChecklistAnswers, item: hseChecklistItems })
    .from(hseChecklistAnswers)
    .leftJoin(hseChecklistItems, eq(hseChecklistAnswers.itemId, hseChecklistItems.id))
    .where(eq(hseChecklistAnswers.submissionId, submissionId))
  return { submission, answers }
}
```

- [ ] **Step 3: Write server action** — create `src/lib/actions/hse.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { hseChecklistSubmissions, hseChecklistAnswers } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function submitHseChecklist(data: {
  submittedDate: string
  dept: string
  notes?: string
  answers: Array<{ itemId: string; isCompliant: boolean; comment?: string }>
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const nonCompliantCount = data.answers.filter((a) => !a.isCompliant).length
  const overallStatus =
    nonCompliantCount === 0
      ? 'conforme'
      : nonCompliantCount < data.answers.length / 2
      ? 'partiel'
      : 'non_conforme'

  const [submission] = await db
    .insert(hseChecklistSubmissions)
    .values({
      submittedDate: data.submittedDate,
      dept: data.dept as any,
      overallStatus: overallStatus as any,
      notes: data.notes,
      createdBy: session.user.id,
    })
    .returning()

  await db.insert(hseChecklistAnswers).values(
    data.answers.map((a) => ({
      submissionId: submission.id,
      itemId: a.itemId,
      isCompliant: a.isCompliant,
      comment: a.comment,
      createdBy: session.user.id,
    }))
  )

  revalidatePath('/admin/environment/hse-checklist')
  return { success: true }
}
```

- [ ] **Step 4: Write list page** — create `src/app/admin/(dashboard)/environment/hse-checklist/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHseSubmissions } from '@/lib/db/hse'
import Link from 'next/link'

export default async function HseChecklistPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const submissions = await getHseSubmissions()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Checklist HSE (FOR-MI-12)</h1>
        <Link
          href="/admin/environment/hse-checklist/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouvelle soumission
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Date</th>
              <th className="text-left p-3 border">Département</th>
              <th className="text-left p-3 border">Statut global</th>
              <th className="text-left p-3 border">Soumis par</th>
              <th className="text-left p-3 border">Détail</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(({ submission, creatorName }) => (
              <tr key={submission.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 border">{submission.submittedDate}</td>
                <td className="p-3 border">{submission.dept}</td>
                <td className="p-3 border">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    submission.overallStatus === 'conforme' ? 'bg-green-100 text-green-700' :
                    submission.overallStatus === 'partiel' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {submission.overallStatus}
                  </span>
                </td>
                <td className="p-3 border">{creatorName}</td>
                <td className="p-3 border">
                  <Link
                    href={`/admin/environment/hse-checklist/${submission.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  Aucune soumission
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify** at `http://localhost:3000/admin/environment/hse-checklist`.

- [ ] **Step 6: Commit**

```bash
git add db/seed-hse.ts src/lib/db/hse.ts src/lib/actions/hse.ts src/app/admin/(dashboard)/environment/hse-checklist/
git commit -m "feat(smq): add HSE Checklist module (FOR-MI-12) with reference items seed"
```

---

### Task 8: Annual Management Plan + Communication Plan (PLA-MI-01/02)

**Files:**
- Create: `src/lib/db/management-plan.ts`
- Create: `src/lib/actions/management-plan.ts`
- Create: `src/app/admin/(dashboard)/management-plan/page.tsx`
- Create: `src/app/admin/(dashboard)/management-plan/new/page.tsx`

**Interfaces:**
- Consumes: `managementPlanActivities`, `managementPlanExecutions`, `communicationPlan` from Task 1
- Produces: `/admin/management-plan` Gantt-style view with weekly execution tracking

- [ ] **Step 1: Write DB queries** — create `src/lib/db/management-plan.ts`:

```typescript
import { db } from '@/lib/db'
import { managementPlanActivities, managementPlanExecutions, communicationPlan, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export type MgmtActivity = typeof managementPlanActivities.$inferSelect
export type MgmtExecution = typeof managementPlanExecutions.$inferSelect
export type CommPlan = typeof communicationPlan.$inferSelect

export async function getManagementPlanActivities(year: number) {
  return db
    .select({ activity: managementPlanActivities, creatorName: users.name })
    .from(managementPlanActivities)
    .leftJoin(users, eq(managementPlanActivities.createdBy, users.id))
    .where(and(eq(managementPlanActivities.year, year), isNull(managementPlanActivities.deletedAt)))
    .orderBy(managementPlanActivities.dept, managementPlanActivities.sortOrder)
}

export async function getExecutionsForYear(year: number) {
  return db
    .select()
    .from(managementPlanExecutions)
    .where(eq(managementPlanExecutions.year, year))
}

export async function getCommunicationPlan(year: number) {
  return db
    .select({ comm: communicationPlan, creatorName: users.name })
    .from(communicationPlan)
    .leftJoin(users, eq(communicationPlan.createdBy, users.id))
    .where(and(eq(communicationPlan.year, year), isNull(communicationPlan.deletedAt)))
    .orderBy(communicationPlan.direction, communicationPlan.plannedDate)
}
```

- [ ] **Step 2: Write server actions** — create `src/lib/actions/management-plan.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { managementPlanActivities, managementPlanExecutions, communicationPlan } from '@/db/schema'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'

export async function createManagementActivity(data: {
  year: number
  dept: string
  objective: string
  action: string
  responsible?: string
  plannedWeeks?: number[]
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(managementPlanActivities).values({
    year: data.year,
    dept: data.dept as any,
    objective: data.objective,
    action: data.action,
    responsible: data.responsible,
    plannedWeeks: data.plannedWeeks ?? [],
    createdBy: session.user.id,
  })
  revalidatePath('/admin/management-plan')
  return { success: true }
}

export async function upsertExecution(data: {
  activityId: string
  week: number
  year: number
  status: string
  notes?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const existing = await db
    .select()
    .from(managementPlanExecutions)
    .where(
      and(
        eq(managementPlanExecutions.activityId, data.activityId),
        eq(managementPlanExecutions.week, data.week),
        eq(managementPlanExecutions.year, data.year),
      )
    )

  if (existing.length > 0) {
    await db
      .update(managementPlanExecutions)
      .set({ status: data.status as any, notes: data.notes, updatedAt: new Date() })
      .where(eq(managementPlanExecutions.id, existing[0].id))
  } else {
    await db.insert(managementPlanExecutions).values({
      activityId: data.activityId,
      week: data.week,
      year: data.year,
      status: data.status as any,
      notes: data.notes,
      createdBy: session.user.id,
    })
  }
  revalidatePath('/admin/management-plan')
  return { success: true }
}

export async function createCommunicationEntry(data: {
  year: number
  direction: string
  subject: string
  target?: string
  channel?: string
  frequency?: string
  responsible?: string
  plannedDate?: string
}) {
  const session = await auth()
  if (!session) return { success: false, error: 'Unauthorized' }
  await db.insert(communicationPlan).values({
    ...data,
    direction: data.direction as any,
    createdBy: session.user.id,
  })
  revalidatePath('/admin/management-plan')
  return { success: true }
}
```

- [ ] **Step 3: Write plan page** — create `src/app/admin/(dashboard)/management-plan/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getManagementPlanActivities,
  getExecutionsForYear,
  getCommunicationPlan,
} from '@/lib/db/management-plan'
import Link from 'next/link'

export default async function ManagementPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const year = params.year ? parseInt(params.year as string) : new Date().getFullYear()

  const [activities, executions, commEntries] = await Promise.all([
    getManagementPlanActivities(year),
    getExecutionsForYear(year),
    getCommunicationPlan(year),
  ])

  // Build execution lookup: activityId-week → status
  const execMap: Record<string, string> = {}
  for (const exec of executions) {
    execMap[`${exec.activityId}-${exec.week}`] = exec.status
  }

  const STATUS_COLORS: Record<string, string> = {
    planifie: 'bg-gray-200',
    realise_dans_delai: 'bg-green-400',
    realise_avec_retard: 'bg-orange-400',
    non_realise: 'bg-red-400',
    cloture: 'bg-blue-400',
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plan de Management Annuel (PLA-MI-01)</h1>
        <Link
          href="/admin/management-plan/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouvelle activité
        </Link>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {[year - 1, year, year + 1].map((y) => (
          <Link
            key={y}
            href={`?year=${y}`}
            className={`px-3 py-1 rounded border text-sm ${y === year ? 'bg-blue-600 text-white' : 'border-gray-300'}`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Gantt-style table — weeks 1–52 */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: '2000px' }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 border min-w-[200px]">Objectif / Action</th>
              <th className="text-left p-2 border min-w-[100px]">Dept</th>
              <th className="text-left p-2 border min-w-[100px]">Responsable</th>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <th key={w} className="p-1 border w-7 text-center">{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map(({ activity }) => {
              const planned = (activity.plannedWeeks as number[]) ?? []
              return (
                <tr key={activity.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">
                    <div className="font-medium">{activity.objective}</div>
                    <div className="text-gray-500">{activity.action}</div>
                  </td>
                  <td className="p-2 border">{activity.dept}</td>
                  <td className="p-2 border">{activity.responsible ?? '—'}</td>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => {
                    const isPlanned = planned.includes(w)
                    const execStatus = execMap[`${activity.id}-${w}`]
                    const colorClass = execStatus
                      ? STATUS_COLORS[execStatus]
                      : isPlanned
                      ? 'bg-blue-100'
                      : ''
                    return (
                      <td key={w} className={`p-1 border ${colorClass}`} />
                    )
                  })}
                </tr>
              )
            })}
            {activities.length === 0 && (
              <tr>
                <td colSpan={55} className="p-4 text-center text-gray-400">
                  Aucune activité pour {year}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Communication plan */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Plan de Communication (PLA-MI-02)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border">Direction</th>
              <th className="text-left p-3 border">Sujet</th>
              <th className="text-left p-3 border">Cible</th>
              <th className="text-left p-3 border">Moyen</th>
              <th className="text-left p-3 border">Fréquence</th>
              <th className="text-left p-3 border">Responsable</th>
              <th className="text-left p-3 border">Date prévue</th>
            </tr>
          </thead>
          <tbody>
            {commEntries.map(({ comm }) => (
              <tr key={comm.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 border">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    comm.direction === 'interne' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {comm.direction}
                  </span>
                </td>
                <td className="p-3 border">{comm.subject}</td>
                <td className="p-3 border">{comm.target ?? '—'}</td>
                <td className="p-3 border">{comm.channel ?? '—'}</td>
                <td className="p-3 border">{comm.frequency ?? '—'}</td>
                <td className="p-3 border">{comm.responsible ?? '—'}</td>
                <td className="p-3 border">{comm.plannedDate ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verify** at `http://localhost:3000/admin/management-plan`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/management-plan.ts src/lib/actions/management-plan.ts src/app/admin/(dashboard)/management-plan/
git commit -m "feat(smq): add Annual Management Plan + Communication Plan module (PLA-MI-01/02)"
```

---

### Task 9: KPI Live Dashboard — SMI Tab (FOR-MI-10)

**Files:**
- Modify: `src/app/admin/(dashboard)/dashboard/page.tsx` (or whichever file renders the main dashboard) — add an "SMI" tab
- Create: `src/lib/db/kpi-dashboard.ts`

**Interfaces:**
- Consumes: existing tables — `non_conformances`, `corrective_actions`, `audit_programs`, `risks_opportunities` — NO new tables
- Produces: live KPI cards auto-computed from DB for the current year

- [ ] **Step 1: Locate dashboard page** — run a search to confirm the dashboard file path:

```bash
find src/app/admin -name "page.tsx" | head -20
```

Then read the file to understand the tab/section structure before editing.

- [ ] **Step 2: Write KPI query** — create `src/lib/db/kpi-dashboard.ts`:

```typescript
import { db } from '@/lib/db'
import {
  nonConformances,
  correctiveActions,
  auditPrograms,
  risksOpportunities,
  wasteRecords,
  hseChecklistSubmissions,
} from '@/db/schema'
import { eq, and, count, isNull, gte, lte, sql } from 'drizzle-orm'

export async function getSmqKpis(year: number) {
  const yearStart = new Date(`${year}-01-01`)
  const yearEnd = new Date(`${year}-12-31`)

  const [
    [ncTotal],
    [ncOpen],
    [ncClosed],
    [capaTotal],
    [capaEffective],
    [auditTotal],
    [auditDone],
    [risksHigh],
    [wasteKg],
    [hseConformes],
    [hseTotal],
  ] = await Promise.all([
    db.select({ total: count() }).from(nonConformances)
      .where(and(
        gte(nonConformances.createdAt, yearStart),
        lte(nonConformances.createdAt, yearEnd),
        isNull(nonConformances.deletedAt),
      )),
    db.select({ total: count() }).from(nonConformances)
      .where(and(
        gte(nonConformances.createdAt, yearStart),
        lte(nonConformances.createdAt, yearEnd),
        isNull(nonConformances.deletedAt),
        eq(nonConformances.status, 'open'),
      )),
    db.select({ total: count() }).from(nonConformances)
      .where(and(
        gte(nonConformances.createdAt, yearStart),
        lte(nonConformances.createdAt, yearEnd),
        isNull(nonConformances.deletedAt),
        eq(nonConformances.status, 'closed'),
      )),
    db.select({ total: count() }).from(correctiveActions)
      .where(and(
        gte(correctiveActions.createdAt, yearStart),
        lte(correctiveActions.createdAt, yearEnd),
      )),
    db.select({ total: count() }).from(correctiveActions)
      .where(and(
        gte(correctiveActions.createdAt, yearStart),
        lte(correctiveActions.createdAt, yearEnd),
        eq(correctiveActions.status, 'closed'),
      )),
    db.select({ total: count() }).from(auditPrograms)
      .where(eq(auditPrograms.year, year)),
    db.select({ total: count() }).from(auditPrograms)
      .where(and(eq(auditPrograms.year, year), eq(auditPrograms.status, 'realise'))),
    db.select({ total: count() }).from(risksOpportunities)
      .where(and(
        isNull(risksOpportunities.deletedAt),
        eq(risksOpportunities.type, 'risk'),
        gte(risksOpportunities.criticality, 12),
      )),
    db.select({ total: sql<number>`coalesce(sum(quantity_kg), 0)` }).from(wasteRecords)
      .where(eq(wasteRecords.year, year)),
    db.select({ total: count() }).from(hseChecklistSubmissions)
      .where(and(
        gte(hseChecklistSubmissions.submittedDate, yearStart.toISOString().split('T')[0]),
        lte(hseChecklistSubmissions.submittedDate, yearEnd.toISOString().split('T')[0]),
        eq(hseChecklistSubmissions.overallStatus, 'conforme'),
      )),
    db.select({ total: count() }).from(hseChecklistSubmissions)
      .where(and(
        gte(hseChecklistSubmissions.submittedDate, yearStart.toISOString().split('T')[0]),
        lte(hseChecklistSubmissions.submittedDate, yearEnd.toISOString().split('T')[0]),
      )),
  ])

  const auditRate = auditTotal.total > 0
    ? Math.round((Number(auditDone.total) / Number(auditTotal.total)) * 100)
    : 0

  const capaRate = capaTotal.total > 0
    ? Math.round((Number(capaEffective.total) / Number(capaTotal.total)) * 100)
    : 0

  const hseRate = hseTotal.total > 0
    ? Math.round((Number(hseConformes.total) / Number(hseTotal.total)) * 100)
    : 0

  return {
    ncTotal: Number(ncTotal.total),
    ncOpen: Number(ncOpen.total),
    ncClosed: Number(ncClosed.total),
    capaRate,
    auditRate,
    risksHigh: Number(risksHigh.total),
    wasteKg: Number(wasteKg.total),
    hseRate,
  }
}
```

- [ ] **Step 3: Add SMI tab to dashboard** — after reading the actual dashboard file, add the SMI tab section. The tab should render a grid of KPI cards using the result of `getSmqKpis(year)`:

```typescript
// Inside the dashboard page component, add this section for the SMI tab:

const smqKpis = await getSmqKpis(currentYear)

// KPI card grid to render:
const kpiCards = [
  {
    label: 'NC ouvertes',
    value: smqKpis.ncOpen,
    subtext: `${smqKpis.ncTotal} total cette année`,
    color: smqKpis.ncOpen > 5 ? 'text-red-600' : 'text-green-600',
  },
  {
    label: 'Taux clôture NC',
    value: `${smqKpis.ncTotal > 0 ? Math.round((smqKpis.ncClosed / smqKpis.ncTotal) * 100) : 0}%`,
    subtext: `${smqKpis.ncClosed} / ${smqKpis.ncTotal}`,
    color: 'text-blue-600',
  },
  {
    label: 'Efficacité CAPA',
    value: `${smqKpis.capaRate}%`,
    subtext: 'Actions correctives clôturées',
    color: smqKpis.capaRate >= 80 ? 'text-green-600' : 'text-orange-500',
  },
  {
    label: 'Taux réalisation audits',
    value: `${smqKpis.auditRate}%`,
    subtext: 'Audits planifiés vs réalisés',
    color: smqKpis.auditRate >= 80 ? 'text-green-600' : 'text-orange-500',
  },
  {
    label: 'Risques critiques (≥12)',
    value: smqKpis.risksHigh,
    subtext: 'Risques avec criticité élevée',
    color: smqKpis.risksHigh > 0 ? 'text-red-600' : 'text-green-600',
  },
  {
    label: 'Déchets cette année',
    value: `${smqKpis.wasteKg.toFixed(0)} kg`,
    subtext: 'Total déchets tracés',
    color: 'text-gray-700',
  },
  {
    label: 'Conformité HSE',
    value: `${smqKpis.hseRate}%`,
    subtext: 'Soumissions conformes',
    color: smqKpis.hseRate >= 90 ? 'text-green-600' : 'text-orange-500',
  },
]
```

Render each card as a bordered div with label, value, and subtext.

- [ ] **Step 4: Verify** the SMI tab appears on the dashboard with live data from the DB.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/kpi-dashboard.ts src/app/admin/(dashboard)/dashboard/
git commit -m "feat(smq): add SMI KPI live dashboard tab (FOR-MI-10)"
```

---

### Task 10: DMS Registration — Seed Controlled Documents

**Files:**
- Create: `db/seed-dms-smq.ts`

**Interfaces:**
- Consumes: `dms_documents` table (already exists)
- Produces: all PRC/INS/PRS/ORG/LIS/PLA documents registered in DMS with correct metadata

- [ ] **Step 1: Identify admin user UUID** from database:

```bash
npx tsx -e "import { db } from './src/lib/db'; import { users } from './db/schema'; db.select().from(users).then(r => console.log(r.map(u => u.id + ' ' + u.email))).catch(console.error)"
```

Note the UUID for the admin/quality manager account.

- [ ] **Step 2: Write seed script** — create `db/seed-dms-smq.ts`:

```typescript
import { db } from '@/lib/db'
import { dmsDocuments } from './schema'  // adjust import if dmsDocuments is named differently

const ADMIN_USER_ID = 'REPLACE_WITH_REAL_UUID'

const smqDocuments = [
  // Procedures (PRC)
  { code: 'PRC-MI-01', title: 'Procédure de maîtrise des informations documentées', category: 'procedure', dept: 'MI' },
  { code: 'PRC-MI-02', title: 'Procédure de traitement des non-conformités et réclamations', category: 'procedure', dept: 'MI' },
  { code: 'PRC-MI-03', title: 'Procédure d\'audit interne', category: 'procedure', dept: 'MI' },
  { code: 'PRC-MI-04', title: 'Procédure d\'actions correctives et préventives (CAPA)', category: 'procedure', dept: 'MI' },
  // Work instructions (INS)
  { code: 'INS-MI-01', title: 'Instruction de gestion des équipements de mesure', category: 'instruction', dept: 'MI' },
  // Process maps (PRS)
  { code: 'PRS-MI-01', title: 'Cartographie des processus SOPAT', category: 'autre', dept: 'MI' },
  { code: 'PRS-AC-01', title: 'Fiche processus — Achat', category: 'autre', dept: 'AC' },
  { code: 'PRS-CO-01', title: 'Fiche processus — Commercial', category: 'autre', dept: 'CO' },
  { code: 'PRS-ET-01', title: 'Fiche processus — Études', category: 'autre', dept: 'ET' },
  { code: 'PRS-RE-01', title: 'Fiche processus — Réalisation', category: 'autre', dept: 'RE1' },
  { code: 'PRS-MI-02', title: 'Fiche processus — Management', category: 'autre', dept: 'MI' },
  // Plans
  { code: 'PLA-MI-01', title: 'Plan de management annuel', category: 'autre', dept: 'MI' },
  { code: 'PLA-MI-02', title: 'Plan de communication', category: 'autre', dept: 'MI' },
  // Lists
  { code: 'LIS-MI-05', title: 'Liste des auditeurs internes', category: 'enregistrement', dept: 'MI' },
  { code: 'LIS-MI-07', title: 'Registre de veille réglementaire', category: 'enregistrement', dept: 'MI' },
]

async function seed() {
  for (const doc of smqDocuments) {
    await db.insert(dmsDocuments).values({
      documentCode: doc.code,
      title: doc.title,
      category: doc.category as any,
      department: doc.dept,
      version: '01',
      revisionNumber: 0,
      status: 'active',
      effectiveDate: new Date().toISOString().split('T')[0],
      authorId: ADMIN_USER_ID,
      createdBy: ADMIN_USER_ID,
    }).onConflictDoNothing()
  }
  console.log(`Seeded ${smqDocuments.length} SMQ documents into DMS`)
}

seed().catch(console.error)
```

- [ ] **Step 3: Update ADMIN_USER_ID** with the UUID found in Step 1.

- [ ] **Step 4: Run seed**

```bash
npx tsx db/seed-dms-smq.ts
```

Expected: `Seeded 15 SMQ documents into DMS`

- [ ] **Step 5: Verify** in DMS list at `http://localhost:3000/admin/dms` that all 15 documents appear.

- [ ] **Step 6: Commit**

```bash
git add db/seed-dms-smq.ts
git commit -m "feat(smq): seed controlled SMQ documents into DMS (PRC/INS/PRS/PLA/LIS)"
```

---

## Navigation Integration

After all tasks are complete, add links to the sidebar/navigation for each new module. Locate the sidebar nav component:

```bash
find src -name "*.tsx" | xargs grep -l "sidebar\|Sidebar\|nav.*admin" | head -10
```

Add entries for:
- `/admin/risks-opportunities` → "Risques & Opportunités"
- `/admin/stakeholders` → "Parties Intéressées"
- `/admin/regulatory-watch` → "Veille Réglementaire"
- `/admin/auditors` → "Auditeurs Internes"
- `/admin/environment/waste` → "Déchets"
- `/admin/environment/hse-checklist` → "Checklist HSE"
- `/admin/management-plan` → "Plan de Management"

Group these under a new "SMQ / Qualité" section in the sidebar.

```bash
git add src/components/  # or wherever the sidebar lives
git commit -m "feat(smq): add SMQ modules to sidebar navigation"
```
