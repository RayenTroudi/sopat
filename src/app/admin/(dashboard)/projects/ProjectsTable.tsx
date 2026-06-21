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
