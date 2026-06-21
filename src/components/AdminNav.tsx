'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth-utils'
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
      { href: '/admin',           label: 'Tableau de bord',          icon: LayoutDashboard, exact: true },
      { href: '/admin/projects',  label: 'Projets',                  icon: FolderOpen },
      { href: '/admin/clients',   label: 'Clients',                  icon: Building2, roles: ['admin','direction','etudes_chef','realisation_chef'] },
    ],
  },
  {
    label: 'Qualité',
    items: [
      { href: '/admin/nc',        label: 'Non-conformités',          icon: AlertTriangle,  roles: ['admin','direction','etudes_chef','realisation_chef','entretien_chef'] },
      { href: '/admin/audits',    label: 'Audits',                   icon: ClipboardCheck, roles: ['admin','direction'] },
      { href: '/admin/documents', label: 'Inf. Documentées',         icon: FileText,       roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'Études & terrain',
    items: [
      { href: '/admin/suppliers',        label: 'Fournisseurs',             icon: Leaf,    roles: ['admin','direction','etudes_chef','realisation_chef'] },
      { href: '/admin/design/concepts',  label: 'Bibliothèque de concepts', icon: Palette, roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/design/templates', label: 'Modèles de concepts',      icon: Layout,  roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'RSE',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/rse/partnerships', label: 'Partenariats', icon: Handshake, roles: ['admin','direction'] },
      { href: '/admin/rse/events',       label: 'Événements',   icon: Sparkles,  roles: ['admin','direction'] },
      { href: '/admin/rse/impact',       label: 'Impact RSE',   icon: BarChart2, roles: ['admin','direction'] },
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
      { href: '/admin/team',     label: 'Équipe',     icon: Users,    roles: ['admin'] },
      { href: '/admin/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
    ],
  },
]

function initials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

/* Ivory at different opacities — matches the public Nav's palette exactly */
const ivory     = 'rgba(245,240,232,0.88)'
const ivoryDim  = 'rgba(245,240,232,0.40)'
const ivoryFaint= 'rgba(245,240,232,0.18)'
const gold      = '#C9A84C'
const goldDim   = 'rgba(201,168,76,0.14)'
const goldBorder= 'rgba(201,168,76,0.28)'
const divider   = 'rgba(201,168,76,0.15)'

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
      <div
        className="h-14 flex items-center px-5 shrink-0 border-b"
        style={{ borderColor: goldBorder }}
      >
        <span
          className="font-bold text-sm tracking-widest uppercase"
          style={{ color: ivory, letterSpacing: '0.12em', fontFamily: 'var(--font-sans)' }}
        >
          SOPAT
        </span>
        <span
          className="ml-2.5 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide"
          style={{ background: gold, color: '#0F2419' }}
        >
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
        {visibleGroups.map((g, gi) => {
          const isFirst = gi === 0
          return (
            <div key={(g.label ?? 'top') + '-' + gi}>
              {!isFirst && (
                <div
                  className="mx-2 my-3"
                  style={{ height: '1px', background: divider }}
                />
              )}
              {g.label && (
                <p
                  className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: ivoryDim, letterSpacing: '0.13em' }}
                >
                  {g.label}
                </p>
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
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        active ? 'font-semibold' : 'font-normal'
                      )}
                      style={{
                        color:       active ? gold : ivory,
                        background:  active ? goldDim : 'transparent',
                        borderLeft:  active ? `2px solid ${gold}` : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = ivoryFaint
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <Icon className="w-[15px] h-[15px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: goldBorder }}
      >
        {name && (
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: goldDim, color: gold, border: `1px solid ${goldBorder}` }}
            >
              {initials(name)}
            </div>
            <p className="text-xs font-medium truncate" style={{ color: ivory }}>{name}</p>
          </div>
        )}
        <p className="text-[10px] font-medium tracking-wide" style={{ color: ivoryDim }}>ISO 9001:2015</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(245,240,232,0.22)' }}>v1.0 · SOPAT Admin</p>
      </div>
    </>
  )
}

export function AdminNav({ role, name }: { role?: UserRole; name?: string }) {
  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{ background: 'var(--green)', borderRight: `1px solid ${goldBorder}` }}
    >
      <AdminNavContent role={role} name={name} />
    </aside>
  )
}
