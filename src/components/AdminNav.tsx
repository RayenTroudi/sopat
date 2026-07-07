'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/lib/auth-utils'
import {
  LayoutDashboard, FolderOpen, Building2, AlertTriangle, ClipboardCheck,
  FileText, Leaf, Handshake, Sparkles, BarChart2,
  Trophy, BookOpen, Coins, CalendarDays, BarChart3, Users, Settings,
  ChevronLeft, ShieldCheck, Scale, UserCheck, Trash2, HardHat, CalendarRange, Globe2,
  FlaskConical, Layers, Briefcase, GraduationCap, Calendar, Star, UserPlus,
  Clock, MapPin, Package, RefreshCw, LogOut, ScrollText, ClipboardList, CalendarClock,
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
      { href: '/admin/nc',              label: 'Non-conformités',      icon: AlertTriangle,  roles: ['admin','direction'] },
      { href: '/admin/audit-programs', label: 'Programmes d\'audit', icon: ClipboardCheck, roles: ['admin','direction'] },
      { href: '/admin/audits',         label: 'Audits',              icon: ClipboardCheck, roles: ['admin','direction'] },
      { href: '/admin/documents',      label: 'Inf. Documentées',    icon: FileText,       roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'SMQ / Système',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/risks-opportunities', label: 'Risques & Opportunités', icon: ShieldCheck,   roles: ['admin','direction'] },
      { href: '/admin/stakeholders',        label: 'Parties Intéressées',    icon: Users,          roles: ['admin','direction'] },
      { href: '/admin/regulatory-watch',    label: 'Veille Réglementaire',   icon: Scale,          roles: ['admin','direction'] },
      { href: '/admin/auditors',            label: 'Auditeurs Internes',     icon: UserCheck,      roles: ['admin','direction'] },
      { href: '/admin/management-plan',     label: 'Plan de Management',     icon: CalendarRange,  roles: ['admin','direction'] },
      { href: '/admin/environment/waste',   label: 'Déchets',                icon: Trash2,         roles: ['admin','direction'] },
      { href: '/admin/environment/hse-checklist', label: 'Checklist HSE',   icon: HardHat,        roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Études',
    roles: ['admin','direction','etudes_chef','etudes_team'],
    items: [
      { href: '/admin/etude',                         label: 'Tableau de bord Études',   icon: BookOpen,     roles: ['admin','direction','etudes_chef','etudes_team'], exact: true },
      { href: '/admin/etude/study-register',          label: 'Registre projets',         icon: ScrollText,   roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/etude/project-articles',        label: 'Articles par projet',      icon: ClipboardList,roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/etude/plant-species',           label: 'Palette végétale',         icon: Leaf,         roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/etude/decorative-materials',    label: 'Matières décoratives',     icon: Layers,       roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/etude/phytosanitary',           label: 'Produits phytosanitaires', icon: FlaskConical, roles: ['admin','direction','etudes_chef','etudes_team'] },
      { href: '/admin/suppliers',                     label: 'Fournisseurs',             icon: Briefcase,    roles: ['admin','direction','etudes_chef','realisation_chef'] },
    ],
  },
  {
    label: 'Réalisation',
    roles: ['admin', 'direction', 'realisation_chef', 'realisation_team'],
    items: [
      { href: '/admin/realisation',                  label: 'Registre chantiers',     icon: HardHat,       roles: ['admin', 'direction', 'realisation_chef', 'realisation_team'] },
      { href: '/admin/realisation/weekly-schedule',  label: 'Planning hebdomadaire',  icon: CalendarClock, roles: ['admin', 'direction', 'realisation_chef', 'realisation_team'] },
    ],
  },
  {
    label: 'Ressources humaines',
    roles: ['admin','direction','rh_manager','rh_agent'],
    items: [
      { href: '/admin/rh/employees',          label: 'Personnel',            icon: Users,          roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/job-positions',      label: 'Fiches de poste',      icon: Briefcase,      roles: ['admin','direction','rh_manager'] },
      { href: '/admin/rh/recruitment',        label: 'Recrutement',          icon: UserPlus,       roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/training',           label: 'Plan de formation',    icon: GraduationCap,  roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/leaves',             label: 'Congés',               icon: Calendar,       roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/exit-authorizations',label: 'Autorisations sortie', icon: LogOut,         roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/attendance',         label: 'Pointage',             icon: Clock,          roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/mission-orders',     label: 'Ordres de mission',    icon: MapPin,         roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/equipment',          label: 'Matériel de travail',  icon: Package,        roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/substitutes',        label: 'Suppléants',           icon: RefreshCw,      roles: ['admin','direction','rh_manager'] },
      { href: '/admin/rh/integration',        label: "Plans d'intégration",  icon: ClipboardList,  roles: ['admin','direction','rh_manager','rh_agent'] },
      { href: '/admin/rh/performance',        label: 'Évaluations',          icon: Star,           roles: ['admin','direction','rh_manager'] },
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


/* ── Design tokens ───────────────────────────────────────────── */
const S = {
  border:    'var(--admin-border)',
  text:      'var(--admin-text)',
  textMuted: 'var(--admin-text-muted)',
  textDim:   'var(--admin-text-dim)',
  accent:    '#2F6F4F',
  activeBg:  '#D4E4DA',
  hoverBg:   '#E2ECE6',
} as const

const EXPANDED_WIDTH = 228
const COLLAPSED_WIDTH = 60

/*
 * ActivePillBg — SVG pill with organic right-side bulge.
 * Stretches to parent width via preserveAspectRatio="none".
 * drop-shadow filter follows the actual shape contour.
 */
function ActivePillBg({ collapsed }: { collapsed: boolean }) {
  const r   = collapsed ? 16 : 20
  const W   = 186
  const H   = 38
  const bx  = collapsed ? 200 : 200
  const mid = H / 2

  const d = collapsed
    ? // Collapsed: full pill (both sides rounded), no bulge
      [
        `M ${r} 0`,
        `L ${W - r} 0`,
        `Q ${W} 0 ${W} ${r}`,
        `L ${W} ${H - r}`,
        `Q ${W} ${H} ${W - r} ${H}`,
        `L ${r} ${H}`,
        `Q 0 ${H} 0 ${H - r}`,
        `L 0 ${r}`,
        `Q 0 0 ${r} 0`,
        'Z',
      ].join(' ')
    : // Expanded: pill with right-side bulge
      [
        `M ${r} 0`,
        `L ${W} 0`,
        `C ${W + 10} 0, ${bx} ${mid * 0.3}, ${W} ${mid}`,
        `C ${bx} ${mid * 1.7}, ${W + 10} ${H}, ${W} ${H}`,
        `L ${r} ${H}`,
        `Q 0 ${H} 0 ${H - r}`,
        `L 0 ${r}`,
        `Q 0 0 ${r} 0`,
        'Z',
      ].join(' ')

  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 38"
      preserveAspectRatio="none"
      style={{
        position:  'absolute',
        inset:     0,
        width:     '100%',
        height:    '100%',
        overflow:  'visible',
        filter:    'drop-shadow(0 4px 10px rgba(15,36,25,0.28)) drop-shadow(0 1px 3px rgba(15,36,25,0.18))',
        transition: 'filter 200ms ease',
      }}
    >
      <path d={d} fill={S.accent} />
    </svg>
  )
}

function ActiveNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <div
      title={collapsed ? item.label : undefined}
      style={{
        position:       'relative',
        height:         '38px',
        borderRadius:   collapsed ? '10px' : undefined,
        background:     collapsed ? S.accent : undefined,
        boxShadow:      collapsed ? '0 4px 10px rgba(15,36,25,0.28), 0 1px 3px rgba(15,36,25,0.18)' : undefined,
        display:        collapsed ? 'flex' : undefined,
        alignItems:     collapsed ? 'center' : undefined,
        justifyContent: collapsed ? 'center' : undefined,
      }}
    >
      {!collapsed && <ActivePillBg collapsed={collapsed} />}
      <Link
        href={item.href}
        onClick={onNavigate}
        style={{
          position:        'relative',
          zIndex:          1,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  collapsed ? 'center' : 'flex-start',
          width:           collapsed ? '100%' : undefined,
          gap:             '10px',
          height:          '38px',
          paddingLeft:     collapsed ? '0' : '18px',
          paddingRight:    collapsed ? '0' : '24px',
          color:           '#fff',
          fontWeight:      600,
          fontSize:        '13px',
          textDecoration:  'none',
          letterSpacing:   '-0.01em',
        }}
      >
        <Icon style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
        <span
          style={{
            minWidth:      0,
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
            lineHeight:    1,
            display:       collapsed ? 'none' : undefined,
            transition:    'opacity 150ms ease',
          }}
        >
          {item.label}
        </span>
      </Link>
    </div>
  )
}

export function AdminNavContent({
  role,
  collapsed,
  onNavigate,
}: {
  role?:       UserRole
  collapsed?:  boolean
  onNavigate?: () => void
}) {
  const isCollapsed = collapsed ?? false
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
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Logo ───────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height:         '88px',
          paddingLeft:    isCollapsed ? '0' : '16px',
          paddingRight:   isCollapsed ? '0' : '12px',
          paddingTop:     isCollapsed ? '10px' : '20px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          transition:     'padding 200ms ease',
          background:          'var(--admin-surface)',
          position:            'sticky',
          top:                 0,
          zIndex:              10,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
        }}
      >
        {/* Collapsed: leaf icon from favicon */}
        {isCollapsed && (
          <Image
            src="/icon.svg"
            alt="SOPAT"
            width={40}
            height={40}
            priority
            unoptimized
            style={{
              filter: 'brightness(0) saturate(100%) invert(18%) sepia(40%) saturate(700%) hue-rotate(105deg) brightness(80%)',
            }}
          />
        )}

        {/* Expanded: full SVG logo tinted dark green */}
        {!isCollapsed && (
          <Image
            src="/logo-768x519.svg"
            alt="SOPAT"
            width={110}
            height={74}
            priority
            unoptimized
            style={{
              filter: 'brightness(0) saturate(100%) invert(18%) sepia(40%) saturate(700%) hue-rotate(105deg) brightness(80%)',
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav
        className="admin-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: '20px 0 12px', position: 'relative', zIndex: 1 }}
      >
        {visibleGroups.map((g, gi) => {
          const visibleItems = g.items.filter(itemVisible)
          return (
            <div key={(g.label ?? 'top') + '-' + gi} style={{ marginTop: gi === 0 ? 0 : isCollapsed ? '10px' : '20px' }}>

              {/* Section label — hidden when collapsed */}
              {g.label && (
                <p
                  className="mb-1.5"
                  style={{
                    paddingLeft:    isCollapsed ? '0' : '16px',
                    textAlign:      isCollapsed ? 'center' : 'left',
                    fontSize:       '10px',
                    fontWeight:     600,
                    textTransform:  'uppercase',
                    letterSpacing:  '0.08em',
                    color:          S.textDim,
                    opacity:        isCollapsed ? 0 : 1,
                    height:         isCollapsed ? 0 : 'auto',
                    marginBottom:   isCollapsed ? 0 : undefined,
                    overflow:       'hidden',
                    transition:     'opacity 150ms ease, height 150ms ease, margin 150ms ease',
                    pointerEvents:  isCollapsed ? 'none' : 'auto',
                    whiteSpace:     'nowrap',
                  }}
                >
                  {g.label}
                </p>
              )}

              {/* Items */}
              <div
                className="space-y-1"
                style={{
                  padding:      isCollapsed ? '6px' : '0',
                  background:   isCollapsed ? 'rgba(196,214,204,0.45)' : 'transparent',
                  borderRadius: isCollapsed ? '14px' : '0',
                  margin:       isCollapsed ? '0 6px' : '0',
                  transition:   'background 200ms ease, border-radius 200ms ease, padding 200ms ease',
                }}
              >
                {visibleItems.map((item) => {
                  const active = isActive(item)
                  const Icon   = item.icon

                  if (active) {
                    return (
                      <ActiveNavItem
                        key={item.href + '-' + item.label}
                        item={item}
                        collapsed={isCollapsed}
                        onNavigate={onNavigate}
                      />
                    )
                  }

                  return (
                    <Link
                      key={item.href + '-' + item.label}
                      href={item.href}
                      onClick={onNavigate}
                      title={isCollapsed ? item.label : undefined}
                      className="relative flex items-center text-[13px] font-medium transition-colors duration-200"
                      style={{
                        height:          '40px',
                        paddingLeft:     isCollapsed ? '0' : '20px',
                        paddingRight:    isCollapsed ? '0' : '16px',
                        justifyContent:  isCollapsed ? 'center' : 'flex-start',
                        gap:             isCollapsed ? '0' : '10px',
                        color:           S.textMuted,
                        borderRadius:    '10px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = S.hoverBg
                        e.currentTarget.style.color = S.text
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = S.textMuted
                      }}
                    >
                      <Icon className="shrink-0" style={{ width: '15px', height: '15px', color: S.textMuted }} />
                      <span
                        style={{
                          minWidth:      0,
                          overflow:      'hidden',
                          textOverflow:  'ellipsis',
                          whiteSpace:    'nowrap',
                          lineHeight:    1,
                          opacity:       isCollapsed ? 0 : 1,
                          width:         isCollapsed ? 0 : 'auto',
                          transition:    'opacity 150ms ease, width 150ms ease',
                          pointerEvents: isCollapsed ? 'none' : 'auto',
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

    </div>
  )
}

export function AdminNav({ role }: { role?: UserRole }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('admin-nav-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('admin-nav-collapsed', String(next))
      return next
    })
  }

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width:        collapsed ? `${COLLAPSED_WIDTH}px` : `${EXPANDED_WIDTH}px`,
        background:   'var(--admin-surface)',
        transition:   'width 200ms ease',
        overflow:     'visible',
        borderRadius: '20px',
        margin:       '8px 0 8px 8px',
        height:       'calc(100vh - 16px)',
      }}
    >
      <AdminNavContent role={role} collapsed={collapsed} />

      {/* ── Toggle button ──────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position:        'absolute',
          bottom:          '72px',
          right:           '-12px',
          width:           '24px',
          height:          '24px',
          borderRadius:    '50%',
          background:      'var(--admin-surface)',
          border:          `1.5px solid var(--admin-border)`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          cursor:          'pointer',
          zIndex:          50,
          boxShadow:       '0 1px 4px rgba(15,36,25,0.12)',
          transition:      'background 150ms ease, box-shadow 150ms ease',
          color:           S.textDim,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = S.hoverBg
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,36,25,0.18)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--admin-surface)'
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,36,25,0.12)'
        }}
      >
        <ChevronLeft
          style={{
            width:      '13px',
            height:     '13px',
            color:      S.textDim,
            transform:  collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        />
      </button>

    </aside>
  )
}
