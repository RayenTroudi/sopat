# Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the SOPAT admin panel presentation layer to feel like Stripe/Linear/Vercel — preserving 100% of existing functionality and brand palette.

**Architecture:** Incremental layer approach — wire shadcn/ui CSS variables to existing `--admin-*` tokens, install shadcn components, then progressively replace raw HTML elements with shadcn equivalents. Zero changes to business logic, API calls, server actions, or state management.

**Tech Stack:** Next.js 16 App Router, TypeScript, TailwindCSS v4, shadcn/ui (to be installed), Lucide React (already installed as `lucide-react ^1.17.0`).

## Global Constraints

- ONLY modify presentation layer — no changes to API routes, server actions, DB queries, auth, or state management
- Do NOT rename any existing variables, hooks, functions, or state — purely cosmetic wrappers
- Do NOT change business logic: role filtering, ISO clause references, budget logic, form submit handlers
- Do NOT add dark mode
- TailwindCSS v4 syntax: uses `@import "tailwindcss"` and `@theme inline` block — no `tailwind.config.js`
- All `--admin-*` CSS variables are defined in `:root` in `src/app/globals.css`
- shadcn/ui `components.json` is already configured at project root; `style: "default"`, `cssVariables: true`
- Only two shadcn components exist today: `src/components/ui/Toast.tsx` and `src/components/ui/Skeleton.tsx`
- `lucide-react ^1.17.0` is already in `dependencies` — import icons directly from `lucide-react`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Add shadcn token bridge + admin-fade-in animation |
| `src/components/ui/EmptyState.tsx` | Create | Shared empty-state component |
| `src/components/ui/TableSkeleton.tsx` | Create | Shared table loading skeleton |
| `src/components/ui/MetricCardSkeleton.tsx` | Create | Shared metric card loading skeleton |
| `src/components/AdminNav.tsx` | Modify | Lucide icons, active border, Separator, user chip, mobile Sheet |
| `src/components/AdminHeader.tsx` | Create | Breadcrumbs, hamburger, bell, user dropdown |
| `src/app/admin/(dashboard)/layout.tsx` | Modify | Use AdminHeader, pass name, add fade-in to main |
| `src/components/dashboard/MetricCard.tsx` | Modify | icon prop, accent bar, trend pill, hover, min-height |
| `src/components/dashboard/DashboardTabs.tsx` | Modify | shadcn Tabs |
| `src/components/dashboard/ActivityFeed.tsx` | Modify | EmptyState |
| `src/components/dashboard/AtRiskTable.tsx` | Modify | EmptyState |
| `src/app/admin/(dashboard)/page.tsx` | Modify | shadcn Card sections, pass icons to MetricCard |
| `src/components/projects/PhaseBadge.tsx` | Modify | shadcn Badge + rounded-full |
| `src/app/admin/(dashboard)/projects/ProjectsTable.tsx` | Modify | shadcn Table, filters bar, pagination, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/nc/NcPageClient.tsx` | Modify | shadcn Table, Sheet drawer, filters, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/audits/AuditsClient.tsx` | Modify | shadcn Table, Sheet drawer, filters, EmptyState, TableSkeleton |
| `src/app/admin/(dashboard)/settings/SettingsClient.tsx` | Modify | shadcn Tabs, SaveButton→Button+Loader2, section accents |

---

## Task 1: Install shadcn/ui Components

**Files:**
- Run: `npx shadcn@latest add` (multiple components)

**Interfaces:**
- Produces: `src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `sheet.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `separator.tsx`, `skeleton.tsx`, `tabs.tsx`, `scroll-area.tsx`, `breadcrumb.tsx`, `avatar.tsx` — all in `src/components/ui/`

- [ ] **Step 1: Install all shadcn components**

Run each command and accept prompts (overwrite existing skeleton is OK):

```bash
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add tabs
npx shadcn@latest add breadcrumb
npx shadcn@latest add avatar
```

Expected: each command creates/overwrites a file in `src/components/ui/`. No TypeScript errors.

- [ ] **Step 2: Verify files exist**

```bash
ls src/components/ui/
```

Expected output includes: `button.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `skeleton.tsx`, `tabs.tsx`, `breadcrumb.tsx`, `avatar.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): install shadcn/ui component primitives"
```

---

## Task 2: Foundation — CSS Token Bridge + Fade-in

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: shadcn components auto-adopt SOPAT palette via CSS variable bridge; `.admin-fade-in` utility class

- [ ] **Step 1: Add shadcn token bridge to globals.css**

In `src/app/globals.css`, inside the existing `:root { ... }` block (after all `--admin-*` vars, before the closing `}`), add:

```css
  /* shadcn ↔ SOPAT token bridge */
  --background:           var(--admin-bg);
  --foreground:           var(--admin-text);
  --primary:              var(--green);
  --primary-foreground:   var(--ivory);
  --secondary:            var(--admin-bg);
  --secondary-foreground: var(--admin-text-muted);
  --muted:                var(--admin-bg);
  --muted-foreground:     var(--admin-text-muted);
  --accent:               var(--admin-accent-dim);
  --accent-foreground:    var(--admin-accent);
  --destructive:          var(--admin-red);
  --destructive-foreground: #fff;
  --border:               var(--admin-border);
  --input:                var(--admin-border);
  --ring:                 var(--admin-border-light);
  --card:                 var(--admin-surface);
  --card-foreground:      var(--admin-text);
  --popover:              var(--admin-surface);
  --popover-foreground:   var(--admin-text);
  --radius:               0.75rem;
```

- [ ] **Step 2: Add admin-fade-in animation to globals.css**

After the `/* ─── Admin utility ─── */` section (around line 148), add:

```css
/* ─── Admin page transition ─── */
.admin-fade-in {
  animation: adminFadeIn 0.15s ease-out;
}
@keyframes adminFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Verify no build errors**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): add shadcn token bridge and admin-fade-in animation"
```

---

## Task 3: Shared UI Components — EmptyState, TableSkeleton, MetricCardSkeleton

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/TableSkeleton.tsx`
- Create: `src/components/ui/MetricCardSkeleton.tsx`

**Interfaces:**
- `EmptyState`: `({ icon: LucideIcon, title: string, description?: string, action?: React.ReactNode }) => JSX.Element`
- `TableSkeleton`: `({ columns: number, rows?: number }) => JSX.Element` — default rows = 5
- `MetricCardSkeleton`: `() => JSX.Element`

- [ ] **Step 1: Create EmptyState.tsx**

```tsx
// src/components/ui/EmptyState.tsx
import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="admin-fade-in flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <Icon className="w-10 h-10" style={{ color: 'var(--admin-text-dim)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>
      )}
      {action}
    </div>
  )
}
```

- [ ] **Step 2: Create TableSkeleton.tsx**

```tsx
// src/components/ui/TableSkeleton.tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

type Props = { columns: number; rows?: number }

export function TableSkeleton({ columns, rows = 5 }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}><Skeleton className="h-3 w-20" /></TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 3: Create MetricCardSkeleton.tsx**

```tsx
// src/components/ui/MetricCardSkeleton.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricCardSkeleton() {
  return (
    <Card className="min-h-[140px] p-5">
      <CardContent className="p-0 space-y-2 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16 mt-2" />
        <Skeleton className="h-3 w-32 mt-1" />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/EmptyState.tsx src/components/ui/TableSkeleton.tsx src/components/ui/MetricCardSkeleton.tsx
git commit -m "feat(ui): add EmptyState, TableSkeleton, MetricCardSkeleton shared components"
```

---

## Task 4: Sidebar Redesign — AdminNav.tsx

**Files:**
- Modify: `src/components/AdminNav.tsx`

**Interfaces:**
- Consumes: `UserRole` (existing import), `cn` (existing import), `Separator` from `@/components/ui/separator`, Lucide icons from `lucide-react`
- Produces: `AdminNav({ role, name }: { role?: UserRole; name?: string })` — adds optional `name` prop; exports `AdminNavContent` as named export for use in mobile Sheet

- [ ] **Step 1: Rewrite AdminNav.tsx**

Replace the entire file content with:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth-utils'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, FolderOpen, Building2, AlertTriangle, ClipboardCheck,
  FileText, Leaf, Palette, Layout, Handshake, Sparkles, BarChart2,
  Trophy, BookOpen, Coins, CalendarDays, BarChart3, Users, Settings,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  href:   string
  label:  string
  icon:   LucideIcon
  roles?: UserRole[]
  exact?: boolean
}

type NavGroup = {
  label?: string
  roles?: UserRole[]
  items:  NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/admin',           label: 'Tableau de bord',        icon: LayoutDashboard, exact: true },
      { href: '/admin/projects',  label: 'Projets',                icon: FolderOpen },
      { href: '/admin/clients',   label: 'Clients',                icon: Building2, roles: ['admin','direction','etudes_chef','realisation_chef'] },
    ],
  },
  {
    label: 'Qualité',
    items: [
      { href: '/admin/nc',        label: 'Non-conformités',        icon: AlertTriangle,   roles: ['admin','direction','etudes_chef','realisation_chef','entretien_chef'] },
      { href: '/admin/audits',    label: 'Audits',                 icon: ClipboardCheck,  roles: ['admin','direction'] },
      { href: '/admin/documents', label: 'Inf. Documentées',       icon: FileText,        roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'Études & terrain',
    items: [
      { href: '/admin/suppliers',          label: 'Fournisseurs',          icon: Leaf,    roles: ['admin','direction','etudes_chef','realisation_chef'] },
      { href: '/admin/design/concepts',    label: 'Bibliothèque de concepts', icon: Palette, roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/design/templates',   label: 'Modèles de concepts',   icon: Layout,  roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'RSE',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/rse/partnerships', label: 'Partenariats',   icon: Handshake,  roles: ['admin','direction'] },
      { href: '/admin/rse/events',       label: 'Événements',     icon: Sparkles,   roles: ['admin','direction'] },
      { href: '/admin/rse/impact',       label: 'Impact RSE',     icon: BarChart2,  roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Direction',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/direction/achievements', label: 'Réalisations',     icon: Trophy,    roles: ['admin','direction'] },
      { href: '/admin/direction/portfolio',    label: 'Portfolio Export', icon: BookOpen,  roles: ['admin','direction'] },
      { href: '/admin/rse/impact',             label: 'Rapport RSE',      icon: BarChart2, roles: ['admin','direction'] },
      { href: '/admin/settings/currencies',    label: 'Métriques devise', icon: Coins,     roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Entretien',
    items: [
      { href: '/admin/calendrier-entretien', label: 'Calendrier visites', icon: CalendarDays, roles: ['admin','direction','entretien_chef','entretien_team'] },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { href: '/admin/reports', label: 'Rapports', icon: BarChart3, roles: ['admin','direction','realisation_chef','entretien_chef'] },
    ],
  },
  {
    label: 'Administration',
    roles: ['admin'],
    items: [
      { href: '/admin/team',     label: 'Équipe',      icon: Users,    roles: ['admin'] },
      { href: '/admin/settings', label: 'Paramètres',  icon: Settings, roles: ['admin'] },
    ],
  },
]

function initials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function AdminNavContent({ role, name, onNavigate }: { role?: UserRole; name?: string; onNavigate?: () => void }) {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  function itemVisible(item: NavItem): boolean {
    if (!role) return true
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  function groupVisible(g: NavGroup): boolean {
    if (role && g.roles && !g.roles.includes(role)) return false
    return g.items.some(itemVisible)
  }

  const visibleGroups = NAV_GROUPS.filter(groupVisible)

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
        <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--admin-text)' }}>SOPAT</span>
        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Admin</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((g, gi) => {
          const showSeparator = gi > 0 && g.label
          return (
            <div key={(g.label ?? 'top') + '-' + gi} className={gi > 0 ? 'mt-2' : ''}>
              {showSeparator && <Separator className="mb-2 mx-1" style={{ background: 'var(--admin-border)' }} />}
              {g.label && (
                <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--admin-text-dim)' }}>
                  {g.label}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.filter(itemVisible).map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href + '-' + item.label}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-[3px]',
                        active
                          ? 'font-semibold'
                          : 'font-medium hover:bg-[var(--admin-bg)]'
                      )}
                      style={{
                        color:       active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                        background:  active ? 'var(--admin-emerald-dim)' : 'transparent',
                        borderColor: active ? 'var(--admin-emerald)' : 'transparent',
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        {name && (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
            >
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--admin-text)' }}>{name}</p>
            </div>
          </div>
        )}
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)' }}>v1.0 · SOPAT Admin</p>
      </div>
    </>
  )
}

export function AdminNav({ role, name }: { role?: UserRole; name?: string }) {
  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{ background: 'var(--admin-surface)', borderRight: '1px solid var(--admin-border)' }}
    >
      <AdminNavContent role={role} name={name} />
    </aside>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminNav.tsx
git commit -m "feat(sidebar): Lucide icons, active border accent, group separators, user chip"
```

---

## Task 5: New AdminHeader Component

**Files:**
- Create: `src/components/AdminHeader.tsx`

**Interfaces:**
- Consumes: `AdminNavContent` from `@/components/AdminNav`, `LogoutButton` from `@/components/auth/LogoutButton`, `UserRole` and `ROLE_LABELS` from `@/lib/auth-utils`, shadcn `Sheet`, `Breadcrumb*`, `DropdownMenu*`, `Avatar*`, `Button`
- Produces: `AdminHeader({ name: string, role: UserRole })` — client component; manages Sheet open state internally

- [ ] **Step 1: Create AdminHeader.tsx**

```tsx
// src/components/AdminHeader.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AdminNavContent } from '@/components/AdminNav'
import LogoutButton from '@/components/auth/LogoutButton'
import { ROLE_LABELS } from '@/lib/auth-utils'
import type { UserRole } from '@/lib/auth-utils'

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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  // Always starts with 'admin', show up to 3 levels
  const crumbs: { label: string; href: string; isLast: boolean }[] = []
  let path = ''
  for (let i = 0; i < Math.min(segments.length, 3); i++) {
    path += '/' + segments[i]
    const label = SEGMENT_LABELS[segments[i]] ?? segments[i]
    crumbs.push({ label, href: path, isLast: i === segments.length - 1 || i === 2 })
  }
  return crumbs
}

type Props = { name: string; role: UserRole }

export function AdminHeader({ name, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const crumbs = useBreadcrumbs(pathname)

  return (
    <header
      className="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30"
      style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
    >
      {/* Left: hamburger (mobile) + breadcrumbs (desktop) */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <Breadcrumb className="hidden lg:flex">
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: bell + user dropdown */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                {name}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{name}</p>
              <p className="text-xs font-normal mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                {ROLE_LABELS[role]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === 'admin' && (
              <DropdownMenuItem asChild>
                <a href="/admin/settings" className="cursor-pointer text-sm">Paramètres</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <div className="cursor-pointer">
                <LogoutButton className="w-full text-left text-sm" />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-56 p-0 flex flex-col" style={{ background: 'var(--admin-surface)' }}>
          <AdminNavContent role={role} name={name} onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminHeader.tsx
git commit -m "feat(header): add AdminHeader with breadcrumbs, user dropdown, mobile Sheet"
```

---

## Task 6: Wire AdminHeader into Dashboard Layout

**Files:**
- Modify: `src/app/admin/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `AdminHeader` from `@/components/AdminHeader` (new), `AdminNav` from `@/components/AdminNav` (updated to accept `name`)
- Change: pass `session.name` to both `AdminNav` and `AdminHeader`; replace the inline `<header>` with `<AdminHeader>`; add `admin-fade-in` class to `<main>`

- [ ] **Step 1: Update layout.tsx**

Replace the entire file with:

```tsx
import { requireAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { AdminNav } from '@/components/AdminNav'
import { AdminHeader } from '@/components/AdminHeader'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()

  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}>
        <AdminNav role={session.role} name={session.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader name={session.name} role={session.role} />
          <main className="flex-1 p-6 admin-fade-in" style={{ background: 'var(--admin-bg)' }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/layout.tsx
git commit -m "feat(layout): wire AdminHeader, pass name to AdminNav, add fade-in to main"
```

---

## Task 7: MetricCard Redesign

**Files:**
- Modify: `src/components/dashboard/MetricCard.tsx`

**Interfaces:**
- Produces: `MetricCard({ title, value, subtitle?, trend?, isoClause?, accent?, icon?, children? })` — adds optional `icon?: LucideIcon`
- All callers in `page.tsx` that do NOT pass `icon` continue working unchanged

- [ ] **Step 1: Rewrite MetricCard.tsx**

Replace the entire file:

```tsx
import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

type Trend = { value: number; suffix?: string }

type Props = {
  title:      string
  value:      string | number
  subtitle?:  string
  trend?:     Trend
  isoClause?: string
  accent?:    'green' | 'amber' | 'red' | 'blue' | 'muted'
  icon?:      LucideIcon
  children?:  React.ReactNode
}

export function MetricCard({ title, value, subtitle, trend, isoClause, accent = 'green', icon: Icon, children }: Props) {
  const accentColors = {
    green:  { text: 'var(--admin-emerald)', bg: 'var(--admin-emerald-dim)', bar: 'var(--admin-emerald)' },
    amber:  { text: 'var(--admin-amber)',   bg: 'var(--admin-amber-dim)',   bar: 'var(--admin-amber)'   },
    red:    { text: 'var(--admin-red)',     bg: 'var(--admin-red-dim)',     bar: 'var(--admin-red)'     },
    blue:   { text: 'var(--admin-blue)',    bg: 'var(--admin-blue-dim)',    bar: 'var(--admin-blue)'    },
    muted:  { text: 'var(--admin-text-muted)', bg: 'var(--admin-bg)',      bar: 'var(--admin-border)'  },
  }
  const colors = accentColors[accent]

  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0
  const trendColor = trendPositive
    ? 'var(--admin-red)'
    : trendNegative ? 'var(--admin-emerald)' : 'var(--admin-text-muted)'

  return (
    <div
      className="rounded-xl border overflow-hidden min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {/* Top accent bar */}
      <div className="h-1 shrink-0" style={{ background: colors.bar }} />

      {/* Content */}
      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              {title}
            </p>
            {isoClause && (
              <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0" style={{ color: 'var(--admin-text-muted)', borderColor: 'var(--admin-border)' }}>
                ISO {isoClause}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {trend !== undefined && (
              <span
                className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: trendColor, background: trendPositive ? 'var(--admin-red-dim)' : trendNegative ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)' }}
              >
                {trendPositive
                  ? <TrendingUp className="w-3 h-3" />
                  : trendNegative ? <TrendingDown className="w-3 h-3" /> : null}
                {trend.value > 0 ? '+' : ''}{trend.value}{trend.suffix ?? ''}
              </span>
            )}
            {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--admin-text-dim)' }} />}
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold tabular-nums tracking-tight leading-none" style={{ color: colors.text }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/MetricCard.tsx
git commit -m "feat(metric-card): add icon prop, accent bar, trend pill, hover lift, min-height"
```

---

## Task 8: Dashboard Page — shadcn Cards + Icons + DashboardTabs

**Files:**
- Modify: `src/app/admin/(dashboard)/page.tsx`
- Modify: `src/components/dashboard/DashboardTabs.tsx`
- Modify: `src/components/dashboard/ActivityFeed.tsx`
- Modify: `src/components/dashboard/AtRiskTable.tsx`

**Interfaces:**
- Consumes: `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card`; `Separator` from `@/components/ui/separator`; `Button` from `@/components/ui/button`; `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`; `EmptyState` from `@/components/ui/EmptyState`; Lucide icons

- [ ] **Step 1: Update DashboardTabs.tsx to use shadcn Tabs**

Replace the file:

```tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InternationalDashboard } from './InternationalDashboard'
import type { CountryProjectSummary } from '@/lib/db/international'

type Props = {
  mainContent:        React.ReactNode
  internationalData:  CountryProjectSummary[]
  hasForeignProjects: boolean
}

export function DashboardTabs({ mainContent, internationalData, hasForeignProjects }: Props) {
  if (!hasForeignProjects) {
    return <>{mainContent}</>
  }

  return (
    <Tabs defaultValue="main" className="space-y-4">
      <TabsList>
        <TabsTrigger value="main">Vue générale</TabsTrigger>
        <TabsTrigger value="international">🌍 International</TabsTrigger>
      </TabsList>
      <TabsContent value="main">{mainContent}</TabsContent>
      <TabsContent value="international">
        <InternationalDashboard data={internationalData} />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Add EmptyState to ActivityFeed**

Read the current file first, then find the empty check. The file is `src/components/dashboard/ActivityFeed.tsx`. Locate the block that renders when `entries.length === 0` (currently a bare `<p>` or nothing). Replace just that block with:

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { Activity } from 'lucide-react'

// Inside the component, where entries is empty:
if (entries.length === 0) {
  return <EmptyState icon={Activity} title="Aucune activité récente" />
}
```

Read the file to confirm the exact current structure before editing. Add the import at the top and replace whatever empty-state rendering exists.

- [ ] **Step 3: Add EmptyState to AtRiskTable**

Read `src/components/dashboard/AtRiskTable.tsx`. Locate the empty-state block. Replace it with:

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck } from 'lucide-react'

// Where projects is empty:
if (projects.length === 0) {
  return <EmptyState icon={ShieldCheck} title="Aucun projet à risque" description="Tous les projets sont dans les délais et dans le budget." />
}
```

- [ ] **Step 4: Update dashboard page.tsx — Section → Card + MetricCard icons**

In `src/app/admin/(dashboard)/page.tsx`, make the following changes:

**A. Add imports** (add alongside existing imports):
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle, CheckCircle2,
  CalendarDays, Star, Handshake, CalendarClock, ArrowRight,
} from 'lucide-react'
```

**B. Replace the local `Section` component** (lines 31–40 in current file) with:
```tsx
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-5 space-y-0">
        <CardTitle className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</CardTitle>
        {action}
      </CardHeader>
      <Separator style={{ background: 'var(--admin-border)' }} />
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  )
}
```

**C. Pass `icon` to each MetricCard** — find each `<MetricCard` call and add `icon={...}` prop:

| MetricCard `title` | Add `icon={}` |
|---|---|
| `"Projets actifs"` | `icon={FolderOpen}` |
| `"Livraison dans les délais"` | `icon={Clock}` |
| `"Variance budgétaire moy."` | `icon={TrendingUp}` |
| `"Non-conformités ouvertes"` | `icon={AlertTriangle}` |
| `"Taux clôture NC dans les délais"` | `icon={CheckCircle2}` |
| `"Visites maintenance ce mois"` | `icon={CalendarDays}` |
| `"Satisfaction client (12 mois)"` | `icon={Star}` |
| `"Partenariats RSE actifs"` | `icon={Handshake}` |
| `"Prochain renouvellement RSE"` | `icon={CalendarClock}` |

**D. Replace action links** — find the two `<Link href="..." className="text-xs">` action elements inside `Section` `action` prop. Replace with:
```tsx
// "Voir tous →" links become:
<Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
  <Link href="/admin/projects">Voir tous <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
</Button>
```

**E. Replace the visits empty state** — find this block in the visits section:
```tsx
<p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>
  Aucune visite planifiée dans les 7 prochains jours.
</p>
```
Replace with:
```tsx
import { CalendarX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState icon={CalendarX} title="Aucune visite planifiée" description="Pas de visite dans les 7 prochains jours." />
```
(Add the import at the top of the file.)

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/\(dashboard\)/page.tsx src/components/dashboard/DashboardTabs.tsx src/components/dashboard/ActivityFeed.tsx src/components/dashboard/AtRiskTable.tsx
git commit -m "feat(dashboard): shadcn Card sections, MetricCard icons, shadcn Tabs, EmptyStates"
```

---

## Task 9: PhaseBadge → shadcn Badge

**Files:**
- Modify: `src/components/projects/PhaseBadge.tsx`

**Interfaces:**
- Produces: `PhaseBadge({ status: string })` — same signature, same `LABELS`/`STYLES` logic, uses shadcn `Badge` instead of `<span>`

- [ ] **Step 1: Rewrite PhaseBadge.tsx**

Replace the entire file:

```tsx
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type Phase = 'draft' | 'etudes' | 'realisation' | 'entretien' | 'completed' | 'cancelled'

const LABELS: Record<Phase, string> = {
  draft:       'Brouillon',
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
  completed:   'Terminé',
  cancelled:   'Annulé',
}

const STYLES: Record<Phase, string> = {
  draft:       'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  etudes:      'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  realisation: 'bg-[var(--admin-green-dim)] text-green border-transparent',
  entretien:   'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)] border-transparent',
  completed:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
  cancelled:   'bg-[var(--admin-red-dim)] text-[var(--admin-red)] border-transparent',
}

export function PhaseBadge({ status }: { status: string }) {
  const phase = (status as Phase) in LABELS ? (status as Phase) : 'draft'
  return (
    <Badge className={cn('rounded-full text-xs font-medium', STYLES[phase])}>
      {LABELS[phase]}
    </Badge>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/PhaseBadge.tsx
git commit -m "feat(badge): migrate PhaseBadge to shadcn Badge with rounded-full pill"
```

---

## Task 10: ProjectsTable Redesign

**Files:**
- Modify: `src/app/admin/(dashboard)/projects/ProjectsTable.tsx`

**Interfaces:**
- Consumes: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table`; `Button` from `@/components/ui/button`; `Badge` from `@/components/ui/badge`; `EmptyState` from `@/components/ui/EmptyState`; `TableSkeleton` from `@/components/ui/TableSkeleton`; `Search`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `FolderOpen` from `lucide-react`
- All props, state, URL param logic, and data remain identical

- [ ] **Step 1: Rewrite ProjectsTable.tsx**

Replace the entire file:

```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronDown, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'
import { PhaseBadge } from '@/components/projects/PhaseBadge'
import { BudgetBadge } from '@/components/projects/BudgetBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProjectStatus } from '@/lib/db/projects'

type ProjectRow = {
  id: string
  reference: string
  name: string
  clientName: string
  status: string
  projectType: string
  approvedBudget: string | null
  country?: string | null
  currency?: string | null
  assignedEtudesChefId: string | null
  estimatedDeliveryDate: Date | null
  createdAt: Date
}

type Props = {
  rows: ProjectRow[]
  total: number
  page: number
  pageSize: number
}

const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie terr.',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

const TYPE_ICONS: Record<string, string> = {
  ingenierie_territoriale: '🗺️',
  espace_public:           '🌳',
  siege_social:            '🏢',
  hotelier_touristique:    '🏨',
  residentiel:             '🏡',
  interieur:               '🪴',
}

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'ingenierie_territoriale', label: '🗺️ Ingénierie territoriale' },
  { value: 'espace_public',           label: '🌳 Espace public' },
  { value: 'siege_social',            label: '🏢 Siège social' },
  { value: 'hotelier_touristique',    label: '🏨 Hôtelier & touristique' },
  { value: 'residentiel',             label: '🏡 Résidentiel' },
  { value: 'interieur',               label: '🪴 Intérieur' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'etudes', label: 'Études' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les pays' },
  { value: 'TN', label: '🇹🇳 Tunisie' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'CI', label: "🇨🇮 Côte d'Ivoire" },
  { value: 'MR', label: '🇲🇷 Mauritanie' },
  { value: 'OM', label: '🇴🇲 Oman' },
  { value: 'QA', label: '🇶🇦 Qatar' },
  { value: 'LY', label: '🇱🇾 Libye' },
]

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function fmt(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const selectClass = 'text-sm border rounded-lg pl-3 pr-8 py-2 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const selectStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

export function ProjectsTable({ rows, total, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)
  const currentStatus = searchParams.get('status') ?? ''

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div
        className="flex flex-wrap gap-2 items-center p-3 rounded-xl border"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        {/* Status select */}
        <div className="relative">
          <select value={currentStatus} onChange={(e) => updateParam('status', e.target.value)} className={selectClass} style={selectStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>

        {/* Type select */}
        <div className="relative">
          <select value={searchParams.get('projectType') ?? ''} onChange={(e) => updateParam('projectType', e.target.value)} className={selectClass} style={selectStyle}>
            {TYPE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>

        {/* Country select */}
        <div className="relative">
          <select value={searchParams.get('country') ?? ''} onChange={(e) => updateParam('country', e.target.value)} className={selectClass} style={selectStyle}>
            {COUNTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>

        <div className="ml-auto">
          <Badge variant="secondary">{total} projet{total !== 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {rows.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Aucun projet trouvé" description="Essayez de modifier vos filtres." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10" style={{ background: 'var(--admin-surface)' }}>
                <TableRow style={{ borderColor: 'var(--admin-border)' }}>
                  {['Réf.', 'Projet', 'Client', 'Type', 'Pays', 'Phase', 'Budget', 'Livraison est.', 'Créé le'].map((h) => (
                    <TableHead key={h} className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors duration-100"
                    style={{ borderColor: 'var(--admin-border)' }}
                  >
                    <TableCell className="font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>{row.reference}</TableCell>
                    <TableCell>
                      <Link href={`/admin/projects/${row.id}`} className="font-medium hover:underline" style={{ color: 'var(--admin-text)' }}>
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{row.clientName}</TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {TYPE_ICONS[row.projectType] ?? ''} {TYPE_LABELS[row.projectType] ?? row.projectType}
                    </TableCell>
                    <TableCell className="text-base text-center">{row.country ? countryFlag(row.country) : ''}</TableCell>
                    <TableCell><PhaseBadge status={row.status} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <BudgetBadge approved={row.approvedBudget} />
                        {row.approvedBudget && row.currency && (
                          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{row.currency}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{fmt(row.estimatedDeliveryDate)}</TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{fmt(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
          </Button>
          <Badge variant="outline">Page {page} sur {totalPages}</Badge>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))}>
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/projects/ProjectsTable.tsx
git commit -m "feat(projects-table): shadcn Table, filter bar, ChevronDown selects, shadcn pagination, EmptyState"
```

---

## Task 11: NcPageClient Redesign

**Files:**
- Modify: `src/app/admin/(dashboard)/nc/NcPageClient.tsx`

**Interfaces:**
- All state variables (`rows`, `showForm`, `filterStatus`, `filterProcess`, `search`, `loading`, `form`, `submitting`, `formError`) remain identical
- All event handlers (`loadNcs`, `handleCreate`) remain identical
- Replace: raw `<table>` with shadcn `Table`; custom fixed drawer with shadcn `Sheet`; spinner with `TableSkeleton`; bare empty paragraph with `EmptyState`; filter elements with icon-enhanced wrappers; `<button>Filtrer</button>` with `<Button>`; action `<Link>Voir</Link>` with `<Button variant="ghost">`

- [ ] **Step 1: Rewrite NcPageClient.tsx**

Replace the entire file:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, AlertTriangle, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NcListItem } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'

const STATUS_LABELS: Record<string, string> = {
  open:        'Ouvert',
  in_progress: 'En cours',
  closed:      'Clôturé',
  verified:    'Vérifié',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-[var(--admin-red-dim)] text-[var(--admin-red)] border-transparent',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  closed:      'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  verified:    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
}
const PROCESS_LABELS: Record<string, string> = {
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
}
const NC_TYPE_LABELS: Record<string, string> = {
  technique:          'Technique',
  documentaire:       'Doc.',
  reclamation_client: 'Réclamation client',
  audit:              'Audit',
  systeme:            'Système',
}

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string; email: string; role: string }

type Props = {
  initialRows:     NcListItem[]
  total:           number
  users:           User[]
  currentUserId:   string
  currentUserName: string
}

const selectClass = 'text-sm border rounded-lg pl-3 pr-8 py-1.5 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }
const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

export function NcPageClient({ initialRows, total, users, currentUserId, currentUserName }: Props) {
  const [rows, setRows]           = useState(initialRows)
  const [showForm, setShowForm]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)

  const [form, setForm] = useState({
    ncType:      '',
    ownerType:   '',
    auditorName: '',
    description: '',
    rootCause:   '',
    assignedTo:  '',
    deadline:    '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  async function loadNcs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus)  params.set('status',  filterStatus)
    if (filterProcess) params.set('process', filterProcess)
    if (search)        params.set('search',  search)
    const res = await fetch(`/api/nc?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: NcListItem[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.description.trim() || form.description.length < 10) {
      setFormError('La description doit comporter au moins 10 caractères')
      return
    }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/nc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ncType:      form.ncType || undefined,
        ownerType:   form.ownerType || undefined,
        auditorName: form.auditorName || undefined,
        description: form.description,
        rootCause:   form.rootCause || undefined,
        assignedTo:  form.assignedTo || undefined,
        deadline:    form.deadline ? new Date(form.deadline).toISOString() : undefined,
      }),
    })
    const data = await res.json() as { id?: string; error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ ncType: '', ownerType: '', auditorName: '', description: '', rootCause: '', assignedTo: '', deadline: '' })
    await loadNcs()
    setSubmitting(false)
  }

  const openCount = rows.filter((r) => r.status === 'open' || r.status === 'in_progress').length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Non-Conformités</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 10.2 · {openCount} ouverte{openCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ background: 'var(--admin-red)' }} className="text-white hover:opacity-90">
          + Créer une NC
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadNcs(), 0) }} className={selectClass} style={selectStyle}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>
        <div className="relative">
          <select value={filterProcess} onChange={(e) => { setFilterProcess(e.target.value); setTimeout(() => void loadNcs(), 0) }} className={selectClass} style={selectStyle}>
            <option value="">Tous processus</option>
            {Object.entries(PROCESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadNcs()}
            placeholder="Rechercher…"
            className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]"
            style={selectStyle}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadNcs()}>Filtrer</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {loading ? (
          <TableSkeleton columns={8} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Aucune non-conformité trouvée" description="Modifiez vos filtres ou créez une nouvelle NC." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10" style={{ background: 'var(--admin-surface)' }}>
                <TableRow style={{ borderColor: 'var(--admin-border)' }}>
                  {['Référence', 'Statut', 'Type', 'Description', 'Projet', 'Assigné à', 'Délai', ''].map((h) => (
                    <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((nc) => (
                  <TableRow
                    key={nc.id}
                    className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors duration-100"
                    style={{ borderColor: 'var(--admin-border)' }}
                  >
                    <TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{nc.reference}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs font-medium rounded-full', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                        {STATUS_LABELS[nc.status] ?? nc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {NC_TYPE_LABELS[(nc as any).ncType] ?? PROCESS_LABELS[(nc as any).processAffected] ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate text-sm" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{nc.projectName ?? '—'}</TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{nc.assignedToName ?? '—'}</TableCell>
                    <TableCell className="text-xs" style={{ color: nc.deadline && new Date(nc.deadline) < new Date() ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                      {nc.deadline ? fmt(nc.deadline) : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/nc/${nc.id}`}><ArrowRight className="w-3.5 h-3.5" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create NC Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
          <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Créer une Non-Conformité</SheetTitle>
            <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 10.2</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormField label="Type de NC">
              <select value={form.ncType} onChange={(e) => setForm((f) => ({ ...f, ncType: e.target.value }))} className={inputClass} style={inputStyle}>
                <option value="">-- Sélectionner --</option>
                {Object.entries(NC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Propriétaire">
              <select value={form.ownerType} onChange={(e) => setForm((f) => ({ ...f, ownerType: e.target.value }))} className={inputClass} style={inputStyle}>
                <option value="">-- Sélectionner --</option>
                <option value="interne">Interne</option>
                <option value="externe">Externe</option>
              </select>
            </FormField>
            {form.ncType === 'audit' && (
              <FormField label="Nom de l'auditeur">
                <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))} className={inputClass} style={inputStyle} placeholder="Nom de l'auditeur" />
              </FormField>
            )}
            <FormField label="Description de la non-conformité *">
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Décrivez précisément la non-conformité observée…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
            </FormField>
            <FormField label="Analyse des causes (optionnel)">
              <textarea value={form.rootCause} onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))} rows={2} placeholder="Cause(s) racine identifiée(s)…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
            </FormField>
            <FormField label="Assigné à">
              <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputClass} style={inputStyle}>
                <option value="">— Non assigné —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>
            <FormField label="Délai de traitement">
              <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className={inputClass} style={inputStyle} />
            </FormField>
            {formError && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting} style={{ background: 'var(--admin-red)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer la NC'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/nc/NcPageClient.tsx
git commit -m "feat(nc): shadcn Table, Sheet drawer, filter bar with icons, EmptyState, TableSkeleton"
```

---

## Task 12: AuditsClient Redesign

**Files:**
- Modify: `src/app/admin/(dashboard)/audits/AuditsClient.tsx`

**Interfaces:**
- All state (`rows`, `loading`, `showForm`, `filterStatus`, `editingId`, `editFindings`, `editScope`, `editStatus`, `editLoading`, `editError`, `form`, `submitting`, `formError`) remain identical
- All handlers (`loadAudits`, `handleCreate`, `startEdit`, `saveEdit`) remain identical
- Replace: custom fixed drawer with shadcn `Sheet`; spinner with inline skeleton-like loading; empty state with `EmptyState`; `<button>` elements with `<Button>`; status badges with shadcn `Badge`

- [ ] **Step 1: Rewrite AuditsClient.tsx**

Replace the entire file:

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ClipboardCheck, Loader2, AlertCircle } from 'lucide-react'
import type { AuditRow } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS_LABELS: Record<string, string> = {
  scheduled:   'Planifié',
  in_progress: 'En cours',
  completed:   'Clôturé',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  completed:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
}

const PROCESS_OPTIONS = [
  { value: 'etudes',      label: 'Études & Conception' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'entretien',   label: 'Entretien & Suivi' },
  { value: 'systeme',     label: 'Système qualité' },
  { value: 'direction',   label: 'Revue de direction' },
]
const PROCESS_MAP = Object.fromEntries(PROCESS_OPTIONS.map((p) => [p.value, p.label]))

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string }
type Props = {
  initialRows:   AuditRow[]
  total:         number
  users:         User[]
  isAdmin:       boolean
  currentUserId: string
}

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const selectClass = 'text-sm border rounded-lg pl-3 pr-8 py-1.5 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const filterSelectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

export function AuditsClient({ initialRows, total, users, isAdmin, currentUserId }: Props) {
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editFindings, setEditFindings] = useState('')
  const [editScope, setEditScope]       = useState('')
  const [editStatus, setEditStatus]     = useState('')
  const [editLoading, setEditLoading]   = useState(false)
  const [editError, setEditError]       = useState('')

  const [form, setForm] = useState({
    auditorId: currentUserId, auditDate: '', processAudited: 'etudes', scope: '', findings: '', status: 'scheduled',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  async function loadAudits() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/audits?${params}`)
    if (res.ok) setRows((await res.json() as { rows: AuditRow[] }).rows)
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.auditDate) { setFormError('La date est obligatoire'); return }
    if (!form.auditorId) { setFormError("L'auditeur est obligatoire"); return }
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/audits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, auditDate: new Date(form.auditDate).toISOString(), scope: form.scope || undefined, findings: form.findings || undefined }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ auditorId: currentUserId, auditDate: '', processAudited: 'etudes', scope: '', findings: '', status: 'scheduled' })
    await loadAudits()
    setSubmitting(false)
  }

  function startEdit(audit: AuditRow) {
    setEditingId(audit.id)
    setEditFindings(audit.findings ?? '')
    setEditScope(audit.scope ?? '')
    setEditStatus(audit.status)
    setEditError('')
  }

  async function saveEdit(auditId: string) {
    setEditLoading(true); setEditError('')
    if (editStatus === 'completed' && !editFindings.trim()) {
      setEditError('Les constats sont obligatoires pour clôturer un audit')
      setEditLoading(false); return
    }
    const res = await fetch(`/api/audits/${auditId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findings: editFindings || undefined, scope: editScope || undefined, status: editStatus }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setEditError(data.error ?? 'Erreur'); setEditLoading(false); return }
    setEditingId(null)
    await loadAudits()
    setEditLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Audits Internes</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 9.2 · {total} audit{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
            + Planifier un audit
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadAudits(), 0) }} className={selectClass} style={filterSelectStyle}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-muted)' }} />
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAudits()}>Actualiser</Button>
      </div>

      {/* Audit cards list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--admin-emerald)' }} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Aucun audit planifié" description="Créez votre premier audit interne ISO 9001:2015." />
        ) : rows.map((audit) => (
          <div key={audit.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            {/* Audit header */}
            <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-3" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{audit.reference}</span>
                <Badge className={cn('text-xs font-medium rounded-full', STATUS_COLORS[audit.status] ?? STATUS_COLORS.scheduled)}>
                  {STATUS_LABELS[audit.status] ?? audit.status}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {PROCESS_MAP[audit.processAudited] ?? audit.processAudited}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                <span>Auditeur : <strong>{audit.auditorName ?? '—'}</strong></span>
                <span>Date : {fmt(audit.auditDate)}</span>
                {audit.status !== 'completed' && isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => startEdit(audit)} className="text-xs h-7 px-2" style={{ color: 'var(--admin-blue)' }}>
                    {editingId === audit.id ? 'Annuler' : 'Modifier'}
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
            {editingId !== audit.id ? (
              <div className="px-5 py-4 space-y-3">
                {audit.scope && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>PÉRIMÈTRE</p>
                    <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{audit.scope}</p>
                  </div>
                )}
                {audit.findings ? (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>CONSTATS</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{audit.findings}</p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun constat enregistré.</p>
                )}
                {audit.completedAt && (
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Clôturé le {fmt(audit.completedAt)}</p>
                )}
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <FF label="Périmètre">
                  <textarea value={editScope} onChange={(e) => setEditScope(e.target.value)} rows={2} className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FF>
                <FF label="Constats *">
                  <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)} rows={4} placeholder="Constats d'audit, observations, points positifs et axes d'amélioration…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FF>
                <FF label="Statut">
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={cn(inputClass, 'pr-3')} style={inputStyle}>
                    <option value="scheduled">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Clôturé</option>
                  </select>
                </FF>
                {editError && (
                  <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />{editError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                  <Button size="sm" onClick={() => void saveEdit(audit.id)} disabled={editLoading} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
                    {editLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sauvegarde…</> : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create audit Sheet */}
      {isAdmin && (
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
            <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <SheetTitle style={{ color: 'var(--admin-text)' }}>Planifier un audit interne</SheetTitle>
              <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 9.2</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FF label="Auditeur *">
                <select value={form.auditorId} onChange={(e) => setForm(f => ({ ...f, auditorId: e.target.value }))} className={inputClass} style={inputStyle}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Date *">
                  <input type="date" value={form.auditDate} onChange={(e) => setForm(f => ({ ...f, auditDate: e.target.value }))} className={inputClass} style={inputStyle} />
                </FF>
                <FF label="Statut">
                  <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className={cn(inputClass, 'pr-3')} style={inputStyle}>
                    <option value="scheduled">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Clôturé</option>
                  </select>
                </FF>
              </div>
              <FF label="Processus audité *">
                <select value={form.processAudited} onChange={(e) => setForm(f => ({ ...f, processAudited: e.target.value }))} className={cn(inputClass, 'pr-3')} style={inputStyle}>
                  {PROCESS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </FF>
              <FF label="Périmètre / Scope">
                <textarea value={form.scope} onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))} rows={2} placeholder="Départements, activités ou processus couverts…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
              </FF>
              <FF label="Constats initiaux">
                <textarea value={form.findings} onChange={(e) => setForm(f => ({ ...f, findings: e.target.value }))} rows={3} placeholder="À compléter lors de l'audit ou après clôture…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
              </FF>
              {formError && (
                <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting} style={{ background: 'var(--admin-emerald)' }}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement…</> : "Planifier l'audit"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/audits/AuditsClient.tsx
git commit -m "feat(audits): shadcn Sheet drawer, Badge statuses, EmptyState, Button upgrades"
```

---

## Task 13: SettingsClient Redesign

**Files:**
- Modify: `src/app/admin/(dashboard)/settings/SettingsClient.tsx`

**Interfaces:**
- All state (`tab`, `form` per section, `saving`, `testing`, `testEmail`, `msg`) remain identical
- All handlers (`handleSubmit` per section, `handleTest`, `toggle`) remain identical
- Replace: custom tab bar with shadcn `Tabs`; `SaveButton` helper with inline shadcn `Button` + `Loader2`; add `border-l-4 border-[var(--admin-emerald)] pl-4` accent to `Section` title headers

- [ ] **Step 1: Update SettingsClient.tsx**

Make the following targeted edits to the file (do NOT rewrite the whole file — the section sub-components are complex):

**A.** Add imports at the top of the file (after existing imports):
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
```

**B.** Replace the `SaveButton` helper function (lines 30–37):
```tsx
function SaveButton({ saving, label = 'Enregistrer' }: { saving: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={saving} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement…</> : label}
    </Button>
  )
}
```

**C.** Update the `Section` helper — add `border-l-4 border-[var(--admin-emerald)] pl-4` to the title `<h2>` wrapper inside the section header div:
```tsx
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="border-l-4 pl-4" style={{ borderColor: 'var(--admin-emerald)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
```

**D.** Replace the custom tab bar in the main `SettingsClient` component. Find the block starting with `{/* Tab bar */}` and the three conditional renders below it, and replace it all with:
```tsx
<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
  <TabsList>
    <TabsTrigger value="company">Société</TabsTrigger>
    <TabsTrigger value="smtp">SMTP</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="company"><CompanySection initial={initialSettings.company} /></TabsContent>
  <TabsContent value="smtp"><SmtpSection initial={initialSettings.smtp} /></TabsContent>
  <TabsContent value="notifications"><NotificationsSection initial={initialSettings.notifications} /></TabsContent>
</Tabs>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(dashboard\)/settings/SettingsClient.tsx
git commit -m "feat(settings): shadcn Tabs, Button+Loader2 SaveButton, section left-border accent"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| 4. Foundation — shadcn wiring | Tasks 1, 2 |
| 4.3 Fade-in animation | Task 2 |
| 5. Sidebar — Lucide icons | Task 4 |
| 5.2 Active state border-l | Task 4 |
| 5.3 Group separators | Task 4 |
| 5.4 User chip in footer | Task 4 |
| 5.5 Mobile Sheet | Tasks 4, 5 |
| 6. Header — breadcrumbs | Task 5 |
| 6.2 Hamburger | Task 5 |
| 6.3 User dropdown | Task 5 |
| 6.4 Bell placeholder | Task 5 |
| 6 layout wiring | Task 6 |
| 7. MetricCard | Task 7 |
| 7.3 Icon assignments | Task 8 |
| 8. Dashboard Section→Card | Task 8 |
| 8.2 DashboardTabs → shadcn | Task 8 |
| 8.4 Empty states in dashboard | Task 8 |
| 9.1–9.4 Tables redesign | Tasks 9, 10, 11, 12 |
| 9.6 TableSkeleton | Tasks 3, 10, 11 |
| 9.7 EmptyState in tables | Tasks 3, 10, 11, 12 |
| 10. Filters bar | Tasks 10, 11, 12 |
| 11. Pagination upgrade | Task 10 |
| 12. Forms upgrade | Tasks 11, 12, 13 |
| 13. NC Sheet drawer | Task 11 |
| 13 (same pattern) Audits Sheet | Task 12 |
| 14. Settings Tabs | Task 13 |
| 15.1 EmptyState | Task 3 |
| 15.2 TableSkeleton | Task 3 |
| 15.3 MetricCardSkeleton | Task 3 |

All spec sections accounted for. No placeholders. Types are consistent across tasks.
