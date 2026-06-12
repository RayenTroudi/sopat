# RSE Events & Actions Tracker — Design Spec
**Date:** 2026-06-09  
**Status:** Approved

---

## Overview

SOPAT organizes recurring environmental events (beach cleanups, tree planting, sensibilisation sessions, team building with RSE component). This module documents them operationally, tracks logistics and retroplanning, and aggregates impact metrics for Mohamed Mrabet's portfolio and annual RSE report.

---

## Decisions Made

| Question | Decision |
|---|---|
| Multi-step draft persistence | localStorage (keyed by draft timestamp, cleared on submit) |
| PDF export (Impact Dashboard) | `window.print()` with print-specific CSS |
| Charts library | Recharts 3.8 (already installed) |
| "Publier le bilan" output | Print-CSS bilan PDF downloadable from event detail page |
| Wizard navigation | URL step param `?step=1..5`, Approach A |

---

## Database Schema

### New Enums
All defined via `pgEnum` in `db/schema.ts`:

- `rse_event_type_enum`: `nettoyage_plage | plantation | sensibilisation | team_building | journee_environnement | autre`
- `rse_event_status_enum`: `planifie | en_cours | termine | annule`
- `rse_event_team_name_enum`: `rse | rh_communication | logistique | communication_marketing | direction`
- `rse_logistics_category_enum`: `materiel_environnement | materiel_evenementiel | confort`
- `rse_retro_status_enum`: `a_faire | en_cours | termine`
- `rse_comm_phase_enum`: `avant | pendant | apres`
- `rse_comm_channel_enum`: `reseaux_sociaux | email_interne | presse | affichage | autre`
- `rse_comm_plan_status_enum`: `planifie | publie | annule`

### Tables

**`rse_events`**
```
id, event_reference (unique, auto EVT-YYYY-XXX), title, event_type,
date (timestamp), location, partner_id (FK rse_partnerships nullable),
status (default planifie), participant_count_planned, participant_count_actual,
sopat_coordinator_id (FK users), notes, created_at, updated_at, created_by
```

**`rse_event_teams`**
```
id, event_id (FK rse_events), team_name, team_leader_id (FK users nullable),
missions (text[]), notes, created_at, updated_at, created_by
```

**`rse_event_logistics`**
```
id, event_id (FK), category, item_name, quantity_planned, quantity_actual,
unit, supplier, cost (decimal), notes, created_at, updated_at, created_by
```

**`rse_event_retroplanning`**
```
id, event_id (FK), task_description, deadline (timestamp), assigned_team,
status (default a_faire), completed_at, notes, created_at, updated_at, created_by
```

**`rse_event_communication_plan`**
```
id, event_id (FK), phase, action_description, channel,
responsible_id (FK users nullable), status (default planifie),
published_at, asset_cloudinary_id (FK cloudinary_assets nullable),
notes, created_at, updated_at, created_by
```

**`rse_event_results`** (1:1 with rse_events — UNIQUE on event_id)
```
id, event_id (FK unique), waste_collected_kg (decimal), trees_planted (int),
participants_actual (int), beach_length_cleaned_m (decimal), zones_treated (int),
media_coverage (boolean), press_articles_count, social_media_reach,
satisfaction_score (int 1-5), lessons_learned (text),
post_event_report_cloudinary_id (FK cloudinary_assets nullable),
photos_album_cloudinary_ids (text[]), submitted_by (FK users),
submitted_at, created_at, updated_at, created_by
```

---

## API Routes

All routes require auth. Create/update restricted to `admin | direction`.

| Route | Methods | Notes |
|---|---|---|
| `/api/rse/events` | GET, POST | List with filters (type, status, year). POST creates with `planifie` status. |
| `/api/rse/events/[id]` | GET, PATCH | PATCH updates general fields + status. |
| `/api/rse/events/[id]/teams` | GET, POST, DELETE | POST upserts all teams in one call (array). |
| `/api/rse/events/[id]/logistics` | GET, POST, DELETE | POST upserts logistics rows. |
| `/api/rse/events/[id]/retroplanning` | GET, POST, PATCH | PATCH updates single task status. |
| `/api/rse/events/[id]/communication` | GET, POST, PATCH | PATCH updates single action (published_at, status). |
| `/api/rse/events/[id]/results` | GET, POST, PATCH | POST creates results record. PATCH for updates + "publier" action that sets event status to `termine`. |

---

## Pages

### `/admin/rse/events` — Event List
- Server component, fetches all events with filters from searchParams
- **Cards layout** (not table): grid of event cards
- Each card: event type icon + color, title, date, location, partner name (if any), participant count planned, status badge
- Filter bar (client component): by type, status, year dropdown
- "Créer un événement" button (admin/direction only) → `/admin/rse/events/new`
- Nav: "Événements RSE" added to AdminNav under RSE section

### `/admin/rse/events/new` — Multi-step Wizard
- URL param `?step=1` through `?step=5` + `?step=review`
- Draft persisted to `localStorage` key `rse_event_draft` (object with all 5 steps merged)
- Step progress bar at top (1–5 + Révision)
- Each step is a client component that reads/writes the shared draft from localStorage

**Step 1 — Général**: title, type, date, location, partner (select from active partnerships), coordinator (select from users), notes, participant count planned

**Step 2 — Équipes**: 5 team slots (rse, rh_communication, logistique, communication_marketing, direction). Each: team leader (select users), missions as dynamic tag-list (add/remove text items)

**Step 3 — Logistique**: 3 category sections (matériel environnement, matériel événementiel, confort). Each: add rows with item_name, quantity, unit, supplier, cost. Add/remove rows dynamically.

**Step 4 — Rétro-planning**: Table of tasks. Each row: task description, deadline (date), assigned_team (select), status. Add/remove rows.

**Step 5 — Communication**: Three phase sections (avant/pendant/après). Each: add rows with action_description, channel, responsible (select users). 

**Review**: Read-only summary of all steps. "Créer l'événement" button → POST to API → redirect to `/admin/rse/events/[id]` → clear localStorage draft.

### `/admin/rse/events/[id]` — Event Detail (5 tabs)
URL: `?tab=general|equipes|logistique|communication|resultats`

**Tab "Général"**: All event metadata, status management (admin/direction), partner link, coordinator info.

**Tab "Équipes"**: Cards per team showing team name, leader, missions list. Edit inline (admin/direction).

**Tab "Logistique"**: Three sections by category. Table per category. Editable quantity_actual vs quantity_planned. Cost total per category + grand total.

**Tab "Communication"**: Three phase sections (avant/pendant/après). Each action shows channel icon, description, responsible, status badge, published_at. "Marquer comme publié" button. Asset upload per action.

**Tab "Résultats"**: 
- Disabled (grayed out) if `event.date` > today
- Form fields: waste_collected_kg, trees_planted, participants_actual, beach_length_cleaned_m, zones_treated, press_articles_count, social_media_reach, satisfaction_score (1–5 star selector), lessons_learned
- Photo gallery: multi-upload via Cloudinary signed upload (rse-sign endpoint), displays thumbnails
- Post-event report PDF upload
- "Publier le bilan" button → PATCH `action: publish` → sets status to `termine`
- After publish: print-CSS bilan card appears with all metrics formatted for PDF print

---

## RSE Impact Dashboard (`/admin/rse/impact`)

Server component. Data fetched via `getRseImpactData()` in `src/lib/db/rse-events.ts`.

### Metrics Cards (top row)
- Total kg waste collected (all-time)
- Total trees planted (all-time)
- Total event participants (all-time)
- Total events completed
- Active RSE partnerships count (from existing `rse_partnerships` table)
- Commitments fulfilled on time % (from `rse_partnership_commitments`)

### Charts (Recharts, client component)
- **Bar chart**: kg waste collected per year (last 5 years)
- **Bar chart**: trees planted per year (last 5 years)  
- **Donut chart**: event count by type (all-time)
- **Bar chart**: participants per event (last 10 events, horizontal)

### Location Table
Simple table grouped by location/region showing event count + total participants. No map library — plain grouped table.

### Print / PDF Export
- "Exporter en PDF" button → `window.print()`
- `@media print` CSS: hides nav, filters, buttons; shows full-width charts and metrics; page breaks between sections
- Print styles added to a `globals.css` or inline `<style>` in the page

---

## File Structure

```
db/schema.ts                          ← new enums + 6 tables appended
src/lib/db/rse-events.ts              ← all DB queries for events module
src/app/api/rse/events/               ← route.ts + [id]/ subdirectory
src/app/admin/(dashboard)/rse/
  events/
    page.tsx                          ← server component list
    new/page.tsx                      ← wizard shell (server, redirects to ?step=1)
    [id]/page.tsx                     ← detail shell (server)
  impact/page.tsx                     ← impact dashboard (server)
src/components/rse/
  EventCard.tsx                       ← single event card component
  EventWizard.tsx                     ← wizard shell client component
  wizard/
    Step1General.tsx
    Step2Teams.tsx
    Step3Logistics.tsx
    Step4Retroplanning.tsx
    Step5Communication.tsx
    StepReview.tsx
  EventTabs.tsx
  tabs/
    GeneralTab.tsx
    EquipesTab.tsx
    LogistiqueTab.tsx
    CommunicationTab.tsx
    ResultatsTab.tsx
    BilanPrint.tsx                    ← print-only bilan component
  RseImpactCharts.tsx                 ← Recharts client component
```

---

## Key Constraints

- All role gates: `admin | direction` for create/edit, any authenticated user for read
- Résultats tab disabled if event date is in the future (grayed with tooltip)
- localStorage draft key: `rse_event_draft` — cleared on successful create
- Photo uploads reuse `/api/upload/rse-sign` endpoint (already built), `assetType: rse_communication`
- No new npm packages needed (Recharts already installed, no map library)
- Print CSS scoped to impact page and bilan component only
```
