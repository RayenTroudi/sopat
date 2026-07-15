# In-App Notification System — Design

**Date:** 2026-07-15
**Status:** Approved by Rayen

## Problem

The bell icon in the admin header (`src/components/AdminHeader.tsx`) is decorative — no
handler, no badge, no data. Separately, `NotificationSettings` (role lists per event type:
`budgetAlert`, `ncAssigned`, `phaseTransition`, `maintenanceReminder`) is configurable in
Paramètres but never actually consulted by any trigger — recipients are hardcoded
elsewhere (`email-triggers.ts` queries `role='admin'` directly, or a project's assigned
chef by FK). `triggerBudgetAlertEmail` is defined but has zero call sites — budget alerts
never fire today.

## Goal

A working in-app notification center: users see a badge + dropdown in the header when a
project they should know about changes phase, or when a project's spend crosses a budget
threshold. Recipients are resolved from the existing (currently dead) role-list settings,
finally wiring them to real behavior.

## Non-goals

- No email notifications for these events (in-app only, per decision).
- No new event types beyond phase transitions and budget alerts (NC-assigned,
  maintenance-reminder use the same settings today but are out of scope — the system is
  built so adding them later is one new trigger call, not a redesign).
- No real-time push (SSE/WebSocket) — the app has no such infrastructure today; the
  dropdown polls every 30s, which is adequate for this internal tool's usage pattern.
- No per-phase-direction routing — the existing `phaseTransition` role list is one flat
  list that fires for every transition (Études→Réalisation and Réalisation→Entretien
  alike), matching how Settings presents it today.

## Data model

### `notifications` table (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `recipient_id` | uuid, FK `users.id`, not null | |
| `type` | enum `notification_type` (`phase_transition`, `budget_alert`), not null | |
| `title` | varchar(255), not null | |
| `body` | text | |
| `href` | varchar(500) | precomputed destination URL |
| `project_id` | uuid, FK `projects.id`, nullable | |
| `read_at` | timestamp, nullable | null = unread |
| `created_at` | timestamp, default now() | |
| `created_by` | uuid, FK `users.id`, nullable | actor who caused the event; null for system |

Indexes: `(recipient_id, read_at)` for unread-count queries, `(recipient_id, created_at)`
for listing.

### `projects` — two new columns

- `budget_alert_90_notified_at` timestamp, nullable
- `budget_alert_over_notified_at` timestamp, nullable

Both reset to `NULL` whenever a new budget is approved for the project (in
`saveBudgetValidation()`), starting a fresh alert cycle.

## Recipient resolution

`getNotificationSettings()` (new, mirrors the existing `getBudgetEngineConfig()` pattern
in `src/lib/db/settings.ts`) reads the `notifications` key from `system_settings` and
returns the same `NotificationSettings` shape already editable in Paramètres.

`notifyByRoles({ type, title, body, href, projectId, roles, createdBy, excludeUserId })`
(new, `src/lib/notifications.ts`) queries active, non-deleted users whose `role` is in
`roles`, excludes `excludeUserId` (the actor), and bulk-inserts one `notifications` row
per remaining recipient. No-ops if `roles` is empty or no users match.

## Trigger points

### Phase transition

Hooked directly inside `transitionPhase()` (`src/lib/db/projects.ts:447`) — the single
function both `POST /api/projects/[id]/signoff` and
`POST /api/projects/[id]/realisation-signoff` call. Fires after the phase status update
and `logActivity()` call, before the function returns, so every code path that changes a
project's phase is covered automatically.

Title: `Projet transféré en {toPhase} — {reference}`. Body includes the project name and
who signed off. `href`: `/admin/projects/{projectId}`. Roles:
`settings.notifications.phaseTransition`. `excludeUserId`: the actor who signed off.

### Budget alert

`checkBudgetThresholdAndNotify(projectId, actorId)` (new, `src/lib/notifications.ts`):
loads the project's `approvedBudget` and the two dedupe timestamps, computes spend as
Σ `purchase_orders.total_cost` + Σ `extra_expenses.amount` (status `approved`, not
deleted) — the same definition already used in `reports-overview.ts`. If spend ÷ budget
≥ 100% and `budget_alert_over_notified_at` is null: notify, stamp the column. Else if
≥ 90% and `budget_alert_90_notified_at` is null: notify, stamp the column. No-ops if the
project has no approved budget.

Called from two places (the only places spend increases):
- `createPurchaseOrder()` (`src/lib/db/realisation.ts:141`), after the insert transaction
  commits.
- `decideExtraExpense()` (`src/lib/actions/achat.ts:96`), after a decision of `'approved'`
  (the update is extended to `.returning({ projectId })` so the check has what it needs).

Title: `Dépassement budget — {reference}` (≥100%) or `Alerte budget 90% — {reference}`
(≥90%). `href`: `/admin/projects/{projectId}`. Roles: `settings.notifications.budgetAlert`.

## API

- `GET /api/notifications` — current user's last 20 notifications + unread count.
  Requires auth; scoped to `recipient_id = session.user.userId` (no role check needed,
  every user only ever sees their own).
- `PATCH /api/notifications/[id]` — marks one notification read (`read_at = now()`);
  verifies `recipient_id` matches the session before updating.
- `POST /api/notifications/mark-all-read` — marks all of the current user's unread
  notifications read.

## UI

`AdminSearch.tsx`'s dropdown pattern (debounce/click-outside/absolute-positioned panel,
already shipped) is the visual reference. New `AdminNotifications.tsx` client component
replaces the dead `Bell` button in `AdminHeader.tsx`:

- Red badge with unread count (caps display at "9+") on the bell.
- Polls `GET /api/notifications` every 30s and on mount.
- Click opens a dropdown: each row shows title, project name (if any), relative time
  ("il y a 2h"), bold when unread.
- Clicking a row: marks it read, closes the dropdown, navigates to `href`.
- "Tout marquer comme lu" action in the dropdown header, calls the mark-all-read route.

## Migration

New file `db/migrations/0022_notifications.sql`: `CREATE TYPE notification_type`,
`CREATE TABLE notifications`, `ALTER TABLE projects ADD COLUMN budget_alert_90_notified_at
timestamp`, `ADD COLUMN budget_alert_over_notified_at timestamp`. Applied via the
project's established `tsx` + `pg` client script against `.env`, not `drizzle-kit`
(matches every prior migration in this repo).

## Testing

- A `tsx` verification script (deleted after use, per repo convention): create a test
  notification row, confirm `getNotificationSettings()` round-trips the configured roles,
  confirm `notifyByRoles()` inserts one row per matching active user and skips the
  excluded actor, confirm `checkBudgetThresholdAndNotify()` fires at 90%/100% exactly once
  each until the budget is re-approved.
- `tsc --noEmit` + production build.
- Manual: trigger a real phase sign-off and a real purchase order that crosses 90% on the
  dev DB, confirm rows appear and the header badge/dropdown render them.
