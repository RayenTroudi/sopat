'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth-utils'

// ─── Nav items ────────────────────────────────────────────────────────────────

type NavItem = {
  href:   string
  label:  string
  icon:   string
  roles?: UserRole[]
  exact?: boolean
}

type NavGroup = {
  label?: string         // omitted = top of nav, no header
  roles?: UserRole[]     // if set, whole group hidden when user role isn't in list
  items:  NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/admin',           label: 'Tableau de bord', icon: '◉', exact: true },
      { href: '/admin/projects',  label: 'Projets',          icon: '📁' },
      { href: '/admin/clients',   label: 'Clients',          icon: '🏢', roles: ['admin','direction','etudes_chef','realisation_chef'] },
    ],
  },
  {
    label: 'Qualité',
    items: [
      { href: '/admin/nc',        label: 'Non-conformités',  icon: '⚠', roles: ['admin','direction','etudes_chef','realisation_chef','entretien_chef'] },
      { href: '/admin/audits',    label: 'Audits',           icon: '✓', roles: ['admin','direction'] },
      { href: '/admin/documents', label: 'Inf. Documentées', icon: '📄', roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'Études & terrain',
    items: [
      { href: '/admin/suppliers', label: 'Fournisseurs',     icon: '🌿', roles: ['admin','direction','etudes_chef','realisation_chef'] },
      { href: '/admin/design/concepts',  label: 'Bibliothèque de concepts', icon: '🎨', roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/design/templates', label: 'Modèles de concepts',      icon: '📐', roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'RSE',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/rse/partnerships', label: 'Partenariats',     icon: '🤝', roles: ['admin','direction'] },
      { href: '/admin/rse/events',       label: 'Événements',       icon: '🌱', roles: ['admin','direction'] },
      { href: '/admin/rse/impact',       label: 'Impact RSE',       icon: '📊', roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Direction',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/direction/achievements', label: 'Réalisations',       icon: '🏆', roles: ['admin','direction'] },
      { href: '/admin/direction/portfolio',    label: 'Portfolio Export',   icon: '🧬', roles: ['admin','direction'] },
      { href: '/admin/rse/impact',             label: 'Rapport RSE',        icon: '🌍', roles: ['admin','direction'] },
      { href: '/admin/settings/currencies',    label: 'Métriques devise',   icon: '💱', roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Entretien',
    items: [
      { href: '/admin/calendrier-entretien', label: 'Calendrier visites', icon: '📅', roles: ['admin','direction','entretien_chef','entretien_team'] },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { href: '/admin/reports',   label: 'Rapports',         icon: '📊', roles: ['admin','direction','realisation_chef','entretien_chef'] },
    ],
  },
  {
    label: 'Administration',
    roles: ['admin'],
    items: [
      { href: '/admin/team',      label: 'Équipe',           icon: '👥', roles: ['admin'] },
      { href: '/admin/settings',  label: 'Paramètres',       icon: '⚙',  roles: ['admin'] },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminNav({ role }: { role?: UserRole }) {
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
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0"
      style={{ background: 'var(--admin-surface)', borderRight: '1px solid var(--admin-border)' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
        <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--admin-text)' }}>SOPAT</span>
        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Admin</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map((g, gi) => (
          <div key={(g.label ?? 'top') + '-' + gi} className={gi > 0 ? 'mt-3' : ''}>
            {g.label && (
              <div
                className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: 'var(--admin-text-dim, var(--admin-text-muted))' }}
              >
                {g.label}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.filter(itemVisible).map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href + '-' + item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active ? '' : 'hover:bg-[var(--admin-bg)]'
                    )}
                    style={{
                      color:      active ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                      background: active ? 'var(--admin-emerald-dim)' : 'transparent',
                    }}
                  >
                    <span className="text-base leading-none w-5 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)' }}>v1.0 · SOPAT Admin</p>
      </div>
    </aside>
  )
}
