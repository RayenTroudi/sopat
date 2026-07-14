# Rapports Page Redesign — Design

**Date:** 2026-07-14
**Status:** Approved by Rayen (money-won = all three views; old sections kept under Analyses)

## Problem

The current `/admin/reports` page is a flat stack of six analysis sections. It has no
platform-wide financial overview (projects count, money spent vs won) and no per-project
report broken down by phase (Études / Réalisation / Entretien).

## Goal

Rebuild the page as three tabs:

1. **Vue générale** — platform KPIs and trend charts.
2. **Par projet** — a project table where each row expands into a phase-by-phase report.
3. **Analyses** — the six existing sections, moved unchanged.

PDF/PPTX direction-report buttons stay in the page header, visible on all tabs.
Access roles unchanged: admin, direction, realisation_chef, entretien_chef.

## Non-goals

- No changes to the six existing analysis sections or their queries.
- No new DB tables or migrations — read-only aggregation over existing data.
- No per-phase cost column on purchase orders; phase spend is derived by date bucketing.

## Data definitions

**Money spent** = Σ `purchase_orders.total_cost` + Σ `extra_expenses.amount`
(status `approved`, not soft-deleted). Project-scoped where `project_id` matches;
platform totals include all rows (extra expenses without a project count in platform
totals only).

**Money won** — three separate KPIs, never summed together:
- **Contracté**: Σ `projects.approved_budget` (non-deleted projects).
- **Facturé / Encaissé**: Σ `client_account_entries.amount` by `entry_type`
  (`facture` and `encaissement`; `avoir` subtracts from Facturé; not soft-deleted).
- **Offres gagnées**: Σ `commercial_offers.amount` where status `gagnee`
  (not soft-deleted), plus win rate = gagnée / (gagnée + perdue) as %.

**Marge brute** = Contracté − Dépensé, with % (null-safe when Contracté = 0).

**Phase spend** (per project): purchase orders and approved extra expenses whose
date (`purchase_date` / `expense_date`) falls in `[phase.started_at, phase.completed_at]`;
open-ended upper bound for a phase still in progress. Spend dated before the first
phase started (or when no phase has dates) is reported as **Hors phase**.
Currency note: amounts are summed in their stored numeric value and displayed in the
project's currency (TND for platform totals — matching how the rest of the admin
aggregates today).

## Tab 1 — Vue générale

Server-computed in `src/lib/db/reports-overview.ts`, one exported function
`getPlatformOverview(year?: number)`:

- **KPI cards row 1**: Projets total · Actifs (status in etudes/realisation/entretien) ·
  Terminés · Annulés.
- **KPI cards row 2 (money)**: Contracté · Facturé · Encaissé · Offres gagnées (+ win
  rate badge) · Dépensé · Marge brute (+ %).
- **Charts** (recharts, same style as existing sections):
  - Projets par statut (bar) and par type (bar) — all-time.
  - Dépenses mensuelles (line, last 12 months, purchase orders + approved extra
    expenses bucketed by month).
  - Offres par statut (bar: en_preparation/envoyee/en_negociation/gagnee/perdue/annulee).
- Year selector (defaults to current year, via `?year=` search param — the page is
  force-dynamic so the server recomputes) applies to the monthly spend chart; the
  offers chart and KPI cards stay all-time (labelled "cumul").

## Tab 2 — Par projet

Server-computed in the same file, `getProjectPhaseReports()`, **batched aggregates —
no per-project query loops** (GROUP BY project_id for POs, extra expenses, plant list
counts, maintenance visit counts; one query for phases; assembled in TS).

UI: table of projects (référence, nom, client, statut, budget approuvé, dépensé, écart %)
sorted by création desc. Clicking a row expands an inline phase report — three cards
(Études / Réalisation / Entretien):

- **Common to each card**: phase status pill, dates (startedAt → completedAt), durée en
  jours, dépenses de la phase (TND).
- **Études extras**: nb d'articles liste végétale, dernière prédiction budgétaire
  (montant + version moteur), budget validé (montant).
- **Réalisation extras**: nb bons d'achat, barre de progression dépensé vs budget
  approuvé (red > 100%, amber > 90%).
- **Entretien extras**: nb visites de maintenance réalisées.
- **Hors phase** line shown under the cards when unattributable spend > 0.
- CSV export button (existing `exportCsv` helper pattern): one row per project × phase
  with status, dates, durée, dépenses.

## Tabs 3+ — Existing sections

The page already has a flat custom tab bar with the six existing sections (variance
budget, NC mensuelles, timeline Gantt, précision moteur, international, matériel).
Rather than nesting them under an "Analyses" sub-tab (two-level navigation for no
gain), the two new tabs — **Vue générale** and **Par projet** — are prepended to the
existing tab bar, which keeps its current mechanism. The six existing sections stay
**unmodified**; the default tab becomes Vue générale.

## Files

| File | Change |
|---|---|
| `src/lib/db/reports-overview.ts` | NEW — `getPlatformOverview`, `getProjectPhaseReports`, exported row types. |
| `src/app/admin/(dashboard)/reports/page.tsx` | Fetch the two new datasets in the existing `Promise.all`. |
| `src/app/admin/(dashboard)/reports/OverviewTab.tsx` | NEW — Vue générale tab UI. |
| `src/app/admin/(dashboard)/reports/ProjectPhaseTab.tsx` | NEW — Par projet tab UI. |
| `src/app/admin/(dashboard)/reports/ReportsClient.tsx` | Prepend 'Vue générale' and 'Par projet' to the existing TABS array (default tab = overview); render the two new tab components; existing sections unchanged. |

## Testing

- `npx tsc --noEmit` + production build.
- A `tsx` verification script run once against the dev DB to print the overview numbers
  and one project's phase report, cross-checked by hand against the projects list
  (deleted after verification, matching repo convention).
