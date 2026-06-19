# SOPAT Admin UI Redesign — Design Spec
**Date:** 2026-06-19  
**Approach:** Incremental Layer (Approach A)  
**Constraint:** Frontend presentation layer only — zero changes to business logic, API calls, DB queries, server actions, or state management.

---

## 1. Goals

Modernize the SOPAT admin panel to feel comparable to Stripe, Linear, Vercel, and Supabase — while preserving 100% of existing functionality and SOPAT's brand identity (forest green, emerald, gold palette).

---

## 2. Non-Goals

- Do NOT modify any server actions, API routes, database queries, or auth logic.
- Do NOT rename variables, hooks, or functions unless purely cosmetic.
- Do NOT change any existing business rules (role filtering, ISO clause references, budget logic, etc.).
- Do NOT introduce new state management patterns.
- Do NOT add dark mode.

---

## 3. Tech Stack (unchanged)

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS v4
- shadcn/ui (to be installed)
- Lucide React (already installed: `lucide-react ^1.17.0`)

---

## 4. Foundation — shadcn/ui Wiring

### 4.1 Install shadcn components

Install the following shadcn/ui components via `npx shadcn@latest add`:

```
button badge card table sheet dialog dropdown-menu tooltip
separator skeleton tabs scroll-area breadcrumb avatar
```

### 4.2 CSS variable bridge

Add the following to `:root` in `src/app/globals.css` so shadcn components automatically adopt SOPAT's brand palette:

```css
/* shadcn ↔ SOPAT token bridge */
--background:          var(--admin-bg);
--foreground:          var(--admin-text);
--primary:             var(--green);
--primary-foreground:  var(--ivory);
--secondary:           var(--admin-bg);
--secondary-foreground: var(--admin-text-muted);
--muted:               var(--admin-bg);
--muted-foreground:    var(--admin-text-muted);
--accent:              var(--admin-accent-dim);
--accent-foreground:   var(--admin-accent);
--destructive:         var(--admin-red);
--destructive-foreground: #fff;
--border:              var(--admin-border);
--input:               var(--admin-border);
--ring:                var(--admin-border-light);
--card:                var(--admin-surface);
--card-foreground:     var(--admin-text);
--popover:             var(--admin-surface);
--popover-foreground:  var(--admin-text);
--radius:              0.75rem;
```

### 4.3 Fade-in animation

Add to `globals.css`:

```css
.admin-fade-in {
  animation: adminFadeIn 0.15s ease-out;
}
@keyframes adminFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Apply `.admin-fade-in` to:
- `<main>` in `src/app/admin/(dashboard)/layout.tsx`
- shadcn `Sheet` content wrapper
- `EmptyState` component

---

## 5. Sidebar Redesign

**File:** `src/components/AdminNav.tsx`

### 5.1 Lucide icon mapping

Replace emoji strings in `NAV_GROUPS` with Lucide icon components. Add an `icon` field of type `LucideIcon` to `NavItem`:

| Route | Lucide Icon |
|---|---|
| `/admin` (dashboard) | `LayoutDashboard` |
| `/admin/projects` | `FolderOpen` |
| `/admin/clients` | `Building2` |
| `/admin/nc` | `AlertTriangle` |
| `/admin/audits` | `ClipboardCheck` |
| `/admin/documents` | `FileText` |
| `/admin/suppliers` | `Leaf` |
| `/admin/design/concepts` | `Palette` |
| `/admin/design/templates` | `Layout` |
| `/admin/rse/partnerships` | `Handshake` |
| `/admin/rse/events` | `Sparkles` |
| `/admin/rse/impact` | `BarChart2` |
| `/admin/direction/achievements` | `Trophy` |
| `/admin/direction/portfolio` | `BookOpen` |
| `/admin/settings/currencies` | `Coins` |
| `/admin/calendrier-entretien` | `CalendarDays` |
| `/admin/reports` | `BarChart3` |
| `/admin/team` | `Users` |
| `/admin/settings` | `Settings` |

### 5.2 Active state enhancement

Current: emerald text + `--admin-emerald-dim` background.  
New: keep existing colors + add `border-l-[3px] border-[var(--admin-emerald)]` on the active link + `font-semibold` (instead of `font-medium`).

Inactive: `border-l-[3px] border-transparent` to maintain consistent horizontal alignment.

### 5.3 Group separators

Add a shadcn `Separator` above each nav group that has a `label` (except the first unlabeled group). Currently groups are separated by `mt-3` margin only.

### 5.4 User chip in sidebar footer

Above the "ISO 9001:2015 / v1.0" footer text, add a small user row:
- shadcn `Avatar` (size `w-7 h-7`) with initials fallback (first letter of `session.name`)
- User name in `text-xs font-medium`
- Role label in `text-xs text-[var(--admin-text-muted)]`

This requires passing `name` and `role` props to `AdminNav` (already receives `role`, add `name: string`).

### 5.5 Mobile Sheet sidebar

The sidebar is currently `hidden lg:flex`. Add a mobile trigger:
- In the header (see Section 6), a `Menu` Lucide icon button shown on `< lg` screens.
- Clicking it opens a shadcn `Sheet` (side="left", width matches sidebar `w-56`).
- Sheet content is the same `<nav>` markup as the desktop sidebar — extract nav content into a shared `<AdminNavContent>` sub-component used by both.
- Sheet state (`open`/`setOpen`) lives in the header component.

---

## 6. Header Redesign

**File:** `src/app/admin/(dashboard)/layout.tsx`  
**New file:** `src/components/AdminHeader.tsx` (client component)

Extract the header into its own client component `AdminHeader` that receives `{ name, role }` props from the server layout.

### 6.1 Left side — Breadcrumbs

Use shadcn `Breadcrumb` + `BreadcrumbList` + `BreadcrumbItem` + `BreadcrumbLink` + `BreadcrumbSeparator` + `BreadcrumbPage`.

Create a `useBreadcrumbs()` hook (or inline logic) that maps `usePathname()` segments to French labels:

```ts
const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  projects: 'Projets',
  clients: 'Clients',
  nc: 'Non-conformités',
  audits: 'Audits',
  documents: 'Documents',
  suppliers: 'Fournisseurs',
  design: 'Design',
  concepts: 'Concepts',
  templates: 'Modèles',
  rse: 'RSE',
  partnerships: 'Partenariats',
  events: 'Événements',
  impact: 'Impact RSE',
  direction: 'Direction',
  achievements: 'Réalisations',
  portfolio: 'Portfolio',
  reports: 'Rapports',
  team: 'Équipe',
  settings: 'Paramètres',
  currencies: 'Devises',
  ml: 'Modèle ML',
  new: 'Nouveau',
  'calendrier-entretien': 'Calendrier visites',
}
```

Dynamic segments (`[id]`) are skipped or shown as the raw value. Max 3 breadcrumb levels shown.

Show breadcrumbs on `lg:` screens only (hidden on mobile where space is limited).

### 6.2 Mobile hamburger

On `< lg` screens, show a `Menu` Lucide icon button on the left of the header that triggers the Sheet sidebar (state lifted to `AdminHeader`).

### 6.3 Right side — User dropdown

Replace the current `<span>{name} · {role}</span>` + `<LogoutButton>` with:

```
shadcn DropdownMenu
  Trigger: Avatar (w-8 h-8, initials) + name (hidden on mobile) + ChevronDown icon
  Content:
    DropdownMenuLabel: name + role label (small muted text)
    DropdownMenuSeparator
    DropdownMenuItem: "Paramètres" → links to /admin/settings (shown only for admin role)
    DropdownMenuSeparator
    DropdownMenuItem: LogoutButton (existing component, rendered inside the item)
```

The `LogoutButton` component is not modified — it's just placed inside a `DropdownMenuItem`.

### 6.4 Notifications bell

Add a `Bell` Lucide icon button between the breadcrumbs area and the user dropdown. No logic — purely a UI placeholder. `Button variant="ghost" size="icon"` with `relative` positioning for a future badge.

---

## 7. MetricCard Redesign

**File:** `src/components/dashboard/MetricCard.tsx`

### 7.1 Props additions (backward-compatible)

Add two optional props:
```ts
icon?: LucideIcon   // decorative icon shown top-right
```

All existing props (`title`, `value`, `subtitle`, `trend`, `isoClause`, `accent`, `children`) remain unchanged.

### 7.2 Visual changes

- **Top accent bar**: `h-1 w-full rounded-t-xl` div at the very top of the card, colored by `accent` prop. Sits outside the padding, flush with the card top edge. Implementation: wrap card content in relative div, add absolute top stripe OR use `border-t-[3px]` on the card itself.
- **Icon**: Rendered top-right, `w-4 h-4`, color `var(--admin-text-dim)`. Only shown if `icon` prop provided.
- **Value**: Add `tracking-tight leading-none` to the `text-3xl font-bold`.
- **Trend badge**: Wrap trend value in a small `<span>` with background pill: `px-1.5 py-0.5 rounded-full text-xs`. Add `TrendingUp` or `TrendingDown` Lucide icon (12px) before the number.
- **ISO clause**: Wrap in shadcn `Badge variant="outline"` with `text-[10px]`.
- **Hover**: Add `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default` to the card wrapper.
- **Min height**: `min-h-[140px]` on the card wrapper.

### 7.3 Dashboard page icon assignments

In `src/app/admin/(dashboard)/page.tsx`, pass icons to each MetricCard:
- Projets actifs → `FolderOpen`
- Livraison dans les délais → `Clock`
- Variance budgétaire → `TrendingUp`
- Non-conformités → `AlertTriangle`
- Taux clôture NC → `CheckCircle2`
- Visites maintenance → `CalendarDays`
- Satisfaction client → `Star`
- Partenariats RSE → `Handshake`
- Prochain renouvellement → `CalendarClock`

---

## 8. Dashboard Layout Upgrades

**File:** `src/app/admin/(dashboard)/page.tsx`

### 8.1 Section → Card

Replace the local `Section` component with shadcn `Card` + `CardHeader` + `CardTitle` + `CardContent`:
- `CardHeader`: `flex items-center justify-between py-3 px-5` with a bottom `Separator`.
- `CardTitle`: `text-sm font-semibold` (same size as current).
- Action links become `Button variant="ghost" size="sm"` with `ArrowRight` icon.

### 8.2 DashboardTabs → shadcn Tabs

Replace `DashboardTabs`'s custom tab bar with shadcn `Tabs` + `TabsList` + `TabsTrigger`. The tab keys and content are unchanged.

**File:** `src/components/dashboard/DashboardTabs.tsx`

### 8.3 Upcoming visits list

Each visit row: add a left-side colored date block:
- `bg-[var(--admin-emerald-dim)]` for future dates
- `bg-[var(--admin-amber-dim)]` for tomorrow
- `bg-[var(--admin-red-dim)]` for today

Already partially done — formalize it as a consistent pattern.

### 8.4 Empty states in dashboard

- Activity feed empty → `EmptyState` with `Activity` icon
- At-risk table empty → `EmptyState` with `ShieldCheck` icon + "Aucun projet à risque"
- Upcoming visits empty → `EmptyState` with `CalendarX` icon

---

## 9. Tables Redesign

**Files:** `ProjectsTable.tsx`, `NcPageClient.tsx`, `AuditsClient.tsx`

### 9.1 shadcn Table

Replace raw `<table>/<thead>/<tbody>/<tr>/<th>/<td>` with shadcn equivalents:
- `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>`
- All existing column definitions, data mapping, and conditional rendering stay identical.

### 9.2 Sticky header

Add `sticky top-0 z-10 bg-[var(--admin-surface)]` to `<TableHeader>`.

### 9.3 Zebra rows

On `<TableBody>` rows: `className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors duration-100"`.

### 9.4 Status badges → shadcn Badge

`PhaseBadge` (`src/components/projects/PhaseBadge.tsx`): replace the `<span>` with shadcn `Badge`. Keep all `LABELS` and `STYLES` color logic. Add `rounded-full` for pill shape.

NC status badges in `NcPageClient`: same treatment — replace `<span className={cn(...STATUS_COLORS...)}>` with `<Badge className={...}>`.

Audit status badges in `AuditsClient`: same.

### 9.5 Action column

In `NcPageClient`, replace `<Link className="text-xs underline">Voir</Link>` with:
```tsx
<Button variant="ghost" size="sm" asChild>
  <Link href={`/admin/nc/${nc.id}`}>
    <ArrowRight className="w-3.5 h-3.5" />
  </Link>
</Button>
```

### 9.6 Loading skeleton (TableSkeleton)

**New file:** `src/components/ui/TableSkeleton.tsx`

```tsx
// Props: { columns: number; rows?: number }
// Renders rows × columns grid of Skeleton blocks
// Default rows = 5
```

Used in `NcPageClient` and `AuditsClient` when `loading === true`, replacing the current custom spinner.

### 9.7 Empty state

Replace bare `<p>Aucun X trouvé</p>` with `<EmptyState>` component (Section 11).

---

## 10. Filters Bar Upgrade

**Files:** `ProjectsTable.tsx`, `NcPageClient.tsx`, `AuditsClient.tsx`

### 10.1 Wrapper card

Wrap all filter elements in:
```tsx
<div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border bg-[var(--admin-surface)]"
     style={{ borderColor: 'var(--admin-border)' }}>
  {/* filters */}
</div>
```

### 10.2 Select with chevron

Wrap each `<select>` in a `relative` div. Add `ChevronDown` Lucide icon (`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--admin-text-muted)]`). The `<select>` gets `appearance-none pr-8` to make room for the icon.

Do not change the `select`'s `value`, `onChange`, or options — purely cosmetic wrapper.

### 10.3 Search input with icon

Wrap the search `<input>` in a `relative` div. Add `Search` Lucide icon (`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]`). Add `pl-8` to the input. All event handlers unchanged.

### 10.4 Filter button

`<button onClick={loadNcs}>Filtrer</button>` → `<Button variant="outline" size="sm">Filtrer</Button>`.

### 10.5 Count badge

`<span>{total} projets</span>` → `<Badge variant="secondary">{total} projet{total !== 1 ? 's' : ''}</Badge>`.

---

## 11. Pagination Upgrade

**File:** `ProjectsTable.tsx` (only table with pagination currently)

```tsx
// Before
<button disabled={page <= 1} onClick={...}>Précédent</button>
<button disabled={page >= totalPages} onClick={...}>Suivant</button>

// After
<Button variant="outline" size="sm" disabled={page <= 1} onClick={...}>
  <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
</Button>
<Badge variant="outline">Page {page} sur {totalPages}</Badge>
<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={...}>
  Suivant <ChevronRight className="w-4 h-4 ml-1" />
</Button>
```

---

## 12. Forms Upgrade

**Files:** `NcPageClient.tsx`, `AuditsClient.tsx`, `SettingsClient.tsx`, and all form pages.

### 12.1 FormField / FF pattern

Upgrade the `FormField` helper in `NcPageClient` and `FF` helper in `SettingsClient`:

- Label: `text-xs font-medium text-[var(--admin-text)]` (slightly darker, not muted).
- Hint: prepend `<Info className="w-3 h-3 inline mr-1 text-[var(--admin-text-muted)]" />` before hint text.
- Error: replace `<p style={{ color: 'var(--admin-red)' }}>` with:
  ```tsx
  <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
       style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
    <AlertCircle className="w-4 h-4 shrink-0" />
    {errorMessage}
  </div>
  ```

### 12.2 Input focus ring

Add to all `<input>`, `<select>`, `<textarea>` in admin forms:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)] focus-visible:ring-offset-0
```
Remove existing `focus:outline-none focus:ring-2 focus:ring-green/20` (inconsistent).

### 12.3 Settings section accent

In `SettingsClient`, each `Section` component's header div gets:
```
border-l-4 border-[var(--admin-emerald)] pl-4
```
applied to the title text wrapper — visually chunks the settings form sections.

### 12.4 SaveButton → shadcn Button

Replace the `SaveButton` helper with:
```tsx
<Button type="submit" disabled={saving}>
  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement…</> : label}
</Button>
```

---

## 13. Drawers — NcPageClient Sheet

**File:** `src/app/admin/(dashboard)/nc/NcPageClient.tsx`

Replace the custom fixed-position drawer with shadcn `Sheet`:

```tsx
// State unchanged: showForm / setShowForm
<Sheet open={showForm} onOpenChange={setShowForm}>
  <SheetContent side="right" className="w-full max-w-lg flex flex-col">
    <SheetHeader>
      <SheetTitle>Créer une Non-Conformité</SheetTitle>
      <SheetDescription>ISO 9001:2015 · clause 10.2</SheetDescription>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
      {/* All existing form fields — unchanged */}
    </div>
    <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--admin-border)' }}>
      <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
        Annuler
      </Button>
      <Button className="flex-1" onClick={() => void handleCreate()} disabled={submitting}
              style={{ background: 'var(--admin-red)' }}>
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer la NC'}
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

The backdrop, close-on-click-outside, and ESC key are handled automatically by shadcn Sheet.

Same pattern applied to `AuditsClient` create form.

---

## 14. Settings Tabs → shadcn Tabs

**File:** `src/app/admin/(dashboard)/settings/SettingsClient.tsx`

Replace the custom `border-b-2 -mb-px` tab bar with:
```tsx
<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
  <TabsList>
    <TabsTrigger value="company">Société</TabsTrigger>
    <TabsTrigger value="smtp">SMTP</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="company"><CompanySection ... /></TabsContent>
  <TabsContent value="smtp"><SmtpSection ... /></TabsContent>
  <TabsContent value="notifications"><NotificationsSection ... /></TabsContent>
</Tabs>
```

State management (`useState<tab>`) remains identical.

---

## 15. Shared UI Components

### 15.1 EmptyState

**New file:** `src/components/ui/EmptyState.tsx`

```tsx
type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}
// Renders: centered column, icon (w-10 h-10 text-[var(--admin-text-dim)]),
//          title (text-sm font-medium), description (text-xs muted), action
// Applies admin-fade-in class
```

### 15.2 TableSkeleton

**New file:** `src/components/ui/TableSkeleton.tsx`

```tsx
type Props = { columns: number; rows?: number }
// Renders a <Table> shell with `rows` (default 5) TableRows,
// each containing `columns` TableCells with <Skeleton className="h-4 w-full" />
```

### 15.3 MetricCardSkeleton

**New file:** `src/components/ui/MetricCardSkeleton.tsx`

```tsx
// Renders a Card with:
// - Skeleton h-3 w-24 (title line)
// - Skeleton h-8 w-16 mt-2 (value)
// - Skeleton h-3 w-32 mt-1 (subtitle)
```

Used in `src/app/admin/(dashboard)/loading.tsx`.

---

## 16. File Change Map

| File | Change Type |
|---|---|
| `src/app/globals.css` | Add shadcn token bridge + admin-fade-in |
| `src/components/AdminNav.tsx` | Lucide icons, active border, Separator, user chip, extract NavContent |
| `src/components/AdminHeader.tsx` | NEW — breadcrumbs, hamburger, user dropdown, bell |
| `src/app/admin/(dashboard)/layout.tsx` | Use AdminHeader, pass name+role, add fade-in to main |
| `src/components/dashboard/MetricCard.tsx` | Add icon prop, accent bar, trend pill, hover, min-height |
| `src/components/dashboard/DashboardTabs.tsx` | shadcn Tabs |
| `src/components/dashboard/ActivityFeed.tsx` | EmptyState |
| `src/components/dashboard/AtRiskTable.tsx` | EmptyState |
| `src/app/admin/(dashboard)/page.tsx` | shadcn Card for sections, pass icons to MetricCard |
| `src/app/admin/(dashboard)/projects/ProjectsTable.tsx` | shadcn Table, filters bar, pagination, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/nc/NcPageClient.tsx` | shadcn Table, Sheet drawer, filters bar, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/audits/AuditsClient.tsx` | shadcn Table, Sheet drawer, filters bar, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/settings/SettingsClient.tsx` | shadcn Tabs, SaveButton → Button+Loader2, section accents |
| `src/components/projects/PhaseBadge.tsx` | shadcn Badge, rounded-full |
| `src/components/ui/EmptyState.tsx` | NEW |
| `src/components/ui/TableSkeleton.tsx` | NEW |
| `src/components/ui/MetricCardSkeleton.tsx` | NEW |
| `src/app/admin/(dashboard)/loading.tsx` | Use MetricCardSkeleton |

---

## 17. Implementation Order

1. **Foundation**: CSS token bridge, admin-fade-in, install shadcn components.
2. **Shared UI**: `EmptyState`, `TableSkeleton`, `MetricCardSkeleton`.
3. **Sidebar**: Lucide icons, active border, Separator, user chip, extract NavContent.
4. **Header**: `AdminHeader` component — breadcrumbs, hamburger, user dropdown.
5. **Layout**: Wire AdminHeader into dashboard layout, add fade-in to main.
6. **MetricCard**: Icon prop, accent bar, trend pill, hover, min-height.
7. **Dashboard page**: shadcn Card sections, pass icons, DashboardTabs upgrade.
8. **PhaseBadge**: shadcn Badge.
9. **ProjectsTable**: shadcn Table + filters + pagination + EmptyState + TableSkeleton.
10. **NcPageClient**: shadcn Table + Sheet drawer + filters + EmptyState + TableSkeleton.
11. **AuditsClient**: shadcn Table + Sheet drawer + filters + EmptyState + TableSkeleton.
12. **SettingsClient**: shadcn Tabs, SaveButton, section accents.

---

## 18. Quality Checklist

- [ ] All existing role-based nav filtering works identically.
- [ ] All forms submit correctly (no logic changes).
- [ ] All API calls (`/api/nc`, `/api/audits`, `/api/settings`) fire unchanged.
- [ ] Mobile layout: sidebar Sheet opens/closes correctly.
- [ ] Breadcrumbs render correctly for all admin routes.
- [ ] Tables paginate correctly.
- [ ] Filters update URL params correctly.
- [ ] Loading skeletons show during async operations.
- [ ] Empty states show when data is absent.
- [ ] shadcn Sheets close on backdrop click and ESC key.
- [ ] No TypeScript errors introduced.
- [ ] No horizontal scrolling on any viewport.
