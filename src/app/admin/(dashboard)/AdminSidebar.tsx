'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  ),
  crm: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 4a3 3 0 100-6 3 3 0 000 6zm4 2a3 3 0 00-3-3" />
    </svg>
  ),
  lead: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  client: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  opportunity: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  projects: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  lifecycle: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  milestone: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  task: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  deliverable: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  design: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  procurement: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  execution: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  qc: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  handover: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  maintenance: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  reports: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M16 8v8m-4-5v5M8 11v5M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
  admin: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  chevron: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  sub: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 012-2z" />
    </svg>
  ),
  issue: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  report: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  invoice: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 012-2z" />
    </svg>
  ),
  alerts: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  supplier: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  concept: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  technical: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  inspection: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  punch: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
}

// ── Navigation structure ──────────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: React.ReactNode }
type NavGroup = {
  id: string
  label: string
  icon: React.ReactNode
  rootHref?: string   // if set, clicking the group header also navigates
  children?: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: icons.dashboard,
    rootHref: '/admin',
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: icons.crm,
    children: [
      { href: '/admin/crm/leads', label: 'Prospects', icon: icons.lead },
      { href: '/admin/clients', label: 'Clients', icon: icons.client },
      { href: '/admin/crm/opportunities', label: 'Opportunités', icon: icons.opportunity },
    ],
  },
  {
    id: 'projects',
    label: 'Projets',
    icon: icons.projects,
    children: [
      { href: '/admin/projects', label: 'Tous les projets', icon: icons.projects },
      { href: '/admin/projects/lifecycle', label: 'Pipeline', icon: icons.lifecycle },
      { href: '/admin/projects/milestones', label: 'Jalons', icon: icons.milestone },
      { href: '/admin/projects/tasks', label: 'Tâches', icon: icons.task },
      { href: '/admin/projects/deliverables', label: 'Livrables', icon: icons.deliverable },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    icon: icons.design,
    children: [
      { href: '/admin/design/concepts', label: 'Design conceptuel', icon: icons.concept },
      { href: '/admin/design/development', label: 'Développement', icon: icons.design },
      { href: '/admin/design/technical', label: 'Plans techniques', icon: icons.technical },
    ],
  },
  {
    id: 'procurement',
    label: 'Achats',
    icon: icons.procurement,
    children: [
      { href: '/admin/procurement/suppliers', label: 'Fournisseurs', icon: icons.supplier },
      { href: '/admin/procurement/rfqs', label: 'Appels d\'offres', icon: icons.sub },
      { href: '/admin/procurement/orders', label: 'Bons de commande', icon: icons.invoice },
    ],
  },
  {
    id: 'execution',
    label: 'Exécution',
    icon: icons.execution,
    children: [
      { href: '/admin/execution/site-reports', label: 'Rapports de chantier', icon: icons.report },
      { href: '/admin/execution/daily-logs', label: 'Journaux quotidiens', icon: icons.sub },
      { href: '/admin/execution/weekly-reports', label: 'Rapports hebdo.', icon: icons.reports },
      { href: '/admin/execution/issues', label: 'Problèmes', icon: icons.issue },
    ],
  },
  {
    id: 'qc',
    label: 'Contrôle Qualité',
    icon: icons.qc,
    children: [
      { href: '/admin/quality/inspections', label: 'Inspections', icon: icons.inspection },
      { href: '/admin/quality/punch-lists', label: 'Listes de défauts', icon: icons.punch },
    ],
  },
  {
    id: 'handover',
    label: 'Remise',
    icon: icons.handover,
    rootHref: '/admin/handover',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: icons.maintenance,
    rootHref: '/admin/maintenance',
  },
  {
    id: 'reports',
    label: 'Rapports',
    icon: icons.reports,
    children: [
      { href: '/admin/reports', label: 'P&L Projets', icon: icons.report },
      { href: '/admin/reports/status', label: 'Statut projets', icon: icons.sub },
      { href: '/admin/reports/budget', label: 'Budget vs Réel', icon: icons.reports },
      { href: '/admin/invoices', label: 'Factures', icon: icons.invoice },
      { href: '/admin/alerts', label: 'Alertes', icon: icons.alerts },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: icons.admin,
    rootHref: '/admin',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminSidebar() {
  const pathname = usePathname()

  // Determine which groups are active (contain the current route)
  const getGroupActive = (group: NavGroup) => {
    if (group.rootHref) {
      return group.rootHref === '/admin'
        ? pathname === '/admin'
        : pathname.startsWith(group.rootHref)
    }
    return group.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')) ?? false
  }

  // Initialize open state: open any group that contains the current route
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of navGroups) {
      if (g.children) init[g.id] = getGroupActive(g)
    }
    return init
  })

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col admin-scroll overflow-y-auto"
      style={{
        background: 'var(--admin-surface)',
        borderRight: '1px solid var(--admin-border)',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <Image src="/logo-768x519.svg" alt="SOPAT" width={96} height={65} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5">
        {navGroups.map(group => {
          const groupActive = getGroupActive(group)
          const isOpen = openGroups[group.id] ?? false

          // Simple top-level link (no children)
          if (!group.children) {
            return (
              <Link
                key={group.id}
                href={group.rootHref!}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  fontFamily: 'var(--font-sans)',
                  background: groupActive ? 'var(--admin-accent-dim)' : 'transparent',
                  color: groupActive ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  border: groupActive ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
                }}
              >
                <span style={{ color: groupActive ? 'var(--admin-accent)' : 'var(--admin-text-dim)' }}>
                  {group.icon}
                </span>
                <span className="font-medium flex-1" style={{ fontSize: '0.8125rem' }}>
                  {group.label}
                </span>
                {groupActive && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--admin-accent)' }} />
                )}
              </Link>
            )
          }

          // Expandable group
          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  fontFamily: 'var(--font-sans)',
                  background: groupActive && !isOpen ? 'var(--admin-accent-dim)' : 'transparent',
                  color: groupActive ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  border: groupActive && !isOpen ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
                }}
              >
                <span style={{ color: groupActive ? 'var(--admin-accent)' : 'var(--admin-text-dim)' }}>
                  {group.icon}
                </span>
                <span className="font-medium flex-1 text-left" style={{ fontSize: '0.8125rem' }}>
                  {group.label}
                </span>
                <span
                  className="transition-transform duration-200 flex-shrink-0"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: 'var(--admin-text-dim)',
                  }}
                >
                  {icons.chevron}
                </span>
              </button>

              {/* Children */}
              {isOpen && (
                <div className="ml-3 mt-0.5 mb-1 space-y-0.5 pl-3" style={{ borderLeft: '1px solid var(--admin-border)' }}>
                  {group.children.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150"
                        style={{
                          fontFamily: 'var(--font-sans)',
                          background: isActive ? 'var(--admin-accent-dim)' : 'transparent',
                          color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                        }}
                      >
                        <span style={{ color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-dim)', flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        <span className="font-medium leading-tight">
                          {item.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
