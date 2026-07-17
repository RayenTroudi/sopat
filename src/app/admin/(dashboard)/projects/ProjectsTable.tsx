'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'
import { PhaseBadge } from '@/components/projects/PhaseBadge'
import { BudgetBadge } from '@/components/projects/BudgetBadge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ProjectRow = {
  id: string
  reference: string
  name: string
  clientName: string
  status: string
  projectType: string
  approvedBudget: string | null
  spent: string | null
  country?: string | null
  currency?: string | null
  assignedEtudesChefId: string | null
  estimatedDeliveryDate: Date | null
  createdAt: Date
  dmsDocumentCode?: string | null
}

type Props = {
  userRole: string
}

const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie terr.',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'ingenierie_territoriale', label: 'Ingénierie territoriale' },
  { value: 'espace_public',           label: 'Espace public' },
  { value: 'siege_social',            label: 'Siège social' },
  { value: 'hotelier_touristique',    label: 'Hôtelier & touristique' },
  { value: 'residentiel',             label: 'Résidentiel' },
  { value: 'interieur',               label: 'Intérieur' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft',       label: 'Brouillon' },
  { value: 'etudes',      label: 'Études' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'entretien',   label: 'Entretien' },
  { value: 'completed',   label: 'Terminé' },
  { value: 'cancelled',   label: 'Annulé' },
]

const COUNTRY_OPTIONS = [
  { value: '', label: 'Tous les pays' },
  { value: 'TN', label: 'Tunisie' },
  { value: 'FR', label: 'France' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'MR', label: 'Mauritanie' },
  { value: 'OM', label: 'Oman' },
  { value: 'QA', label: 'Qatar' },
  { value: 'LY', label: 'Libye' },
]

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function fmt(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const TABLE_HEADS = [
  { label: 'Réf.',         className: 'hidden md:table-cell w-24' },
  { label: 'Projet',       className: '' },
  { label: 'Client',       className: 'hidden lg:table-cell' },
  { label: 'Type',         className: 'hidden xl:table-cell' },
  { label: 'Pays',         className: 'hidden sm:table-cell w-12 text-center' },
  { label: 'Phase',        className: 'w-28' },
  { label: 'Budget utilisé', className: 'hidden md:table-cell' },
  { label: 'Livraison',    className: 'hidden xl:table-cell' },
  { label: 'Créé',         className: 'hidden xl:table-cell' },
]

export function ProjectsTable({ userRole }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [rows, setRows]         = useState<ProjectRow[]>([])
  const [total, setTotal]       = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const currentStatus  = searchParams.get('status') ?? ''
  const currentType    = searchParams.get('projectType') ?? ''
  const currentCountry = searchParams.get('country') ?? ''
  const page           = parseInt(searchParams.get('page') ?? '1', 10)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (currentStatus)  params.set('status', currentStatus)
    if (currentType)    params.set('projectType', currentType)
    if (currentCountry) params.set('country', currentCountry)
    params.set('page', String(page))
    params.set('pageSize', '25')
    fetch(`/api/projects?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => { setRows(data.rows ?? []); setTotal(data.total ?? 0); setPageSize(data.pageSize ?? 25); setLoading(false) })
      .catch(() => { setError('Impossible de charger les projets. Réessayez.'); setLoading(false) })
  }, [currentStatus, currentType, currentCountry, page, retryTick])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)

  const triggerStyle = { borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-surface)' }
  const contentStyle = { borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-surface)' }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div
        className="flex flex-wrap gap-2 items-center px-3 py-2"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
      >
        <Select value={currentStatus === '' ? '__all__' : currentStatus} onValueChange={(v) => updateParam('status', v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-8 text-[13px] w-auto min-w-[130px]" style={triggerStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={contentStyle}>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value} className="text-[13px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentType === '' ? '__all__' : currentType} onValueChange={(v) => updateParam('projectType', v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-8 text-[13px] w-auto min-w-[140px]" style={triggerStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={contentStyle}>
            {TYPE_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value} className="text-[13px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentCountry === '' ? '__all__' : currentCountry} onValueChange={(v) => updateParam('country', v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-8 text-[13px] w-auto min-w-[120px]" style={triggerStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={contentStyle}>
            {COUNTRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value} className="text-[13px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
          {total} projet{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
      >
        {loading ? (
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="h-4 rounded w-20" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 rounded flex-1" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 rounded w-24" style={{ background: 'var(--admin-border)' }} />
                <div className="h-4 rounded w-16" style={{ background: 'var(--admin-border)' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm mb-3" style={{ color: 'var(--admin-red)' }}>{error}</p>
            <Button variant="outline" size="sm" onClick={() => setRetryTick((t) => t + 1)}>
              Réessayer
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Aucun projet trouvé"
            description="Modifiez les filtres pour afficher d'autres résultats."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10" style={{ background: 'var(--admin-surface)' }}>
                <TableRow style={{ borderColor: 'var(--admin-border)' }}>
                  {TABLE_HEADS.map((h) => (
                    <TableHead
                      key={h.label}
                      className={`py-2.5 text-[11px] font-medium ${h.className}`}
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="admin-tr transition-colors duration-100"
                    style={{ borderColor: 'var(--admin-border)' }}
                  >
                    <TableCell className="hidden md:table-cell py-2.5 font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {row.reference}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Link
                        href={`/admin/projects/${row.id}`}
                        className="text-[13px] font-medium hover:underline"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        {row.name}
                      </Link>
                      <div className="md:hidden mt-0.5 text-[11px] font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {row.reference}
                      </div>
                      {row.dmsDocumentCode && (
                        <div className="mt-0.5 text-[10px] font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                          {row.dmsDocumentCode}
                        </div>
                      )}
                      <div className="lg:hidden mt-0.5 text-[11px] truncate max-w-[12rem]" style={{ color: 'var(--admin-text-muted)' }}>
                        {row.clientName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2.5 text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {row.clientName}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell py-2.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {TYPE_LABELS[row.projectType] ?? row.projectType}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2.5 text-center text-base">
                      {row.country ? countryFlag(row.country) : ''}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <PhaseBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2.5">
                      <div className="flex items-center gap-2">
                        <BudgetBadge approved={row.approvedBudget} spent={row.spent} />
                        {row.approvedBudget && (
                          <span className="text-[11px] tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>
                            {Number(row.spent ?? 0).toLocaleString('fr-FR')} / {Number(row.approvedBudget).toLocaleString('fr-FR')}{row.currency ? ` ${row.currency}` : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell py-2.5 text-[12px] tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmt(row.estimatedDeliveryDate)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell py-2.5 text-[12px] tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmt(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
            Page {page} sur {totalPages} · {total} résultats
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Préc.
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParam('page', String(page + 1))}
            >
              Suiv. <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
