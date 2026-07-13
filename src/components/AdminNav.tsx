'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { UserRole } from '@/lib/auth-utils'
import {
  LayoutDashboard, FolderOpen, Building2, AlertTriangle, ClipboardCheck,
  FileText, Leaf, Handshake, Sparkles, BarChart2,
  Trophy, BookOpen, Coins, CalendarDays, BarChart3, Users, Settings,
  ChevronLeft, ShieldCheck, Scale, UserCheck, Trash2, HardHat, CalendarRange, Globe2,
  FlaskConical, Layers, Briefcase, GraduationCap, Calendar, Star, UserPlus,
  Clock, MapPin, Package, RefreshCw, LogOut, ScrollText, ClipboardList, CalendarClock,
  ChevronDown, Bookmark, BookmarkCheck, GripVertical,
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
      { href: '/admin/management-reviews',  label: 'Revues de direction',    icon: ClipboardCheck, roles: ['admin','direction'] },
      { href: '/admin/meetings',            label: 'PV de réunion',          icon: ScrollText,     roles: ['admin','direction'] },
      { href: '/admin/risks-opportunities', label: 'Risques & Opportunités', icon: ShieldCheck,   roles: ['admin','direction'] },
      { href: '/admin/stakeholders',        label: 'Parties Intéressées',    icon: Users,          roles: ['admin','direction'] },
      { href: '/admin/regulatory-watch',    label: 'Veille Réglementaire',   icon: Scale,          roles: ['admin','direction'] },
      { href: '/admin/auditors',            label: 'Auditeurs Internes',     icon: UserCheck,      roles: ['admin','direction'] },
      { href: '/admin/management-plan',     label: 'Plan de Management',     icon: CalendarRange,  roles: ['admin','direction'] },
      { href: '/admin/environment/aspects', label: 'Aspects environnementaux', icon: Leaf,         roles: ['admin','direction'] },
      { href: '/admin/environment/waste',   label: 'Déchets',                icon: Trash2,         roles: ['admin','direction'] },
      { href: '/admin/environment/hse-checklist', label: 'Checklist HSE',   icon: HardHat,        roles: ['admin','direction'] },
    ],
  },
  {
    label: 'Commercial',
    roles: ['admin','direction','etudes_chef'],
    items: [
      { href: '/admin/commercial/offers',          label: 'Suivi des offres',      icon: Briefcase, roles: ['admin','direction','etudes_chef'] },
      { href: '/admin/commercial/client-balances', label: 'État de solde client',  icon: Coins,     roles: ['admin','direction','etudes_chef'] },
    ],
  },
  {
    label: 'Achat',
    roles: ['admin','direction','realisation_chef','etudes_chef'],
    items: [
      { href: '/admin/achat/delivery-notes', label: 'Bons livraison / retour', icon: Package,      roles: ['admin','direction','realisation_chef','etudes_chef'] },
      { href: '/admin/achat/extra-expenses', label: 'Extra dépenses',          icon: ClipboardList, roles: ['admin','direction','realisation_chef','etudes_chef'] },
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
      { href: '/admin/realisation',                  label: 'Registre chantiers',     icon: HardHat,       roles: ['admin', 'direction', 'realisation_chef', 'realisation_team'], exact: true },
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
      { href: '/admin/rse/impact',       label: 'Impact RSE',   icon: BarChart2, roles: ['admin','direction'], exact: true },
    ],
  },
  {
    label: 'Direction',
    roles: ['admin','direction'],
    items: [
      { href: '/admin/direction/achievements', label: 'Réalisations',     icon: Trophy,   roles: ['admin','direction'] },
      { href: '/admin/direction/portfolio',    label: 'Portfolio Export', icon: BookOpen, roles: ['admin','direction'] },
      { href: '/admin/settings/currencies',    label: 'Métriques devise', icon: Coins,    roles: ['admin','direction'] },
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

const EXPANDED_WIDTH  = 228
const COLLAPSED_WIDTH = 60

/* ── localStorage helpers (keyed by userId) ─────────────────── */
function lsKey(userId: string, suffix: string) {
  return `sopat-nav-${userId}-${suffix}`
}
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

/* ── Active pill background ──────────────────────────────────── */
function ActivePillBg({ collapsed }: { collapsed: boolean }) {
  const r   = collapsed ? 16 : 20
  const W   = 186
  const H   = 38
  const bx  = collapsed ? 200 : 200
  const mid = H / 2

  const d = collapsed
    ? [
        `M ${r} 0`, `L ${W - r} 0`, `Q ${W} 0 ${W} ${r}`,
        `L ${W} ${H - r}`, `Q ${W} ${H} ${W - r} ${H}`,
        `L ${r} ${H}`, `Q 0 ${H} 0 ${H - r}`, `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
      ].join(' ')
    : [
        `M ${r} 0`, `L ${W} 0`,
        `C ${W + 10} 0, ${bx} ${mid * 0.3}, ${W} ${mid}`,
        `C ${bx} ${mid * 1.7}, ${W + 10} ${H}, ${W} ${H}`,
        `L ${r} ${H}`, `Q 0 ${H} 0 ${H - r}`, `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
      ].join(' ')

  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 38"
      preserveAspectRatio="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        overflow: 'visible',
        filter: 'drop-shadow(0 4px 10px rgba(15,36,25,0.28)) drop-shadow(0 1px 3px rgba(15,36,25,0.18))',
        transition: 'filter 200ms ease',
      }}
    >
      <path d={d} fill={S.accent} />
    </svg>
  )
}

function ActiveNavItem({
  item, collapsed, onNavigate,
}: {
  item: NavItem; collapsed: boolean; onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <div
      title={collapsed ? item.label : undefined}
      style={{
        position: 'relative', height: '38px',
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
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: collapsed ? '100%' : undefined,
          gap: '10px', height: '38px',
          paddingLeft: collapsed ? '0' : '18px',
          paddingRight: collapsed ? '0' : '24px',
          color: '#fff', fontWeight: 600, fontSize: '13px',
          textDecoration: 'none', letterSpacing: '-0.01em',
        }}
      >
        <Icon style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
        <span style={{
          minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1, display: collapsed ? 'none' : undefined, transition: 'opacity 150ms ease',
        }}>
          {item.label}
        </span>
      </Link>
    </div>
  )
}

/* ── Bookmark button ─────────────────────────────────────────── */
function BookmarkBtn({
  bookmarked, onToggle, show, onActive = false,
}: {
  bookmarked: boolean
  onToggle:   (e: React.MouseEvent) => void
  show:       boolean
  onActive?:  boolean  // true = rendered on the green active pill
}) {
  // On the active pill: white colors. Otherwise: amber (bookmarked) or muted (not).
  const color        = onActive ? 'rgba(255,255,255,0.75)' : bookmarked ? '#F59E0B' : S.textDim
  const colorFilled  = onActive ? '#fff'                   : '#F59E0B'
  const hoverBg      = onActive ? 'rgba(255,255,255,0.15)' : bookmarked ? 'rgba(245,158,11,0.12)' : S.hoverBg

  return (
    <button
      onClick={onToggle}
      title={bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '22px',
        height:         '22px',
        flexShrink:     0,
        background:     'none',
        border:         'none',
        cursor:         'pointer',
        borderRadius:   '5px',
        opacity:        show ? 1 : 0,
        pointerEvents:  show ? 'auto' : 'none',
        transition:     'opacity 120ms ease, background 120ms ease, color 120ms ease',
        color:          bookmarked ? colorFilled : color,
        padding:        0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      {bookmarked
        ? <BookmarkCheck style={{ width: '12px', height: '12px' }} />
        : <Bookmark      style={{ width: '12px', height: '12px' }} />}
    </button>
  )
}

/* ── Drag-and-drop bookmarks list ────────────────────────────── */
type BookmarkEntry = { href: string; label: string; iconName: string }

const ICON_MAP: Record<string, LucideIcon> = (() => {
  const map: Record<string, LucideIcon> = {}
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      map[item.href] = item.icon
    }
  }
  return map
})()

function DropLine({ visible }: { visible: boolean }) {
  return (
    <div style={{
      height:     visible ? '2px' : '0px',
      margin:     visible ? '2px 8px' : '0 8px',
      background: S.accent,
      borderRadius: '2px',
      opacity:    visible ? 1 : 0,
      transition: 'height 120ms ease, margin 120ms ease, opacity 120ms ease',
    }} />
  )
}

function BookmarksSection({
  entries,
  collapsed,
  onNavigate,
  onRemove,
  onReorder,
  pathname,
}: {
  entries:     BookmarkEntry[]
  collapsed:   boolean
  onNavigate?: () => void
  onRemove:    (href: string) => void
  onReorder:   (newOrder: BookmarkEntry[]) => void
  pathname:    string
}) {
  const dragIdx   = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dropAt,   setDropAt]   = useState<number | null>(null) // insertion index (0..entries.length)

  if (entries.length === 0) return null

  function handleDragStart(idx: number, e: React.DragEvent) {
    dragIdx.current = idx
    setDragging(idx)
    e.dataTransfer.effectAllowed = 'move'
    // ghost image: a tiny transparent pixel so default ghost doesn't show
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-100px;left:-100px;width:1px;height:1px;'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Determine insertion point: top half → insert before idx, bottom half → insert after
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mid  = rect.top + rect.height / 2
    setDropAt(e.clientY < mid ? idx : idx + 1)
  }

  function handleDragEnd() {
    if (dragIdx.current !== null && dropAt !== null) {
      const from = dragIdx.current
      // Adjust insertion index for removed element
      const adjustedTo = dropAt > from ? dropAt - 1 : dropAt
      if (adjustedTo !== from) {
        const next = [...entries]
        const [moved] = next.splice(from, 1)
        next.splice(adjustedTo, 0, moved)
        onReorder(next)
      }
    }
    dragIdx.current = null
    setDragging(null)
    setDropAt(null)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the whole list area
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropAt(null)
    }
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      {/* Header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        paddingLeft:   collapsed ? '0' : '16px',
        paddingRight:  collapsed ? '0' : '8px',
        marginBottom:  '4px',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed ? (
          <span style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '5px',
            fontSize:      '10px',
            fontWeight:    600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color:         S.textDim,
          }}>
            <BookmarkCheck style={{ width: '10px', height: '10px', color: '#F59E0B' }} />
            Favoris
          </span>
        ) : null}
      </div>

      {/* Items with drop-line indicators */}
      <div
        style={{
          padding:      collapsed ? '6px' : '0 0 2px',
          background:   collapsed ? 'rgba(196,214,204,0.45)' : 'transparent',
          borderRadius: collapsed ? '14px' : '0',
          margin:       collapsed ? '0 6px' : '0',
        }}
        onDragLeave={handleDragLeave}
      >
        {/* Drop line before first item */}
        <DropLine visible={!collapsed && dropAt === 0} />

        {entries.map((entry, idx) => {
          const Icon      = ICON_MAP[entry.href] ?? LayoutDashboard
          const isCurrent = pathname === entry.href || (!entry.href.endsWith('/admin') && pathname.startsWith(entry.href))
          const isDragging = dragging === idx

          return (
            <div key={entry.href}>
              <div
                draggable={!collapsed}
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        collapsed ? '0' : '2px',
                  opacity:    isDragging ? 0.3 : 1,
                  transform:  isDragging ? 'scale(0.97)' : 'scale(1)',
                  transition: 'opacity 150ms ease, transform 150ms ease',
                  cursor:     collapsed ? 'default' : 'grab',
                  paddingLeft: collapsed ? '0' : '4px',
                }}
              >
                {/* Grip handle */}
                {!collapsed && (
                  <div style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:          '14px',
                    flexShrink:     0,
                    color:          isCurrent ? S.accent : S.textDim,
                    opacity:        isCurrent ? 0.7 : 0.5,
                  }}>
                    <GripVertical style={{ width: '11px', height: '11px' }} />
                  </div>
                )}

                {/* Nav link — subtle tint when it's the current page */}
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  title={collapsed ? entry.label : undefined}
                  style={{
                    flex:           1,
                    display:        'flex',
                    alignItems:     'center',
                    height:         '36px',
                    paddingLeft:    collapsed ? '0' : '8px',
                    paddingRight:   collapsed ? '0' : '4px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap:            '8px',
                    color:          isCurrent ? S.accent : S.textMuted,
                    background:     isCurrent ? 'rgba(47,111,79,0.08)' : 'transparent',
                    borderRadius:   '8px',
                    fontSize:       '13px',
                    fontWeight:     isCurrent ? 600 : 500,
                    textDecoration: 'none',
                    transition:     'background 150ms ease, color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCurrent ? 'rgba(47,111,79,0.14)' : S.hoverBg
                    e.currentTarget.style.color = isCurrent ? S.accent : S.text
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrent ? 'rgba(47,111,79,0.08)' : 'transparent'
                    e.currentTarget.style.color = isCurrent ? S.accent : S.textMuted
                  }}
                >
                  <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{
                      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {entry.label}
                    </span>
                  )}
                </Link>

                {/* Remove button — always visible, amber star/bookmark */}
                {!collapsed && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(entry.href) }}
                    title="Retirer des favoris"
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      width:          '22px',
                      height:         '22px',
                      flexShrink:     0,
                      background:     'none',
                      border:         'none',
                      cursor:         'pointer',
                      borderRadius:   '5px',
                      color:          '#F59E0B',
                      padding:        0,
                      transition:     'background 120ms ease, color 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(245,158,11,0.12)'
                      e.currentTarget.style.color = '#D97706'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = '#F59E0B'
                    }}
                  >
                    <BookmarkCheck style={{ width: '12px', height: '12px' }} />
                  </button>
                )}
              </div>

              {/* Drop line after this item */}
              <DropLine visible={!collapsed && dropAt === idx + 1} />
            </div>
          )
        })}
      </div>

      {/* Separator */}
      {!collapsed && (
        <div style={{
          height:     '1px',
          background: 'var(--admin-border)',
          margin:     '8px 12px 0',
          opacity:    0.6,
        }} />
      )}
    </div>
  )
}

/* ── Main content component ──────────────────────────────────── */
export function AdminNavContent({
  role,
  userId,
  collapsed,
  onNavigate,
}: {
  role?:       UserRole
  userId?:     string
  collapsed?:  boolean
  onNavigate?: () => void
}) {
  const isCollapsed = collapsed ?? false
  const pathname = usePathname()

  // Per-user section collapsed state: Record<groupLabel, boolean>
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({})
  // Per-user bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  // Hover tracking for bookmark buttons
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  const uid = userId ?? 'anonymous'

  useEffect(() => {
    setSectionCollapsed(lsGet<Record<string, boolean>>(lsKey(uid, 'sections'), {}))
    setBookmarks(lsGet<BookmarkEntry[]>(lsKey(uid, 'bookmarks'), []))
  }, [uid])

  function toggleSection(label: string) {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      lsSet(lsKey(uid, 'sections'), next)
      return next
    })
  }

  const isBookmarked = useCallback((href: string) => bookmarks.some((b) => b.href === href), [bookmarks])

  function toggleBookmark(item: NavItem, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setBookmarks((prev) => {
      let next: BookmarkEntry[]
      if (prev.some((b) => b.href === item.href)) {
        next = prev.filter((b) => b.href !== item.href)
      } else {
        next = [...prev, { href: item.href, label: item.label, iconName: item.href }]
      }
      lsSet(lsKey(uid, 'bookmarks'), next)
      return next
    })
  }

  function removeBookmark(href: string) {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.href !== href)
      lsSet(lsKey(uid, 'bookmarks'), next)
      return next
    })
  }

  function reorderBookmarks(next: BookmarkEntry[]) {
    setBookmarks(next)
    lsSet(lsKey(uid, 'bookmarks'), next)
  }

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
          height:              '88px',
          paddingLeft:         isCollapsed ? '0' : '16px',
          paddingRight:        isCollapsed ? '0' : '12px',
          paddingTop:          isCollapsed ? '10px' : '20px',
          justifyContent:      isCollapsed ? 'center' : 'flex-start',
          transition:          'padding 200ms ease',
          background:          'var(--admin-surface)',
          position:            'sticky',
          top:                  0,
          zIndex:               10,
          borderTopLeftRadius:  '20px',
          borderTopRightRadius: '20px',
        }}
      >
        {isCollapsed && (
          <Image src="/icon.svg" alt="SOPAT" width={40} height={40} priority unoptimized
            style={{ filter: 'brightness(0) saturate(100%) invert(18%) sepia(40%) saturate(700%) hue-rotate(105deg) brightness(80%)' }}
          />
        )}
        {!isCollapsed && (
          <Image src="/logo-768x519.svg" alt="SOPAT" width={110} height={74} priority unoptimized
            style={{ filter: 'brightness(0) saturate(100%) invert(18%) sepia(40%) saturate(700%) hue-rotate(105deg) brightness(80%)', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav
        className="admin-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: '12px 0 12px', position: 'relative', zIndex: 1 }}
      >
        {/* Bookmarks group */}
        {!isCollapsed && (
          <BookmarksSection
            entries={bookmarks}
            collapsed={isCollapsed}
            onNavigate={onNavigate}
            onRemove={removeBookmark}
            onReorder={reorderBookmarks}
            pathname={pathname}
          />
        )}

        {visibleGroups.map((g, gi) => {
          const visibleItems = g.items.filter(itemVisible)
          const label        = g.label ?? ''
          const isClosed     = !!label && !isCollapsed && !!sectionCollapsed[label]

          return (
            <div key={label + '-' + gi} style={{ marginTop: gi === 0 ? 0 : isCollapsed ? '10px' : '16px' }}>

              {/* Section header — clickable when expanded */}
              {g.label && (
                <div
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    paddingLeft:    isCollapsed ? '0' : '16px',
                    paddingRight:   isCollapsed ? '0' : '8px',
                    marginBottom:   isClosed ? '2px' : '6px',
                    cursor:         isCollapsed ? 'default' : 'pointer',
                    userSelect:     'none',
                  }}
                  onClick={() => !isCollapsed && toggleSection(g.label!)}
                >
                  <p
                    style={{
                      fontSize:      '10px',
                      fontWeight:    600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color:         S.textDim,
                      opacity:       isCollapsed ? 0 : 1,
                      height:        isCollapsed ? 0 : 'auto',
                      overflow:      'hidden',
                      transition:    'opacity 150ms ease, height 150ms ease',
                      pointerEvents: isCollapsed ? 'none' : 'auto',
                      margin:         0,
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {g.label}
                  </p>
                  {!isCollapsed && (
                    <ChevronDown
                      style={{
                        width:      '12px',
                        height:     '12px',
                        color:      S.textDim,
                        flexShrink: 0,
                        transform:  isClosed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Items — collapsible */}
              <div
                style={{
                  padding:        isCollapsed ? '6px' : '0',
                  background:     isCollapsed ? 'rgba(196,214,204,0.45)' : 'transparent',
                  borderRadius:   isCollapsed ? '14px' : '0',
                  margin:         isCollapsed ? '0 6px' : '0',
                  transition:     'background 200ms ease, border-radius 200ms ease, padding 200ms ease',
                  overflow:       'hidden',
                  maxHeight:      isClosed ? '0px' : '9999px',
                  // smooth collapse
                  transitionProperty: 'max-height, padding, background',
                  transitionDuration: '220ms',
                  transitionTimingFunction: 'ease',
                }}
              >
                {visibleItems.map((item) => {
                  const active     = isActive(item)
                  const bookmarked = isBookmarked(item.href)
                  const hovered    = hoveredHref === item.href
                  const Icon       = item.icon

                  if (active) {
                    return (
                      <div
                        key={item.href + '-' + item.label}
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setHoveredHref(item.href)}
                        onMouseLeave={() => setHoveredHref(null)}
                      >
                        <ActiveNavItem item={item} collapsed={isCollapsed} onNavigate={onNavigate} />
                        {!isCollapsed && (
                          <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                            <BookmarkBtn
                              bookmarked={bookmarked}
                              onToggle={(e) => toggleBookmark(item, e)}
                              show={hovered || bookmarked}
                              onActive={true}
                            />
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={item.href + '-' + item.label}
                      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={() => setHoveredHref(item.href)}
                      onMouseLeave={() => setHoveredHref(null)}
                    >
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={isCollapsed ? item.label : undefined}
                        className="relative flex items-center text-[13px] font-medium transition-colors duration-200"
                        style={{
                          flex:          1,
                          height:        '40px',
                          paddingLeft:   isCollapsed ? '0' : '20px',
                          paddingRight:  isCollapsed ? '0' : bookmarked ? '32px' : '16px',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          gap:            isCollapsed ? '0' : '10px',
                          color:          S.textMuted,
                          borderRadius:   '10px',
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
                        <span style={{
                          minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1, opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto',
                          transition: 'opacity 150ms ease, width 150ms ease',
                          pointerEvents: isCollapsed ? 'none' : 'auto',
                        }}>
                          {item.label}
                        </span>
                      </Link>
                      {!isCollapsed && (
                        <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                          <BookmarkBtn
                            bookmarked={bookmarked}
                            onToggle={(e) => toggleBookmark(item, e)}
                            show={hovered || bookmarked}
                          />
                        </div>
                      )}
                    </div>
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

/* ── Outer sidebar wrapper ───────────────────────────────────── */
export function AdminNav({ role, userId }: { role?: UserRole; userId?: string }) {
  const [collapsed, setCollapsed] = useState(false)

  const uid = userId ?? 'anonymous'

  useEffect(() => {
    const stored = localStorage.getItem(lsKey(uid, 'collapsed'))
    // fall back to legacy key for existing users
    const legacy = localStorage.getItem('admin-nav-collapsed')
    if (stored === 'true' || (stored === null && legacy === 'true')) {
      setCollapsed(true)
    }
  }, [uid])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      lsSet(lsKey(uid, 'collapsed'), next)
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
      <AdminNavContent role={role} userId={userId} collapsed={collapsed} />

      {/* ── Toggle button ──────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position:       'absolute',
          bottom:         '72px',
          right:          '-12px',
          width:          '24px',
          height:         '24px',
          borderRadius:   '50%',
          background:     'var(--admin-surface)',
          border:         `1.5px solid var(--admin-border)`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         'pointer',
          zIndex:          50,
          boxShadow:      '0 1px 4px rgba(15,36,25,0.12)',
          transition:     'background 150ms ease, box-shadow 150ms ease',
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
