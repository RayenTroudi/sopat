# CRM Phase 1 — Core Client Base
**Date:** 2026-06-11  
**Scope:** Database, data layer, API, pages, project integration  
**Out of scope (Phase 2):** Dashboard Top Clients card, Direction portfolio PDF export

---

## Problem

SOPAT serves banks, hotels, car dealerships, municipalities, and private individuals. All client information is currently a single `client_name` varchar on the `projects` table. There is no way to view a client's full project history, contact details, or satisfaction trend. This spec adds a lightweight CRM layer.

---

## Database

### New table: `clients`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `company_name` | varchar(255) NOT NULL | Full legal or company name |
| `display_name` | varchar(255) NOT NULL | Short name for UI (defaults to company_name) |
| `client_type` | varchar(50) NOT NULL | One of the 8 sector values (see below) |
| `country` | varchar(2) NOT NULL DEFAULT 'TN' | ISO 3166-1 alpha-2 |
| `city` | varchar(100) | |
| `address` | text | |
| `primary_contact_name` | varchar(255) | |
| `primary_contact_title` | varchar(255) | |
| `primary_contact_email` | varchar(255) | |
| `primary_contact_phone` | varchar(50) | |
| `secondary_contact_name` | varchar(255) | |
| `secondary_contact_email` | varchar(255) | |
| `logo_cloudinary_id` | uuid FK cloudinary_assets | nullable |
| `is_featured` | boolean DEFAULT false | Appears in "They Trust" section (Phase 2) |
| `notes` | text | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `deleted_at` | timestamp | Soft delete |
| `created_by` | uuid FK users | |

**`client_type` values** (same as existing `clientSectorEnum`):  
`banque | hotellerie | automobile | institutionnel_public | institutionnel_prive | residentiel_prive | diplomatique | autre`

Stored as varchar with Drizzle — no new Postgres enum needed, avoids migration complexity.

### New table: `client_interactions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid FK clients NOT NULL | |
| `interaction_type` | interactionTypeEnum NOT NULL | See enum below |
| `date` | date NOT NULL | |
| `summary` | text NOT NULL | |
| `outcome` | text | nullable |
| `next_action` | text | nullable |
| `next_action_date` | date | nullable |
| `logged_by` | uuid FK users NOT NULL | |
| `created_at` | timestamp | |

**New enum `interaction_type`:** `appel | email | reunion | visite_site | autre`

### `projects` table change

Add column: `client_id` (uuid, nullable, FK clients).  
Keep `client_name` varchar as-is — never removed.

**Resolution rule:** When displaying client name on a project, use `clients.display_name` if `client_id` is set, else fall back to `projects.client_name`.

---

## Data Layer (`src/lib/db/clients.ts`)

### Functions

**`listClients(filters?)`**  
Returns all non-deleted clients. Aggregates via subquery: `projectCount` (count of non-deleted projects where `client_id = clients.id`), `lastProjectDate` (max `created_at`), `totalRevenueTND` (sum of `approved_budget` — no currency conversion at list level, displayed as TND approximation with a note).  
Filters: `type?: string`, `country?: string`, `isFeatured?: boolean`.

**`getClientById(id)`**  
Full record + same aggregates as list.

**`getClientProjects(id)`**  
All non-deleted projects with `client_id = id`, ordered by `created_at` desc. Returns same shape as `getAllProjects` but without pagination.

**`getClientInteractions(id)`**  
All interactions for client, ordered by `date` desc. Joins `users` for `loggedByName`.

**`getClientSatisfaction(id)`**  
All `client_satisfaction` rows joined through projects where `client_id = id`. Returns score, comments, recordedAt, projectName, projectReference.

**`createClient(input)` / `updateClient(id, input)` / `softDeleteClient(id)`**  
Standard CRUD. `updateClient` accepts partial input.

**`createInteraction(input)` / `deleteInteraction(id, clientId)`**  
`deleteInteraction` verifies the interaction belongs to the client before deleting (IDOR prevention).

**`searchClients(q)`**  
`ilike` search on `company_name` and `display_name`. Returns `{ id, displayName, clientType, country }[]`. Limited to 20 results. Used by project form selector.

### `src/lib/db/projects.ts` changes

- `CreateProjectInput` gains optional `clientId?: string`
- `UpdateProjectInput` gains optional `clientId?: string | null`
- `getAllProjects` left-joins `clients` on `client_id`, adds `clientId` and `clientDisplayName` to returned rows
- `getProjectById` same join

---

## API Routes

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/clients` | all listed roles | filter via query params |
| POST | `/api/clients` | admin, direction, etudes_chef | create |
| GET | `/api/clients/search?q=` | all listed roles | typeahead, max 20 |
| GET | `/api/clients/[id]` | all listed roles | full detail |
| PATCH | `/api/clients/[id]` | admin, direction, etudes_chef | update |
| DELETE | `/api/clients/[id]` | admin, direction | soft delete |
| GET | `/api/clients/[id]/interactions` | all listed roles | |
| POST | `/api/clients/[id]/interactions` | all listed roles | |
| DELETE | `/api/clients/[id]/interactions/[interactionId]` | admin, direction, etudes_chef | |

All routes: 401 if no session, 403 if wrong role, 404 if not found or deleted.

---

## Pages & Components

### `/admin/clients` — List page

Server component. Reads `type`, `country`, `featured` from searchParams. Renders:
- Header: "Clients" title + count + "Nouveau client" button (admin/direction/etudes_chef only)
- Filter bar: sector `<select>`, country `<select>`, featured checkbox — all client-side via `useSearchParams` / `useRouter` (same pattern as ProjectsTable filters)
- Card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Empty state matching RSE events pattern

**`ClientCard` component** (`src/components/clients/ClientCard.tsx`):
- Colored top bar keyed to `clientType` (same pattern as EventCard)
- Logo thumbnail if `logoUrl` is set, else colored initials avatar (first letter of `displayName`, background color derived from `clientType`)
- Company name, sector badge, country flag emoji
- Stats row: project count, last project date, total revenue
- `residentiel_prive` clients: company name shown as initials only to non-admin/direction roles (respects anonymization)
- Links to `/admin/clients/[id]`

### `/admin/clients/new` — Creation form

Server page (auth check + redirect) renders `ClientForm` client component.

**`ClientForm`** (`src/components/clients/ClientForm.tsx`):  
Single-page form, no wizard. Sections:
1. **Identité** — company name, display name, client type, country, city, address
2. **Contact principal** — name, title, email, phone
3. **Contact secondaire** — name, email
4. **Logo** — Cloudinary upload (image only, max 2MB), preview thumbnail
5. **Options** — featured toggle (admin/direction only), notes

Reused for edit: same component, pre-populated. Accessed at `/admin/clients/[id]/edit`.

### `/admin/clients/[id]` — Detail page

Server page fetches client + projects + interactions + satisfaction in parallel. Passes all to `ClientDetailTabs` client component.

**`ClientDetailTabs`** (`src/components/clients/ClientDetailTabs.tsx`):

**Tab "Profil":**  
Two-column grid of all client fields. Logo displayed top-right. "Modifier" button → `/admin/clients/[id]/edit`. "Supprimer" button (admin/direction only) → confirm dialog → soft delete → redirect to `/admin/clients`.

**Tab "Projets":**  
- Stats row: total projects, total revenue TND, active projects count
- Donut chart (Recharts PieChart) — project count by type, colored by existing `TYPE_COLORS`
- Grid of `MiniProjectCard` — type icon, project name, country flag, `PhaseBadge`, approved budget, estimated delivery date. Links to `/admin/projects/[id]`.

**Tab "Interactions":**  
- Vertical timeline. Each entry: date badge, type icon+label, summary, outcome (if set), next action chip (if set, highlighted amber if date is past).
- "Ajouter une interaction" button → inline drawer (same pattern as `EquipmentDrawer`): type select, date, summary textarea, outcome textarea, next action text + date.
- Delete button on each entry (admin/direction/etudes_chef).

**Tab "Satisfaction":**  
- Rolling average score as filled/empty star display (e.g. ★★★★☆ 4.2/5) + record count
- Table of individual records: project reference, date, score (stars), comments
- Sparkline trend (Recharts LineChart, small height ~80px) — score over time
- Empty state if no satisfaction records linked

### `ProjectsTable.tsx` changes

`ProjectRow` type gains: `clientId: string | null`, `clientDisplayName: string | null`.

Client cell: if `clientId` is set, render initials avatar (12px circle) + `<Link href="/admin/clients/[clientId]">{clientDisplayName}</Link>`. Else render plain `clientName` text. Avatar color derived from `clientType` if available, else neutral gray.

### `Step1Basic.tsx` changes (project creation wizard)

Replace the `clientName` text input with:
1. A small search `<input>` that filters (client-side) a `<select>` populated with all clients (passed as prop from the `/admin/projects/new` server page, which calls `searchClients('')` to fetch the full list). Shows `displayName` + `(clientType label)`.
2. "Ou saisir un nom libre" collapse toggle — reveals original `clientName` text input.
3. "Créer un nouveau client →" link that opens `/admin/clients/new` in a new tab.

`WizardFormValues` gains `clientId?: string`. `createProject` API route passes it through.

---

## AdminNav

New item added between "Projets" and "Non-conformités":
```
{ href: '/admin/clients', label: 'Clients', icon: '🏢', roles: ['admin','direction','etudes_chef','realisation_chef'] }
```

---

## Access Control Summary

| Action | Roles |
|---|---|
| View client list + detail | admin, direction, etudes_chef, realisation_chef |
| Create + edit clients | admin, direction, etudes_chef |
| Delete clients (soft) | admin, direction |
| Log interactions | admin, direction, etudes_chef, realisation_chef |
| Delete interactions | admin, direction, etudes_chef |
| Toggle `isFeatured` | admin, direction |
| View `residentiel_prive` full name | admin, direction only |

---

## Anonymization Rule

Clients with `clientType = 'residentiel_prive'` are treated as private individuals:
- `companyName` masked to initials (e.g. "A. B.") for all roles except admin and direction
- Never exported in Phase 2 portfolio PDF
- `isFeatured` cannot be set to true for `residentiel_prive` clients (enforced at API level)
