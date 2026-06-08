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

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',           label: 'Tableau de bord', icon: '◉', exact: true },
  { href: '/admin/projects',  label: 'Projets',          icon: '📁' },
  { href: '/admin/nc',        label: 'Non-conformités',  icon: '⚠', roles: ['admin','direction','etudes_chef','realisation_chef','entretien_chef'] },
  { href: '/admin/audits',    label: 'Audits',           icon: '✓', roles: ['admin','direction'] },
  { href: '/admin/documents', label: 'Documents ISO',    icon: '📄', roles: ['admin','direction','etudes_chef'] },
  { href: '/admin/suppliers', label: 'Fournisseurs',     icon: '🌿', roles: ['admin','direction','etudes_chef','realisation_chef'] },
  { href: '/admin/reports',   label: 'Rapports',         icon: '📊', roles: ['admin','direction','realisation_chef','entretien_chef'] },
  { href: '/admin/team',      label: 'Équipe',           icon: '👥', roles: ['admin'] },
  { href: '/admin/settings',  label: 'Paramètres',       icon: '⚙',  roles: ['admin'] },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminNav() {
  const pathname = usePathname()

  const visible = NAV_ITEMS

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

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
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {visible.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
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
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)' }}>v1.0 · SOPAT Admin</p>
      </div>
    </aside>
  )
}
