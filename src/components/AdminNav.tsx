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

const border    = 'var(--admin-border)'
const text      = 'var(--admin-text)'
const textMuted = 'var(--admin-text-muted)'
const textDim   = 'var(--admin-text-dim)'
const activeBg  = 'rgba(28,61,46,0.10)'   /* green 10% — active nav item */
const hoverBg   = 'rgba(28,61,46,0.06)'   /* green 6% — hover */
const accent    = 'var(--green)'
const accentDim = 'rgba(28,61,46,0.12)'

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
        className="h-12 flex items-center px-4 shrink-0 border-b"
        style={{ borderColor: border }}
      >
        <span
          className="font-semibold text-[13px] tracking-tight"
          style={{ color: text, fontFamily: 'var(--font-sans)' }}
        >
          SOPAT
        </span>
        <span
          className="ml-2 text-[10px] px-1.5 py-px rounded font-semibold"
          style={{ background: accentDim, color: accent, border: `1px solid ${border}` }}
        >
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="admin-scroll flex-1 overflow-y-auto py-3 px-3">
        {visibleGroups.map((g, gi) => {
          const isFirst = gi === 0
          return (
            <div key={(g.label ?? 'top') + '-' + gi} className={isFirst ? '' : 'mt-4'}>
              {g.label && (
                <p
                  className="px-2 pb-1 text-[10px] font-medium uppercase"
                  style={{ color: textDim, letterSpacing: '0.08em' }}
                >
                  {g.label}
                </p>
              )}
              <div className="space-y-px">
                {g.items.filter(itemVisible).map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href + '-' + item.label}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors duration-100',
                        active ? 'font-medium' : 'font-normal'
                      )}
                      style={{
                        color:      active ? text : textMuted,
                        background: active ? activeBg : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = hoverBg
                        if (!active) e.currentTarget.style.color = text
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = 'transparent'
                        if (!active) e.currentTarget.style.color = textMuted
                      }}
                    >
                      <Icon
                        className="w-[14px] h-[14px] shrink-0"
                        style={{ color: active ? accent : textMuted }}
                      />
                      <span className="min-w-0 truncate">{item.label}</span>
                      {active && (
                        <span className="ml-auto w-1 h-1 rounded-full shrink-0" style={{ background: accent }} />
                      )}
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
        className="px-3 py-3 border-t"
        style={{ borderColor: border }}
      >
        {name && (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
              style={{ background: accentDim, color: accent, border: `1px solid ${border}` }}
            >
              {initials(name)}
            </div>
            <p className="text-[12px] truncate" style={{ color: textMuted }}>{name}</p>
          </div>
        )}
        <p className="text-[10px]" style={{ color: textDim }}>ISO 9001:2015 · v1.0</p>
      </div>
    </>
  )
}

export function AdminNav({ role, name }: { role?: UserRole; name?: string }) {
  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
      style={{ width: '220px', background: 'var(--admin-surface)', borderRight: '1px solid var(--admin-border)' }}
    >
      <AdminNavContent role={role} name={name} />
    </aside>
  )
}
