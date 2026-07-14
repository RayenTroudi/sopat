# Budget Prediction Engine v2 — Design

**Date:** 2026-07-14
**Status:** Approved by Rayen (option A of three proposed)

## Problem

The current budget prediction is an XGBoost model trained on 200 **synthetic** samples,
executed via a Python subprocess. In production (Vercel) subprocesses are unavailable, so
every real prediction silently falls back to a crude `max(area × rate, plants × 1.6)`
formula. SOPAT has no historical cost dataset outside the app itself, so heavy ML has
nothing real to learn from.

## Goal

A deterministic, explainable, TypeScript-native estimation engine that:

1. Produces a defensible estimate from day 1 using the project's real plant list prices.
2. Calibrates itself automatically against SOPAT's own completed projects as they accrue.
3. Reports honest confidence (driven by how much real evidence supports the estimate).
4. Keeps the existing UI, API contract, DB tables, and validation workflow unchanged.
5. Runs identically in dev and on Vercel — no Python, no fallback path.

## Non-goals

- No gradient-boosted / neural model (insufficient real data; revisit at ~50+ completed projects).
- No import of pre-2024 Excel archives (none reliable per Rayen).
- No LLM narrative layer (possible later, out of scope).
- No change to the sign-off gates (prediction stays optional for phase transition).

## Architecture

```
EtudesTab → POST /api/ml/predict
              └── src/lib/budget-engine.ts   (NEW — pure functions)
                    ├── Layer 1: bottom-up cost model (deterministic coefficients)
                    └── Layer 2: calibration vs completed similar projects (DB query)
              └── savePrediction() → budget_predictions   (unchanged)
```

Deleted: `scripts/train_model.py`, `scripts/predict.py`, `scripts/retrain_model.py`,
subprocess plumbing in the API route, `models/` + `data/training/` artifacts,
`ruleBased()` fallbacks in `src/lib/ml.ts` and the route.

## Layer 1 — Bottom-up cost model

Input: saved plant list rows (quantity, unit price, category), `siteAreaM2`,
`projectType`, `region`, `season` (kept for API compat; season multiplier applies to labor).

| Poste | Rule |
|---|---|
| Plants | Σ qty × unit price. Rows without price use per-category default price (config). |
| Soil & substrates | Trees/palms: pit volume (m³/subject) × soil price. Grass/couvre-sol: prep depth × covered area. + amendment lump proportional to site area. |
| Labor | Workdays per category unit (palm > tree > shrub…) × daily rate × project-type factor × season multiplier. |
| Equipment | Thresholds: (trees+palms) ≥ config.n ⇒ mini-pelle days × daily rate; area ≥ config.m2 ⇒ prep machinery. |
| Logistics | max(floor TND, plants cost × pct) × region multiplier. |

All coefficients live in one JSON config (key `budget_engine_config` in `system_settings`),
loaded with hardcoded defaults when the key is absent. Each prediction stores the config
version in `model_version` (e.g. `engine-v2.0/cfg-default`) — ISO traceability.

## Layer 2 — Calibration against completed projects

At prediction time:

1. Query projects with `status = completed`, same `projectType`, `siteAreaM2` within ±60%
   of the target, excluding the current project.
2. For each, actual cost = Σ `purchase_orders.total_cost` (validated) + Σ `extra_expenses`
   amounts; fall back to `approvedBudget` when no spend recorded. Skip if neither exists.
3. Re-run Layer 1 on that project's stored plant list → ratio = actual ÷ engine estimate.
4. Calibration factor = median of ratios, clamped to [0.7, 1.4]. Applied to the Layer 1 total
   (breakdown scaled proportionally).

### Confidence

- Base 55.
- +8 per similar project used (cap at 90 total).
- −10 if any plant row lacks a price; −10 if `siteAreaM2` missing/zero.
- Floor 25.
- Range: `low/high = total × (1 ∓ max(0.10, stddev(ratios)))`, defaulting to ±18% when
  there are no similar projects.

### Output (unchanged shape)

`PredictionResult` as today. `top_cost_drivers` becomes real: top 3 among
(largest plant line, dominant breakdown poste, "N projets similaires: REF, REF…").
`similar_projects_used` = actual count. `is_fallback` always false (field kept for compat).

## Files

| File | Change |
|---|---|
| `src/lib/budget-engine.ts` | NEW. Pure engine + config types + defaults. No DB imports. |
| `src/lib/db/budget-calibration.ts` | NEW. DB queries: similar completed projects + their actuals + plant lists. |
| `src/app/api/ml/predict/route.ts` | Rewrite: validate → engine + calibration → savePrediction. Delete subprocess/fallback. |
| `src/lib/ml.ts` | Keep types + formatters; delete `ruleBased()`. |
| `src/app/api/ml/status/route.ts` | Point metadata at engine version instead of joblib metadata (keep predictions list/variance). |
| `src/components/budget/BudgetPredictionPanel.tsx` | Remove fallback badge if present; otherwise untouched. |
| `scripts/*.py`, `models/`, `data/training/` | Delete. |

## Permissions & audit

Unchanged: route requires session + `assertProjectAccess`; predictions persist with
`createdBy`; human validation stays in `budget_validations` (suggested vs approved value —
per CLAUDE.md AI policy).

## Testing

- `scripts/test-budget-engine.ts` (tsx, matching repo convention): fixed plant lists →
  expected poste amounts; calibration with 0/1/5 ratios; clamping at 0.7/1.4; confidence
  bounds (25 floor, 90 cap); missing-price and missing-area penalties.
- `tsc --noEmit` + production build.
- Manual: run prediction on project 02051266… (TEST-X) and confirm breakdown card renders.
