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
      { href: '/admin/suppliers',          label: 'Fournisseurs',             icon: Leaf,    roles: ['admin','direction','etudes_chef','realisation_chef'] },
      { href: '/admin/design/concepts',    label: 'Bibliothèque de concepts', icon: Palette, roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/design/templates',   label: 'Modèles de concepts',      icon: Layout,  roles: ['admin','direction','etudes_chef'] },
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
      <div className="h-14 flex items-center px-5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="font-bold text-sm tracking-tight text-white">SOPAT</span>
        <span
          className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide"
          style={{ background: 'var(--gold)', color: '#0F2419' }}
        >
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((g, gi) => {
          const showSeparator = gi > 0 && g.label
          return (
            <div key={(g.label ?? 'top') + '-' + gi} className={gi > 0 ? 'mt-2' : ''}>
              {showSeparator && (
                <Separator className="mb-2 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              )}
              {g.label && (
                <div
                  className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
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
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 border-l-[3px]',
                        active
                          ? 'font-semibold'
                          : 'font-medium'
                      )}
                      style={{
                        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                        borderColor: active ? 'var(--gold)' : 'transparent',
                        ...(active ? {} : { '--tw-hover-bg': 'rgba(255,255,255,0.06)' } as React.CSSProperties),
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                        }
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
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {name && (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'rgba(201,168,76,0.2)', color: 'var(--gold)' }}
            >
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-white">{name}</p>
            </div>
          </div>
        )}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>ISO 9001:2015</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>v1.0 · SOPAT Admin</p>
      </div>
    </>
  )
}

export function AdminNav({ role, name }: { role?: UserRole; name?: string }) {
  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{ background: 'var(--green)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <AdminNavContent role={role} name={name} />
    </aside>
  )
}
