# Reports Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-wide financial overview tab and a per-project phase-report tab to `/admin/reports`, keeping the six existing report sections unchanged.

**Architecture:** One new server-side aggregation module (`reports-overview.ts`, batched queries, no N+1), two new client tab components, and a minimal extension of the existing custom tab bar in `ReportsClient.tsx`. Year selection is a `?year=` search param — the page is already `force-dynamic`, so the server recomputes.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Neon), recharts, existing admin CSS variables.

**Spec:** `docs/superpowers/specs/2026-07-14-reports-page-redesign-design.md`

## Global Constraints

- Branch `feat/reports-redesign` off `main`.
- No DB migration; read-only aggregation.
- Money-won is THREE separate KPIs, never summed: Contracté (Σ approved_budget), Facturé = Σ facture − Σ avoir / Encaissé = Σ encaissement (client_account_entries, not deleted), Offres gagnées (Σ amount status `gagnee`, + win rate = gagnée/(gagnée+perdue)).
- Dépensé = Σ purchase_orders.total_cost + Σ extra_expenses.amount (status `approved`, deleted_at null).
- Phase spend bucketing: row date ∈ [phase.startedAt, phase.completedAt], upper bound open when completedAt is null; unmatched → "Hors phase".
- The six existing report sections and their queries are untouched.
- French UI, TND via the existing `fmtTnd` pattern, admin CSS variables for all colors.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Data layer — `getPlatformOverview` + `getProjectPhaseReports`

**Files:**
- Create: `src/lib/db/reports-overview.ts`
- Test: `scripts/verify-reports-overview.ts` (temporary; deleted in Task 4)

**Interfaces:**
- Produces (consumed by Tasks 2–3):

```ts
export type PlatformOverview = {
  projects: {
    total: number; active: number; completed: number; cancelled: number
    byStatus: { status: string; count: number }[]
    byType:   { projectType: string; count: number }[]
  }
  money: {
    contracted: number; invoiced: number; collected: number
    offersWon: number; winRatePct: number | null
    spent: number; margin: number | null; marginPct: number | null
  }
  monthlySpend: { month: string; total: number }[]           // 'YYYY-MM', 12 rows for the selected year
  offersByStatus: { status: string; count: number; amount: number }[]
}

export type PhaseReport = {
  phase: 'etudes' | 'realisation' | 'entretien'
  status: string
  startedAt: string | null      // ISO
  completedAt: string | null
  durationDays: number | null   // to date when in progress
  spend: number
  poCount: number
  plantItemCount: number | null       // études only
  predictionTotal: number | null      // études only
  predictionVersion: string | null    // études only
  maintenanceVisitCount: number | null // entretien only
}

export type ProjectPhaseReport = {
  id: string; reference: string; name: string; clientName: string
  status: string; currency: string
  approvedBudget: number | null
  totalSpend: number
  variancePct: number | null
  offPhaseSpend: number
  phases: PhaseReport[]
}

export async function getPlatformOverview(year: number): Promise<PlatformOverview>
export async function getProjectPhaseReports(): Promise<ProjectPhaseReport[]>
```

- [ ] **Step 1: Create `src/lib/db/reports-overview.ts`**

```ts
import { db } from '../../../db/index'
import {
  projects,
  purchaseOrders,
  extraExpenses,
  clientAccountEntries,
  commercialOffers,
  projectPhases,
  plantListItems,
  maintenanceVisits,
  budgetPredictions,
} from '../../../db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

// ─── Vue générale (plateforme) ───────────────────────────────────────────────

export type PlatformOverview = {
  projects: {
    total: number; active: number; completed: number; cancelled: number
    byStatus: { status: string; count: number }[]
    byType:   { projectType: string; count: number }[]
  }
  money: {
    contracted: number; invoiced: number; collected: number
    offersWon: number; winRatePct: number | null
    spent: number; margin: number | null; marginPct: number | null
  }
  monthlySpend: { month: string; total: number }[]
  offersByStatus: { status: string; count: number; amount: number }[]
}

const ACTIVE_STATUSES = new Set(['etudes', 'realisation', 'entretien'])

export async function getPlatformOverview(year: number): Promise<PlatformOverview> {
  const [
    statusRows,
    typeRows,
    contractedRow,
    clientEntryRows,
    offerRows,
    poTotalRow,
    exTotalRow,
    poMonthly,
    exMonthly,
  ] = await Promise.all([
    db.select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects).where(isNull(projects.deletedAt)).groupBy(projects.status),

    db.select({ projectType: projects.projectType, count: sql<number>`count(*)::int` })
      .from(projects).where(isNull(projects.deletedAt)).groupBy(projects.projectType),

    db.select({ total: sql<string>`coalesce(sum(${projects.approvedBudget}::numeric), 0)::text` })
      .from(projects).where(isNull(projects.deletedAt)),

    db.select({
      entryType: clientAccountEntries.entryType,
      total: sql<string>`coalesce(sum(${clientAccountEntries.amount}::numeric), 0)::text`,
    })
      .from(clientAccountEntries)
      .where(isNull(clientAccountEntries.deletedAt))
      .groupBy(clientAccountEntries.entryType),

    db.select({
      status: commercialOffers.status,
      count:  sql<number>`count(*)::int`,
      amount: sql<string>`coalesce(sum(${commercialOffers.amount}::numeric), 0)::text`,
    })
      .from(commercialOffers)
      .where(isNull(commercialOffers.deletedAt))
      .groupBy(commercialOffers.status),

    db.select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
      .from(purchaseOrders),

    db.select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
      .from(extraExpenses)
      .where(and(eq(extraExpenses.status, 'approved'), isNull(extraExpenses.deletedAt))),

    db.select({
      month: sql<string>`to_char(${purchaseOrders.purchaseDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text`,
    })
      .from(purchaseOrders)
      .where(sql`extract(year from ${purchaseOrders.purchaseDate}) = ${year}`)
      .groupBy(sql`to_char(${purchaseOrders.purchaseDate}, 'YYYY-MM')`),

    db.select({
      month: sql<string>`to_char(${extraExpenses.expenseDate}::date, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text`,
    })
      .from(extraExpenses)
      .where(and(
        eq(extraExpenses.status, 'approved'),
        isNull(extraExpenses.deletedAt),
        sql`extract(year from ${extraExpenses.expenseDate}::date) = ${year}`,
      ))
      .groupBy(sql`to_char(${extraExpenses.expenseDate}::date, 'YYYY-MM')`),
  ])

  // Projets
  const byStatus = statusRows.map((r) => ({ status: String(r.status), count: Number(r.count) }))
  const total     = byStatus.reduce((s, r) => s + r.count, 0)
  const active    = byStatus.filter((r) => ACTIVE_STATUSES.has(r.status)).reduce((s, r) => s + r.count, 0)
  const completed = byStatus.find((r) => r.status === 'completed')?.count ?? 0
  const cancelled = byStatus.find((r) => r.status === 'cancelled')?.count ?? 0

  // Argent — trois vues distinctes, jamais additionnées
  const entryMap: Record<string, number> = {}
  for (const r of clientEntryRows) entryMap[String(r.entryType)] = parseFloat(r.total)
  const invoiced  = (entryMap.facture ?? 0) - (entryMap.avoir ?? 0)
  const collected = entryMap.encaissement ?? 0

  const offersByStatus = offerRows.map((r) => ({
    status: String(r.status), count: Number(r.count), amount: parseFloat(r.amount),
  }))
  const won  = offersByStatus.find((r) => r.status === 'gagnee')
  const lost = offersByStatus.find((r) => r.status === 'perdue')
  const decided = (won?.count ?? 0) + (lost?.count ?? 0)
  const winRatePct = decided > 0 ? Math.round(((won?.count ?? 0) / decided) * 100) : null

  const contracted = parseFloat(contractedRow[0]?.total ?? '0')
  const spent = parseFloat(poTotalRow[0]?.total ?? '0') + parseFloat(exTotalRow[0]?.total ?? '0')
  const margin = contracted > 0 ? contracted - spent : null
  const marginPct = contracted > 0 ? Math.round(((contracted - spent) / contracted) * 100) : null

  // Dépenses mensuelles de l'année sélectionnée (12 mois, mois vides à 0)
  const monthMap: Record<string, number> = {}
  for (const r of [...poMonthly, ...exMonthly]) {
    monthMap[r.month] = (monthMap[r.month] ?? 0) + parseFloat(r.total)
  }
  const monthlySpend = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    return { month, total: Math.round((monthMap[month] ?? 0) * 1000) / 1000 }
  })

  return {
    projects: {
      total, active, completed, cancelled,
      byStatus,
      byType: typeRows.map((r) => ({ projectType: String(r.projectType), count: Number(r.count) })),
    },
    money: {
      contracted, invoiced, collected,
      offersWon: won?.amount ?? 0, winRatePct,
      spent, margin, marginPct,
    },
    monthlySpend,
    offersByStatus,
  }
}

// ─── Rapports par projet / par phase ─────────────────────────────────────────

export type PhaseReport = {
  phase: 'etudes' | 'realisation' | 'entretien'
  status: string
  startedAt: string | null
  completedAt: string | null
  durationDays: number | null
  spend: number
  poCount: number
  plantItemCount: number | null
  predictionTotal: number | null
  predictionVersion: string | null
  maintenanceVisitCount: number | null
}

export type ProjectPhaseReport = {
  id: string; reference: string; name: string; clientName: string
  status: string; currency: string
  approvedBudget: number | null
  totalSpend: number
  variancePct: number | null
  offPhaseSpend: number
  phases: PhaseReport[]
}

const PHASE_ORDER: PhaseReport['phase'][] = ['etudes', 'realisation', 'entretien']

type DatedAmount = { projectId: string; date: Date | null; amount: number; isPo: boolean }

export async function getProjectPhaseReports(): Promise<ProjectPhaseReport[]> {
  const [projectRows, phaseRows, poRows, exRows, plantCounts, visitCounts, predictionRows] = await Promise.all([
    db.select({
      id: projects.id, reference: projects.reference, name: projects.name,
      clientName: projects.clientName, status: projects.status,
      currency: projects.currency, approvedBudget: projects.approvedBudget,
    })
      .from(projects).where(isNull(projects.deletedAt)).orderBy(desc(projects.createdAt)),

    db.select({
      projectId: projectPhases.projectId, phase: projectPhases.phase,
      status: projectPhases.status, startedAt: projectPhases.startedAt,
      completedAt: projectPhases.completedAt,
    }).from(projectPhases),

    db.select({
      projectId: purchaseOrders.projectId,
      purchaseDate: purchaseOrders.purchaseDate,
      totalCost: purchaseOrders.totalCost,
    }).from(purchaseOrders),

    db.select({
      projectId: extraExpenses.projectId,
      expenseDate: extraExpenses.expenseDate,
      amount: extraExpenses.amount,
    })
      .from(extraExpenses)
      .where(and(eq(extraExpenses.status, 'approved'), isNull(extraExpenses.deletedAt))),

    db.select({ projectId: plantListItems.projectId, count: sql<number>`count(*)::int` })
      .from(plantListItems).groupBy(plantListItems.projectId),

    db.select({ projectId: maintenanceVisits.projectId, count: sql<number>`count(*)::int` })
      .from(maintenanceVisits).groupBy(maintenanceVisits.projectId),

    // Dernière prédiction acceptée/modifiée par projet (DISTINCT ON)
    db.execute(sql`
      SELECT DISTINCT ON (project_id)
        project_id AS "projectId",
        predicted_total AS "predictedTotal",
        model_version AS "modelVersion"
      FROM budget_predictions
      WHERE status IN ('accepted', 'overridden')
      ORDER BY project_id, created_at DESC
    `),
  ])

  const phasesByProject: Record<string, typeof phaseRows> = {}
  for (const ph of phaseRows) (phasesByProject[ph.projectId] ??= []).push(ph)

  const spendByProject: Record<string, DatedAmount[]> = {}
  for (const po of poRows) {
    (spendByProject[po.projectId] ??= []).push({
      projectId: po.projectId, date: po.purchaseDate,
      amount: parseFloat(po.totalCost), isPo: true,
    })
  }
  for (const ex of exRows) {
    if (!ex.projectId) continue
    (spendByProject[ex.projectId] ??= []).push({
      projectId: ex.projectId, date: ex.expenseDate ? new Date(ex.expenseDate) : null,
      amount: parseFloat(ex.amount), isPo: false,
    })
  }

  const plantCountMap: Record<string, number> = {}
  for (const r of plantCounts) plantCountMap[r.projectId] = Number(r.count)
  const visitCountMap: Record<string, number> = {}
  for (const r of visitCounts) visitCountMap[r.projectId] = Number(r.count)

  const predictionMap: Record<string, { total: number; version: string | null }> = {}
  for (const r of predictionRows.rows as { projectId: string; predictedTotal: string; modelVersion: string | null }[]) {
    predictionMap[r.projectId] = { total: parseFloat(r.predictedTotal), version: r.modelVersion }
  }

  const now = Date.now()

  return projectRows.map((p) => {
    const phases = (phasesByProject[p.id] ?? [])
      .slice()
      .sort((a, b) => PHASE_ORDER.indexOf(a.phase as PhaseReport['phase']) - PHASE_ORDER.indexOf(b.phase as PhaseReport['phase']))

    const spendRows = spendByProject[p.id] ?? []
    const phaseSpend: Record<string, { spend: number; poCount: number }> = {}
    let offPhaseSpend = 0

    for (const row of spendRows) {
      // Attribution par fenêtre de dates : [startedAt, completedAt], borne
      // supérieure ouverte pour la phase en cours. Non attribuable → hors phase.
      let assigned = false
      if (row.date) {
        const t = row.date.getTime()
        for (const ph of phases) {
          if (!ph.startedAt) continue
          const start = ph.startedAt.getTime()
          const end = ph.completedAt ? ph.completedAt.getTime() : Infinity
          if (t >= start && t <= end) {
            const bucket = (phaseSpend[ph.phase] ??= { spend: 0, poCount: 0 })
            bucket.spend += row.amount
            if (row.isPo) bucket.poCount += 1
            assigned = true
            break
          }
        }
      }
      if (!assigned) offPhaseSpend += row.amount
    }

    const totalSpend = spendRows.reduce((s, r) => s + r.amount, 0)
    const approved = p.approvedBudget ? parseFloat(p.approvedBudget) : null
    const variancePct = approved && approved > 0
      ? Math.round(((totalSpend - approved) / approved) * 1000) / 10
      : null

    const phaseReports: PhaseReport[] = PHASE_ORDER.map((phaseName) => {
      const ph = phases.find((x) => x.phase === phaseName)
      const bucket = phaseSpend[phaseName]
      const startedAt = ph?.startedAt ?? null
      const completedAt = ph?.completedAt ?? null
      const durationDays = startedAt
        ? Math.max(0, Math.round(((completedAt ? completedAt.getTime() : now) - startedAt.getTime()) / 86400000))
        : null
      return {
        phase: phaseName,
        status: ph?.status ?? 'pending',
        startedAt: startedAt ? startedAt.toISOString() : null,
        completedAt: completedAt ? completedAt.toISOString() : null,
        durationDays,
        spend: Math.round((bucket?.spend ?? 0) * 1000) / 1000,
        poCount: bucket?.poCount ?? 0,
        plantItemCount:        phaseName === 'etudes' ? (plantCountMap[p.id] ?? 0) : null,
        predictionTotal:       phaseName === 'etudes' ? (predictionMap[p.id]?.total ?? null) : null,
        predictionVersion:     phaseName === 'etudes' ? (predictionMap[p.id]?.version ?? null) : null,
        maintenanceVisitCount: phaseName === 'entretien' ? (visitCountMap[p.id] ?? 0) : null,
      }
    })

    return {
      id: p.id, reference: p.reference, name: p.name, clientName: p.clientName,
      status: p.status, currency: p.currency ?? 'TND',
      approvedBudget: approved,
      totalSpend: Math.round(totalSpend * 1000) / 1000,
      variancePct,
      offPhaseSpend: Math.round(offPhaseSpend * 1000) / 1000,
      phases: phaseReports,
    }
  })
}
```

- [ ] **Step 2: Write the verification script**

Create `scripts/verify-reports-overview.ts`:

```ts
import { getPlatformOverview, getProjectPhaseReports } from '../src/lib/db/reports-overview'

async function main() {
  const year = new Date().getFullYear()
  const overview = await getPlatformOverview(year)
  console.log('── Vue générale ──')
  console.log(JSON.stringify(overview.projects, null, 2))
  console.log(JSON.stringify(overview.money, null, 2))
  console.log('monthlySpend rows:', overview.monthlySpend.length, '(attendu: 12)')
  console.log('offersByStatus:', JSON.stringify(overview.offersByStatus))

  const reports = await getProjectPhaseReports()
  console.log('\n── Par projet ──', reports.length, 'projets')
  const withSpend = reports.find((r) => r.totalSpend > 0) ?? reports[0]
  console.log(JSON.stringify(withSpend, null, 2))

  // Cohérence : somme des dépenses par phase + hors phase = dépense totale du projet
  for (const r of reports) {
    const sum = r.phases.reduce((s, ph) => s + ph.spend, 0) + r.offPhaseSpend
    if (Math.abs(sum - r.totalSpend) > 0.01) {
      console.error(`✗ ${r.reference}: phases+horsphase=${sum} ≠ total=${r.totalSpend}`)
      process.exit(1)
    }
  }
  console.log('✓ Cohérence dépenses par phase vérifiée sur tous les projets.')
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run verification against the dev DB**

Run: `npx tsc --noEmit && npx tsx --env-file=.env scripts/verify-reports-overview.ts`
Expected: 12 monthly rows, coherent money numbers (spot-check totals against `/admin/projects`), and `✓ Cohérence dépenses par phase vérifiée`.

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/reports-redesign
git add src/lib/db/reports-overview.ts scripts/verify-reports-overview.ts
git commit -m "feat: platform overview + per-project phase report queries

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Vue générale tab

**Files:**
- Create: `src/app/admin/(dashboard)/reports/OverviewTab.tsx`
- Modify: `src/app/admin/(dashboard)/reports/page.tsx`
- Modify: `src/app/admin/(dashboard)/reports/ReportsClient.tsx`

**Interfaces:**
- Consumes: `PlatformOverview` from Task 1.
- Produces: `<OverviewTab overview={PlatformOverview} year={number} />` (client component); `ReportsClient` props extended with `overview: PlatformOverview; phaseReports: ProjectPhaseReport[]; year: number` (phaseReports rendered in Task 3 — pass through now so the props change happens once).

- [ ] **Step 1: Create `OverviewTab.tsx`**

```tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts'
import type { PlatformOverview } from '@/lib/db/reports-overview'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtTnd = (n: number) => `${FMT.format(n)} TND`

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', etudes: 'Études', realisation: 'Réalisation',
  entretien: 'Entretien', completed: 'Terminé', cancelled: 'Annulé',
}
const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale', espace_public: 'Espace public',
  siege_social: 'Siège social', hotelier_touristique: 'Hôtelier & touristique',
  residentiel: 'Résidentiel', interieur: 'Intérieur',
}
const OFFER_LABELS: Record<string, string> = {
  en_preparation: 'En préparation', envoyee: 'Envoyée', en_negociation: 'En négociation',
  gagnee: 'Gagnée', perdue: 'Perdue', annulee: 'Annulée',
}
const OFFER_COLORS: Record<string, string> = {
  en_preparation: '#94A3B8', envoyee: '#2563EB', en_negociation: '#D97706',
  gagnee: '#1C7A48', perdue: '#DC2626', annulee: '#64748B',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8', etudes: '#2D5A27', realisation: '#D97706',
  entretien: '#2563EB', completed: '#16A34A', cancelled: '#64748B',
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      {children}
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1" style={{ color: color ?? 'var(--admin-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{sub}</p>}
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function OverviewTab({ overview, year }: { overview: PlatformOverview; year: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const { projects, money, monthlySpend, offersByStatus } = overview

  const currentYear = new Date().getFullYear()
  const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const statusData = projects.byStatus.map((r) => ({
    name: STATUS_LABELS[r.status] ?? r.status, count: r.count, color: STATUS_COLORS[r.status] ?? '#94A3B8',
  }))
  const typeData = projects.byType.map((r) => ({
    name: TYPE_LABELS[r.projectType] ?? r.projectType, count: r.count,
  }))
  const spendData = monthlySpend.map((r, i) => ({ name: MONTH_SHORT[i], total: r.total }))
  const offerData = offersByStatus.map((r) => ({
    name: OFFER_LABELS[r.status] ?? r.status, count: r.count, amount: r.amount,
    color: OFFER_COLORS[r.status] ?? '#94A3B8',
  }))

  return (
    <div className="space-y-5">
      {/* Projets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Projets (total)" value={String(projects.total)} sub="cumul" />
        <Kpi label="Projets actifs" value={String(projects.active)} sub="études · réalisation · entretien" color="var(--admin-amber)" />
        <Kpi label="Projets terminés" value={String(projects.completed)} color="var(--admin-emerald)" />
        <Kpi label="Projets annulés" value={String(projects.cancelled)} color="var(--admin-text-muted)" />
      </div>

      {/* Argent — trois lectures distinctes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Contracté" value={fmtTnd(money.contracted)} sub="Σ budgets approuvés · cumul" />
        <Kpi label="Facturé" value={fmtTnd(money.invoiced)} sub="factures − avoirs · cumul" />
        <Kpi label="Encaissé" value={fmtTnd(money.collected)} sub="encaissements clients · cumul" color="var(--admin-emerald)" />
        <Kpi
          label="Offres gagnées" value={fmtTnd(money.offersWon)}
          sub={money.winRatePct !== null ? `taux de réussite ${money.winRatePct}%` : 'aucune offre décidée'}
        />
        <Kpi label="Dépensé" value={fmtTnd(money.spent)} sub="bons d'achat + extra dépenses · cumul" color="var(--admin-red)" />
        <Kpi
          label="Marge brute"
          value={money.margin !== null ? fmtTnd(money.margin) : '—'}
          sub={money.marginPct !== null ? `${money.marginPct}% du contracté` : 'budget contracté requis'}
          color={money.margin !== null && money.margin < 0 ? 'var(--admin-red)' : 'var(--admin-emerald)'}
        />
      </div>

      {/* Sélecteur d'année (dépenses mensuelles) */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Année des graphiques :</span>
        <Select value={String(year)} onValueChange={(v) => router.push(`${pathname}?year=${v}`)}>
          <SelectTrigger className="text-xs h-8 w-28 bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={`Dépenses mensuelles ${year}`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={spendData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtTnd(Number(v))} />
              <Line type="monotone" dataKey="total" name="Dépenses" stroke="#2D5A27" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Offres commerciales par statut">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={offerData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip formatter={(v, name) => name === 'Montant' ? fmtTnd(Number(v)) : v} />
              <Bar dataKey="count" name="Nombre">
                {offerData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Projets par statut">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip />
              <Bar dataKey="count" name="Projets">
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Projets par type">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} />
              <Tooltip />
              <Bar dataKey="count" name="Projets" fill="#2D5A27" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire `page.tsx`**

Replace the whole file with:

```tsx
import { getBudgetVarianceReport, getNcMonthlyBreakdown, getProjectTimeline, getMlAccuracyReport } from '@/lib/db/reports'
import { getInternationalReport } from '@/lib/db/international'
import { getEquipmentReport } from '@/lib/db/equipment'
import { getPlatformOverview, getProjectPhaseReports } from '@/lib/db/reports-overview'
import { ReportsClient } from './ReportsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapports | SOPAT Admin' }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const parsed = Number(sp.year)
  const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= currentYear + 1 ? parsed : currentYear

  const [budgetVariance, ncMonthly, timeline, mlAccuracy, international, equipment, overview, phaseReports] = await Promise.all([
    getBudgetVarianceReport(),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
    getInternationalReport(),
    getEquipmentReport(),
    getPlatformOverview(year),
    getProjectPhaseReports(),
  ])

  return (
    <ReportsClient
      budgetVariance={budgetVariance}
      ncMonthly={ncMonthly}
      timeline={timeline}
      mlAccuracy={mlAccuracy}
      international={international}
      equipment={equipment}
      overview={overview}
      phaseReports={phaseReports}
      year={year}
    />
  )
}
```

- [ ] **Step 3: Extend `ReportsClient.tsx`**

3a. Add imports at the top (after the existing type imports):

```tsx
import type { PlatformOverview, ProjectPhaseReport } from '@/lib/db/reports-overview'
import { OverviewTab } from './OverviewTab'
```

3b. Extend `Props`:

```tsx
type Props = {
  budgetVariance: BudgetVarianceRow[]
  ncMonthly:      NcMonthlyRow[]
  timeline:       TimelineProject[]
  mlAccuracy:     MlAccuracySummary
  international:  InternationalReportRow[]
  equipment:      EquipmentReportData
  overview:       PlatformOverview
  phaseReports:   ProjectPhaseReport[]
  year:           number
}
```

3c. In the main component: destructure the new props, change the tab state to include the new keys with `'overview'` as default, prepend the two tabs, and render `OverviewTab` (the `perproject` render line is added in Task 3 — for this task render `null` for it):

```tsx
export function ReportsClient({ budgetVariance, ncMonthly, timeline, mlAccuracy, international, equipment, overview, phaseReports, year }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'perproject' | 'budget' | 'nc' | 'timeline' | 'ml' | 'international' | 'equipment'>('overview')
```

```tsx
  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: 'overview',      label: 'Vue générale' },
    { key: 'perproject',    label: 'Par projet' },
    { key: 'budget',        label: 'Variance budgétaire' },
    { key: 'nc',            label: 'Analyse NC' },
    { key: 'timeline',      label: 'Chronologie' },
    { key: 'ml',            label: 'Précision ML' },
    { key: 'international', label: '🌍 Performance internationale' },
    { key: 'equipment',     label: '🏗 Rapport Engins' },
  ]
```

In the tab-content block, add before the `budget` line:

```tsx
      {activeTab === 'overview'      && <OverviewTab overview={overview} year={year} />}
      {activeTab === 'perproject'    && null /* Task 3 */}
```

Also extend the country-filter visibility condition so the filter only shows on the tabs that use it (it filters `budgetVariance` only):

```tsx
          {countries.length > 1 && activeTab === 'budget' && (
```

(Replace the previous `activeTab !== 'international' && activeTab !== 'equipment'` condition — the filter was only consumed by the budget tab.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/reports/OverviewTab.tsx" "src/app/admin/(dashboard)/reports/page.tsx" "src/app/admin/(dashboard)/reports/ReportsClient.tsx"
git commit -m "feat: Vue generale tab on reports page (platform KPIs + charts)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Par projet tab (phase reports)

**Files:**
- Create: `src/app/admin/(dashboard)/reports/ProjectPhaseTab.tsx`
- Modify: `src/app/admin/(dashboard)/reports/ReportsClient.tsx` (one line)

**Interfaces:**
- Consumes: `ProjectPhaseReport`, `PhaseReport` from Task 1.
- Produces: `<ProjectPhaseTab reports={ProjectPhaseReport[]} />` (client component).

- [ ] **Step 1: Create `ProjectPhaseTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProjectPhaseReport, PhaseReport } from '@/lib/db/reports-overview'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtMoney = (n: number, currency: string) => `${FMT.format(n)} ${currency}`

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', etudes: 'Études', realisation: 'Réalisation',
  entretien: 'Entretien', completed: 'Terminé', cancelled: 'Annulé',
}
const PHASE_LABELS: Record<PhaseReport['phase'], string> = {
  etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
}
const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', in_progress: 'En cours',
  awaiting_signoff: 'Attente validation', completed: 'Terminée',
}
const PHASE_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending:          { bg: 'var(--admin-blue-dim)',    fg: 'var(--admin-blue)' },
  in_progress:      { bg: 'var(--admin-amber-dim)',   fg: 'var(--admin-amber)' },
  awaiting_signoff: { bg: 'var(--admin-accent-dim)',  fg: 'var(--admin-accent)' },
  completed:        { bg: 'var(--admin-emerald-dim)', fg: 'var(--admin-emerald)' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function varianceColor(pct: number | null) {
  if (pct === null) return 'var(--admin-text-muted)'
  if (pct > 10) return 'var(--admin-red)'
  if (pct > 0)  return 'var(--admin-amber)'
  return 'var(--admin-emerald)'
}

function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Carte de phase ───────────────────────────────────────────────────────────

function PhaseCard({ report, phase, currency }: { report: ProjectPhaseReport; phase: PhaseReport; currency: string }) {
  const colors = PHASE_STATUS_COLORS[phase.status] ?? PHASE_STATUS_COLORS.pending
  const budget = report.approvedBudget
  const spendPct = phase.phase === 'realisation' && budget && budget > 0
    ? Math.min(150, Math.round((phase.spend / budget) * 100))
    : null

  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{PHASE_LABELS[phase.phase]}</p>
        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: colors.bg, color: colors.fg }}>
          {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
        </span>
      </div>

      <div className="space-y-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <p>Début : <span style={{ color: 'var(--admin-text)' }}>{fmtDate(phase.startedAt)}</span></p>
        <p>Fin : <span style={{ color: 'var(--admin-text)' }}>{fmtDate(phase.completedAt)}</span></p>
        <p>Durée : <span style={{ color: 'var(--admin-text)' }}>
          {phase.durationDays !== null ? `${phase.durationDays} j${phase.completedAt ? '' : ' (en cours)'}` : '—'}
        </span></p>
        <p>Dépenses : <span className="font-semibold tabular-nums" style={{ color: phase.spend > 0 ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
          {phase.spend > 0 ? fmtMoney(phase.spend, currency) : '—'}
        </span></p>
      </div>

      {/* Indicateurs propres à la phase */}
      {phase.phase === 'etudes' && (
        <div className="pt-2 border-t space-y-1 text-xs" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          <p>Liste végétale : <span style={{ color: 'var(--admin-text)' }}>{phase.plantItemCount ?? 0} article(s)</span></p>
          <p>Prédiction budgétaire : <span style={{ color: 'var(--admin-text)' }}>
            {phase.predictionTotal !== null ? fmtMoney(phase.predictionTotal, currency) : '—'}
          </span>{phase.predictionVersion ? ` (${phase.predictionVersion})` : ''}</p>
          <p>Budget validé : <span style={{ color: 'var(--admin-text)' }}>
            {budget !== null ? fmtMoney(budget, currency) : '—'}
          </span></p>
        </div>
      )}

      {phase.phase === 'realisation' && (
        <div className="pt-2 border-t space-y-2 text-xs" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          <p>Bons d&apos;achat : <span style={{ color: 'var(--admin-text)' }}>{phase.poCount}</span></p>
          {spendPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Dépensé vs budget</span>
                <span className="font-semibold tabular-nums" style={{ color: spendPct > 100 ? 'var(--admin-red)' : spendPct > 90 ? 'var(--admin-amber)' : 'var(--admin-emerald)' }}>
                  {spendPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, spendPct)}%`,
                    background: spendPct > 100 ? 'var(--admin-red)' : spendPct > 90 ? 'var(--admin-amber)' : 'var(--admin-emerald)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {phase.phase === 'entretien' && (
        <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          <p>Visites de maintenance : <span style={{ color: 'var(--admin-text)' }}>{phase.maintenanceVisitCount ?? 0}</span></p>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Par projet ────────────────────────────────────────────────────────

export function ProjectPhaseTab({ reports }: { reports: ProjectPhaseReport[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function handleExport() {
    exportCsv(
      `rapport-phases-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Référence', 'Projet', 'Client', 'Statut projet', 'Phase', 'Statut phase', 'Début', 'Fin', 'Durée (j)', 'Dépenses', 'Devise'],
      reports.flatMap((r) =>
        r.phases.map((ph) => [
          r.reference, r.name, r.clientName, STATUS_LABELS[r.status] ?? r.status,
          PHASE_LABELS[ph.phase], PHASE_STATUS_LABELS[ph.status] ?? ph.status,
          ph.startedAt ? ph.startedAt.slice(0, 10) : '', ph.completedAt ? ph.completedAt.slice(0, 10) : '',
          ph.durationDays ?? '', ph.spend, r.currency,
        ])
      ),
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Rapports par projet et par phase</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Cliquez sur un projet pour le détail Études · Réalisation · Entretien
          </p>
        </div>
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
          style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}
        >
          ↓ Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Projet', 'Client', 'Statut', 'Budget approuvé', 'Dépensé', 'Écart', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const isOpen = expanded === r.id
              return (
                <ProjectRows
                  key={r.id}
                  report={r}
                  isOpen={isOpen}
                  onToggle={() => setExpanded(isOpen ? null : r.id)}
                />
              )
            })}
            {reports.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProjectRows({ report: r, isOpen, onToggle }: { report: ProjectPhaseReport; isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[var(--admin-bg)] transition-colors"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <td className="px-4 py-3">
          <p className="font-mono text-xs" style={{ color: 'var(--admin-blue)' }}>{r.reference}</p>
          <p className="text-xs truncate max-w-[220px]" style={{ color: 'var(--admin-text)' }}>{r.name}</p>
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{r.clientName}</td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text)' }}>{STATUS_LABELS[r.status] ?? r.status}</td>
        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {r.approvedBudget !== null ? fmtMoney(r.approvedBudget, r.currency) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {r.totalSpend > 0 ? fmtMoney(r.totalSpend, r.currency) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-right tabular-nums font-semibold" style={{ color: varianceColor(r.variancePct) }}>
          {r.variancePct !== null ? `${r.variancePct > 0 ? '+' : ''}${r.variancePct}%` : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>{isOpen ? '▾' : '▸'}</td>
      </tr>
      {isOpen && (
        <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <td colSpan={7} className="px-4 py-4" style={{ background: 'var(--admin-surface)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {r.phases.map((ph) => (
                <PhaseCard key={ph.phase} report={r} phase={ph} currency={r.currency} />
              ))}
            </div>
            {r.offPhaseSpend > 0 && (
              <p className="text-xs mt-3" style={{ color: 'var(--admin-text-muted)' }}>
                Hors phase : <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-amber)' }}>{fmtMoney(r.offPhaseSpend, r.currency)}</span>
                {' '}— dépenses non attribuables à une fenêtre de phase (dates manquantes ou antérieures au démarrage).
              </p>
            )}
            <div className="mt-3">
              <Link href={`/admin/projects/${r.id}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--green)' }}>
                Ouvrir le projet →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
```

- [ ] **Step 2: Wire into `ReportsClient.tsx`**

Add the import next to the OverviewTab import:

```tsx
import { ProjectPhaseTab } from './ProjectPhaseTab'
```

Replace the Task 2 placeholder line:

```tsx
      {activeTab === 'perproject'    && <ProjectPhaseTab reports={phaseReports} />}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(dashboard)/reports/ProjectPhaseTab.tsx" "src/app/admin/(dashboard)/reports/ReportsClient.tsx"
git commit -m "feat: Par projet tab — phase-by-phase project reports with CSV export

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Cleanup, build, merge

**Files:**
- Delete: `scripts/verify-reports-overview.ts`

- [ ] **Step 1: Re-run verification once more, then delete the script**

Run: `npx tsx --env-file=.env scripts/verify-reports-overview.ts`
Expected: `✓ Cohérence dépenses par phase vérifiée sur tous les projets.`

```bash
git rm scripts/verify-reports-overview.ts
```

- [ ] **Step 2: Full build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds (145+ routes).

- [ ] **Step 3: Commit, push, PR, merge**

```bash
git add -A
git commit -m "chore: drop reports verification script

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin feat/reports-redesign
```

Create the PR with `gh pr create --title "Reports page redesign: platform overview + per-project phase reports" --body-file <temp file>` (body via `--body-file` per repo convention), then merge with `gh pr merge --merge --delete-branch` per the established workflow, and `git checkout main && git pull`.
