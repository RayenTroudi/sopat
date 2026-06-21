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
