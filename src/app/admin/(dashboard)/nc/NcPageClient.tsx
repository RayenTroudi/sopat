'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, AlertTriangle, ArrowRight, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NcListItem } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

// ─── Labels & Colors ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open:        'Ouvert',
  in_progress: 'En cours',
  closed:      'Clôturé',
  verified:    'Vérifié',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-[var(--admin-red-dim)] text-[var(--admin-red)] border-transparent',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  closed:      'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  verified:    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
}
const NC_TYPE_LABELS: Record<string, string> = {
  technique:          'NC Technique',
  documentaire:       'NC Documentaire',
  reclamation_client: 'Réclamation Client',
  audit:              'Audit',
  systeme:            'NC Système',
}
const NC_SOURCE_LABELS: Record<string, string> = {
  interne:           'Interne',
  audit:             'Audit',
  reclamation_client:'Réclamation Client',
  reclamation_pi:    'Réclamation PI',
}
const DEPT_LABELS: Record<string, string> = {
  AC: 'AC – Achats', CO: 'CO – Commercial', ET: 'ET – Études',
  MI: 'MI – Management', RE1: 'RE1 – Réalisation 1',
  RE2: 'RE2 – Réalisation 2', RH: 'RH – Ressources Humaines',
}
const PROCESS_LABELS: Record<string, string> = {
  etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
}

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type User    = { id: string; name: string; email: string; role: string }
type Project = { id: string; name: string; reference: string }

type Props = {
  initialRows:     NcListItem[]
  total:           number
  users:           User[]
  projects:        Project[]
  currentUserId:   string
  currentUserName: string
  isAdmin:         boolean
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

type FormState = {
  projectId:                 string
  dept:                      string
  ncType:                    string
  ncSource:                  string
  ownerType:                 string
  auditorName:               string
  detectorName:              string
  referenceDoc:              string
  description:               string
  impact:                    string
  rootCause:                 string
  immediateCorrection:       string
  derogationAuth:            boolean
  rebut:                     boolean
  correctionResponsible:     string
  correctionDeadlinePlanned: string
  isRisk:                    boolean
  isOpportunity:             boolean
  assignedTo:                string
  deadline:                  string
}

const EMPTY_FORM: FormState = {
  projectId: '', dept: '', ncType: '', ncSource: '', ownerType: '',
  auditorName: '', detectorName: '', referenceDoc: '',
  description: '', impact: '', rootCause: '', immediateCorrection: '',
  derogationAuth: false, rebut: false, correctionResponsible: '',
  correctionDeadlinePlanned: '', isRisk: false, isOpportunity: false,
  assignedTo: '', deadline: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NcPageClient({ initialRows, total, users, projects, currentUserId, currentUserName, isAdmin }: Props) {
  const [rows, setRows]               = useState(initialRows)
  const [showForm, setShowForm]       = useState(false)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterDept, setFilterDept]       = useState('')
  const [filterSource, setFilterSource]   = useState('')
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<NcListItem | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState('')
  const [activeTab, setActiveTab]     = useState<'identification' | 'correction' | 'suivi'>('identification')

  // ── Stats ──────────────────────────────────────────────────────────────────

  const openCount      = rows.filter((r) => r.status === 'open' || r.status === 'in_progress').length
  const closedCount    = rows.filter((r) => r.status === 'closed' || r.status === 'verified').length
  const riskCount      = rows.filter((r) => r.isRisk).length
  const opportunityCount = rows.filter((r) => r.isOpportunity).length

  // NC by source
  const bySource: Record<string, number> = {}
  rows.forEach((r) => { if (r.ncSource) bySource[r.ncSource] = (bySource[r.ncSource] ?? 0) + 1 })

  // NC by dept
  const byDept: Record<string, number> = {}
  rows.forEach((r) => { if (r.dept) byDept[r.dept] = (byDept[r.dept] ?? 0) + 1 })

  // ── Load ───────────────────────────────────────────────────────────────────

  async function loadNcs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status',   filterStatus)
    if (filterDept)   params.set('dept',     filterDept)
    if (filterSource) params.set('ncSource', filterSource)
    if (search)       params.set('search',   search)
    const res = await fetch(`/api/nc?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: NcListItem[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

  async function handleDelete(nc: NcListItem) {
    setDeletingId(nc.id)
    const res = await fetch(`/api/nc/${nc.id}`, { method: 'DELETE' })
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== nc.id))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.description.trim() || form.description.length < 10) {
      setFormError('La description doit comporter au moins 10 caractères')
      return
    }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/nc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId:                 form.projectId  || undefined,
        dept:                      form.dept       || undefined,
        ncType:                    form.ncType     || undefined,
        ncSource:                  form.ncSource   || undefined,
        ownerType:                 form.ownerType  || undefined,
        auditorName:               form.auditorName    || undefined,
        detectorName:              form.detectorName   || undefined,
        referenceDoc:              form.referenceDoc   || undefined,
        description:               form.description,
        impact:                    form.impact         || undefined,
        rootCause:                 form.rootCause      || undefined,
        immediateCorrection:       form.immediateCorrection || undefined,
        derogationAuth:            form.derogationAuth || undefined,
        rebut:                     form.rebut          || undefined,
        correctionResponsible:     form.correctionResponsible || undefined,
        correctionDeadlinePlanned: form.correctionDeadlinePlanned ? new Date(form.correctionDeadlinePlanned).toISOString() : undefined,
        isRisk:                    form.isRisk       || undefined,
        isOpportunity:             form.isOpportunity || undefined,
        assignedTo:                form.assignedTo  || undefined,
        deadline:                  form.deadline ? new Date(form.deadline).toISOString() : undefined,
      }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    setActiveTab('identification')
    await loadNcs()
    setSubmitting(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Non-Conformités · PNC · Réclamations
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-05 · ISO 9001:2015 clause 10.2 · {total} enregistrée{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          style={{ background: 'var(--admin-red)' }}
          className="text-white hover:opacity-90 w-full sm:w-auto"
        >
          + Nouvelle NC / PNC / Réclamation
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En cours', value: openCount,        color: 'var(--admin-amber)', dim: 'var(--admin-amber-dim)' },
          { label: 'Clôturées', value: closedCount,     color: 'var(--admin-emerald)', dim: 'var(--admin-emerald-dim)' },
          { label: 'Risques',   value: riskCount,       color: 'var(--admin-red)', dim: 'var(--admin-red-dim)' },
          { label: 'Opportunités', value: opportunityCount, color: 'var(--admin-blue)', dim: 'var(--admin-blue-dim)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: s.dim }}>
            <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Source distribution */}
      {Object.keys(bySource).length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Répartition par source</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySource).map(([src, cnt]) => (
              <button
                key={src}
                onClick={() => { setFilterSource(src === filterSource ? '' : src); setTimeout(() => void loadNcs(), 0) }}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', filterSource === src ? 'font-semibold' : '')}
                style={{
                  borderColor: 'var(--admin-border)',
                  background: filterSource === src ? 'var(--admin-text)' : 'var(--admin-bg)',
                  color: filterSource === src ? 'var(--admin-surface)' : 'var(--admin-text)',
                }}
              >
                {NC_SOURCE_LABELS[src] ?? src} · {cnt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dept distribution */}
      {Object.keys(byDept).length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Répartition par département</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byDept).map(([dept, cnt]) => (
              <button
                key={dept}
                onClick={() => { setFilterDept(dept === filterDept ? '' : dept); setTimeout(() => void loadNcs(), 0) }}
                className={cn('text-xs px-2.5 py-1 rounded-full border font-mono transition-colors', filterDept === dept ? 'font-semibold' : '')}
                style={{
                  borderColor: 'var(--admin-border)',
                  background: filterDept === dept ? 'var(--admin-text)' : 'var(--admin-bg)',
                  color: filterDept === dept ? 'var(--admin-surface)' : 'var(--admin-text)',
                }}
              >
                {dept} · {cnt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:items-center p-3 rounded-xl border"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>

        <Select value={filterStatus === '' ? '__all__' : filterStatus}
          onValueChange={(v) => { setFilterStatus(v === '__all__' ? '' : v); setTimeout(() => void loadNcs(), 0) }}>
          <SelectTrigger className="text-sm h-9 w-full lg:w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
          <SelectContent style={selectStyle}>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterDept === '' ? '__all__' : filterDept}
          onValueChange={(v) => { setFilterDept(v === '__all__' ? '' : v); setTimeout(() => void loadNcs(), 0) }}>
          <SelectTrigger className="text-sm h-9 w-full lg:w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
          <SelectContent style={selectStyle}>
            <SelectItem value="__all__">Tous dépt.</SelectItem>
            {Object.keys(DEPT_LABELS).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterSource === '' ? '__all__' : filterSource}
          onValueChange={(v) => { setFilterSource(v === '__all__' ? '' : v); setTimeout(() => void loadNcs(), 0) }}>
          <SelectTrigger className="text-sm h-9 w-full lg:w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
          <SelectContent style={selectStyle}>
            <SelectItem value="__all__">Toutes sources</SelectItem>
            {Object.entries(NC_SOURCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadNcs()}
            placeholder="Rechercher…"
            className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]"
            style={selectStyle} />
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadNcs()}
          className="sm:col-span-2 lg:col-span-1 w-full lg:w-auto"
          style={{ borderColor: 'var(--admin-border-light)', color: 'var(--admin-text-muted)' }}>
          Filtrer
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {loading ? (
          <TableSkeleton columns={8} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Aucune NC trouvée" description="Modifiez vos filtres ou créez une nouvelle NC." />
        ) : (
          <>
            {/* Mobile */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {rows.map((nc) => {
                const overdue = nc.correctionDeadlinePlanned && new Date(nc.correctionDeadlinePlanned) < new Date() && nc.status !== 'closed' && nc.status !== 'verified'
                return (
                  <li key={nc.id} style={{ borderColor: 'var(--admin-border)' }}>
                    <Link href={`/admin/nc/${nc.id}`} className="block px-4 py-3 active:bg-[var(--admin-bg)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{nc.reference}</span>
                            {nc.dept && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>{nc.dept}</span>}
                            {nc.dmsDocumentCode && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{nc.dmsDocumentCode}</span>}
                            <Badge className={cn('text-[10px] font-medium rounded-full px-2 py-0', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                              {STATUS_LABELS[nc.status] ?? nc.status}
                            </Badge>
                            {nc.isRisk && <TrendingDown className="w-3 h-3" style={{ color: 'var(--admin-red)' }} />}
                            {nc.isOpportunity && <TrendingUp className="w-3 h-3" style={{ color: 'var(--admin-emerald)' }} />}
                          </div>
                          <p className="mt-1.5 text-sm line-clamp-2" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Source</dt>
                              <dd>{NC_SOURCE_LABELS[nc.ncSource ?? ''] ?? '—'}</dd></div>
                            <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Type</dt>
                              <dd>{NC_TYPE_LABELS[nc.ncType ?? ''] ?? '—'}</dd></div>
                            <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Délai correction</dt>
                              <dd style={{ color: overdue ? 'var(--admin-red)' : 'var(--admin-text)' }}>{fmt(nc.correctionDeadlinePlanned)}</dd></div>
                            <div><dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Assigné à</dt>
                              <dd>{nc.assignedToName ?? '—'}</dd></div>
                          </dl>
                        </div>
                        <ArrowRight className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--admin-text-muted)' }} />
                      </div>
                    </Link>
                    {isAdmin && <div className="px-4 pb-2"><DeleteButton variant="text" onClick={() => setConfirmDelete(nc)} /></div>}
                  </li>
                )
              })}
            </ul>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10" style={{ background: 'var(--admin-surface)' }}>
                  <TableRow style={{ borderColor: 'var(--admin-border)' }}>
                    {['N° / DMS', 'Dépt.', 'Statut', 'Source', 'Type', 'Description', 'Correction (prévu)', 'Assigné à', ''].map((h) => (
                      <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((nc) => {
                    const overdue = nc.correctionDeadlinePlanned && new Date(nc.correctionDeadlinePlanned) < new Date() && nc.status !== 'closed' && nc.status !== 'verified'
                    return (
                      <TableRow key={nc.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                        style={{ borderColor: 'var(--admin-border)' }}>
                        <TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                          <div className="flex flex-col gap-0.5">
                            <span>{nc.reference}</span>
                            {nc.dmsDocumentCode && (
                              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded w-fit"
                                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                                {nc.dmsDocumentCode}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {nc.dept ? (
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                              {nc.dept}
                            </span>
                          ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className={cn('text-xs font-medium rounded-full', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                              {STATUS_LABELS[nc.status] ?? nc.status}
                            </Badge>
                            {nc.isRisk && <TrendingDown className="w-3 h-3" style={{ color: 'var(--admin-red)' }} />}
                            {nc.isOpportunity && <TrendingUp className="w-3 h-3" style={{ color: 'var(--admin-emerald)' }} />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {NC_SOURCE_LABELS[nc.ncSource ?? ''] ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {NC_TYPE_LABELS[nc.ncType ?? ''] ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="truncate text-sm" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap"
                          style={{ color: overdue ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                          {fmt(nc.correctionDeadlinePlanned)}
                          {nc.correctionDeadlineActual && (
                            <div style={{ color: 'var(--admin-emerald)' }}>↳ {fmt(nc.correctionDeadlineActual)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{nc.assignedToName ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" asChild aria-label="Voir NC">
                              <Link href={`/admin/nc/${nc.id}`}><ArrowRight className="w-3.5 h-3.5" /></Link>
                            </Button>
                            {isAdmin && <DeleteButton variant="icon" onClick={() => setConfirmDelete(nc)} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Delete modal */}
      <DeleteModal
        open={!!confirmDelete}
        title="Supprimer la non-conformité ?"
        description={confirmDelete ? <><strong>{confirmDelete.reference}</strong> sera archivée.</> : null}
        loading={!!deletingId}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />

      {/* Create Sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setForm(EMPTY_FORM); setActiveTab('identification') } }}>
        <SheetContent side="right" className="w-full max-w-xl flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
          <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Nouvelle NC / PNC / Réclamation</SheetTitle>
            <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>FOR-MI-05 · ISO 9001:2015 clause 10.2</SheetDescription>
          </SheetHeader>

          {/* Tabs */}
          <div className="flex border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            {([
              ['identification', 'Identification'],
              ['correction',     'Correction immédiate'],
              ['suivi',          'Suivi & CAPA'],
            ] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                  activeTab === tab ? 'border-[var(--admin-red)]' : 'border-transparent')}
                style={{ color: activeTab === tab ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* ── Tab 1: Identification ── */}
            {activeTab === 'identification' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Département">
                    <Select value={form.dept || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, dept: v === '__none__' ? '' : v }))}>
                      <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent style={selectStyle}>
                        <SelectItem value="__none__">—</SelectItem>
                        {Object.entries(DEPT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{v} – {l.split(' – ')[1]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Source de NC *">
                    <Select value={form.ncSource || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, ncSource: v === '__none__' ? '' : v }))}>
                      <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent style={selectStyle}>
                        <SelectItem value="__none__">—</SelectItem>
                        {Object.entries(NC_SOURCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Type de NC">
                    <Select value={form.ncType || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, ncType: v === '__none__' ? '' : v }))}>
                      <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent style={selectStyle}>
                        <SelectItem value="__none__">—</SelectItem>
                        {Object.entries(NC_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Processus rattaché">
                    <Select value={form.ownerType || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, ownerType: v === '__none__' ? '' : v }))}>
                      <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent style={selectStyle}>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="interne">Interne</SelectItem>
                        <SelectItem value="externe">Externe</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Détecteur (nom)">
                    <input value={form.detectorName} onChange={(e) => setForm((f) => ({ ...f, detectorName: e.target.value }))}
                      className={inputClass} style={inputStyle} placeholder="Nom du détecteur" />
                  </FormField>
                  <FormField label="Document de référence">
                    <input value={form.referenceDoc} onChange={(e) => setForm((f) => ({ ...f, referenceDoc: e.target.value }))}
                      className={inputClass} style={inputStyle} placeholder="ex: NC N°1" />
                  </FormField>
                </div>

                {(form.ncSource === 'audit' || form.ncType === 'audit') && (
                  <FormField label="Nom de l'auditeur">
                    <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                      className={inputClass} style={inputStyle} placeholder="Nom de l'auditeur" />
                  </FormField>
                )}

                <FormField label="Projet lié (optionnel)">
                  <Select value={form.projectId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger style={selectStyle}><SelectValue placeholder="— Aucun —" /></SelectTrigger>
                    <SelectContent style={selectStyle}>
                      <SelectItem value="__none__">— Aucun —</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference} · {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Identification de la NC *">
                  <textarea value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4} placeholder="Décrivez précisément la non-conformité observée…"
                    className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FormField>

                <FormField label="Impact de la non-conformité">
                  <textarea value={form.impact}
                    onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))}
                    rows={2} placeholder="Quel est l'impact sur la qualité / client / coût…"
                    className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FormField>

                <FormField label="Analyse des causes">
                  <textarea value={form.rootCause}
                    onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))}
                    rows={2} placeholder="Cause(s) racine identifiée(s)…"
                    className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FormField>

                {/* Risk / Opportunity */}
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                    <input type="checkbox" checked={form.isRisk} onChange={(e) => setForm((f) => ({ ...f, isRisk: e.target.checked }))} className="accent-[var(--admin-red)]" />
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--admin-red)' }} /> Risque
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                    <input type="checkbox" checked={form.isOpportunity} onChange={(e) => setForm((f) => ({ ...f, isOpportunity: e.target.checked }))} className="accent-[var(--admin-emerald)]" />
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--admin-emerald)' }} /> Opportunité
                  </label>
                </div>
              </>
            )}

            {/* ── Tab 2: Correction immédiate ── */}
            {activeTab === 'correction' && (
              <>
                <FormField label="Correction immédiate">
                  <textarea value={form.immediateCorrection}
                    onChange={(e) => setForm((f) => ({ ...f, immediateCorrection: e.target.value }))}
                    rows={3} placeholder="Actions de correction immédiates prises…"
                    className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FormField>

                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                    <input type="checkbox" checked={form.derogationAuth} onChange={(e) => setForm((f) => ({ ...f, derogationAuth: e.target.checked }))} />
                    Autorisation de dérogation
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                    <input type="checkbox" checked={form.rebut} onChange={(e) => setForm((f) => ({ ...f, rebut: e.target.checked }))} />
                    Rebut
                  </label>
                </div>

                <FormField label="Responsable(s) de la correction">
                  <input value={form.correctionResponsible}
                    onChange={(e) => setForm((f) => ({ ...f, correctionResponsible: e.target.value }))}
                    className={inputClass} style={inputStyle} placeholder="Nom(s) du/des responsable(s)" />
                </FormField>

                <FormField label="Date de correction prévue">
                  <input type="date" value={form.correctionDeadlinePlanned}
                    onChange={(e) => setForm((f) => ({ ...f, correctionDeadlinePlanned: e.target.value }))}
                    className={inputClass} style={inputStyle} />
                </FormField>
              </>
            )}

            {/* ── Tab 3: Suivi & CAPA ── */}
            {activeTab === 'suivi' && (
              <>
                <FormField label="Assigné à (responsable CAPA)">
                  <Select value={form.assignedTo || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v === '__none__' ? '' : v }))}>
                    <SelectTrigger style={selectStyle}><SelectValue placeholder="— Non assigné —" /></SelectTrigger>
                    <SelectContent style={selectStyle}>
                      <SelectItem value="__none__">— Non assigné —</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Délai de traitement global">
                  <input type="date" value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className={inputClass} style={inputStyle} />
                </FormField>

                <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
                  Les actions correctives (CAPA) seront ajoutées depuis la fiche NC après création.
                </div>
              </>
            )}

            {formError && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting}
              style={{ background: 'var(--admin-red)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer la fiche NC'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{label}</label>
      {children}
    </div>
  )
}
