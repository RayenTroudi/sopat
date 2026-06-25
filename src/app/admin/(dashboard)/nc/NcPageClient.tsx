'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, AlertTriangle, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NcListItem } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'

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
const PROCESS_LABELS: Record<string, string> = {
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
}
const NC_TYPE_LABELS: Record<string, string> = {
  technique:          'Technique',
  documentaire:       'Doc.',
  reclamation_client: 'Réclamation client',
  audit:              'Audit',
  systeme:            'Système',
}

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string; email: string; role: string }
type Project = { id: string; name: string; reference: string }

type Props = {
  initialRows:     NcListItem[]
  total:           number
  users:           User[]
  projects:        Project[]
  currentUserId:   string
  currentUserName: string
}

const selectClass = 'text-sm border rounded-lg pl-3 pr-8 py-1.5 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }
const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

export function NcPageClient({ initialRows, total, users, projects, currentUserId, currentUserName }: Props) {
  const [rows, setRows]           = useState(initialRows)
  const [showForm, setShowForm]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)

  const [form, setForm] = useState({
    projectId:   '',
    ncType:      '',
    ownerType:   '',
    auditorName: '',
    description: '',
    rootCause:   '',
    assignedTo:  '',
    deadline:    '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  async function loadNcs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus)  params.set('status',  filterStatus)
    if (filterProcess) params.set('process', filterProcess)
    if (search)        params.set('search',  search)
    const res = await fetch(`/api/nc?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: NcListItem[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

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
        projectId:   form.projectId || undefined,
        ncType:      form.ncType || undefined,
        ownerType:   form.ownerType || undefined,
        auditorName: form.auditorName || undefined,
        description: form.description,
        rootCause:   form.rootCause || undefined,
        assignedTo:  form.assignedTo || undefined,
        deadline:    form.deadline ? new Date(form.deadline).toISOString() : undefined,
      }),
    })
    const data = await res.json() as { id?: string; error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ projectId: '', ncType: '', ownerType: '', auditorName: '', description: '', rootCause: '', assignedTo: '', deadline: '' })
    await loadNcs()
    setSubmitting(false)
  }

  const openCount = rows.filter((r) => r.status === 'open' || r.status === 'in_progress').length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Non-Conformités</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 10.2 · {openCount} ouverte{openCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          style={{ background: 'var(--admin-red)' }}
          className="text-white hover:opacity-90 w-full sm:w-auto"
        >
          + Créer une NC
        </Button>
      </div>

      {/* Filters bar */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:items-center p-3 rounded-xl border"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <Select
          value={filterStatus === '' ? '__all__' : filterStatus}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterStatus(next); setTimeout(() => void loadNcs(), 0) }}
        >
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filterProcess === '' ? '__all__' : filterProcess}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterProcess(next); setTimeout(() => void loadNcs(), 0) }}
        >
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous processus</SelectItem>
            {Object.entries(PROCESS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadNcs()}
            placeholder="Rechercher…"
            className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]"
            style={selectStyle}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadNcs()}
          className="sm:col-span-2 lg:col-span-1 w-full lg:w-auto"
          style={{ borderColor: 'var(--admin-border-light)', color: 'var(--admin-text-muted)' }}
        >Filtrer</Button>
      </div>

      {/* List */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {loading ? (
          <TableSkeleton columns={8} />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Aucune non-conformité trouvée" description="Modifiez vos filtres ou créez une nouvelle NC." />
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {rows.map((nc) => {
                const overdue = nc.deadline && new Date(nc.deadline) < new Date()
                return (
                  <li key={nc.id} style={{ borderColor: 'var(--admin-border)' }}>
                    <Link
                      href={`/admin/nc/${nc.id}`}
                      className="block px-4 py-3 active:bg-[var(--admin-bg)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{nc.reference}</span>
                            {nc.dmsDocumentCode && (
                              <span
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                              >
                                {nc.dmsDocumentCode}
                              </span>
                            )}
                            <Badge className={cn('text-[10px] font-medium rounded-full px-2 py-0', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                              {STATUS_LABELS[nc.status] ?? nc.status}
                            </Badge>
                            <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                              {NC_TYPE_LABELS[nc.ncType ?? ''] ?? PROCESS_LABELS[nc.processAffected] ?? '—'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm line-clamp-2" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div className="min-w-0">
                              <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Projet</dt>
                              <dd className="truncate" style={{ color: nc.projectName ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>{nc.projectName ?? '—'}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Assigné à</dt>
                              <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{nc.assignedToName ?? '—'}</dd>
                            </div>
                            <div className="min-w-0 col-span-2">
                              <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Délai</dt>
                              <dd style={{ color: overdue ? 'var(--admin-red)' : 'var(--admin-text)' }}>
                                {nc.deadline ? fmt(nc.deadline) : '—'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <ArrowRight className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--admin-text-muted)' }} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10" style={{ background: 'var(--admin-surface)' }}>
                  <TableRow style={{ borderColor: 'var(--admin-border)' }}>
                    {['Référence', 'Statut', 'Type', 'Description', 'Projet', 'Assigné à', 'Délai', ''].map((h) => (
                      <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((nc) => (
                    <TableRow
                      key={nc.id}
                      className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors duration-100"
                      style={{ borderColor: 'var(--admin-border)' }}
                    >
                      <TableCell className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {nc.reference}
                          {nc.dmsDocumentCode && (
                            <span
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                            >
                              {nc.dmsDocumentCode}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs font-medium rounded-full', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                          {STATUS_LABELS[nc.status] ?? nc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {NC_TYPE_LABELS[nc.ncType ?? ''] ?? PROCESS_LABELS[nc.processAffected] ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate text-sm" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px]">
                        <p className="truncate" style={{ color: nc.projectName ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>{nc.projectName ?? '—'}</p>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{nc.assignedToName ?? '—'}</TableCell>
                      <TableCell className="text-xs" style={{ color: nc.deadline && new Date(nc.deadline) < new Date() ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                        {nc.deadline ? fmt(nc.deadline) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild aria-label="Voir la non-conformité">
                          <Link href={`/admin/nc/${nc.id}`}><ArrowRight className="w-3.5 h-3.5" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Create NC Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
          <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Créer une Non-Conformité</SheetTitle>
            <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 10.2</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormField label="Projet lié (optionnel)">
              <Select
                value={form.projectId === '' ? '__none__' : form.projectId}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="— Aucun projet —" />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">— Aucun projet —</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.reference} · {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Type de NC">
              <Select
                value={form.ncType === '' ? '__none__' : form.ncType}
                onValueChange={(v) => setForm((f) => ({ ...f, ncType: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="-- Sélectionner --" />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">-- Sélectionner --</SelectItem>
                  {Object.entries(NC_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Propriétaire">
              <Select
                value={form.ownerType === '' ? '__none__' : form.ownerType}
                onValueChange={(v) => setForm((f) => ({ ...f, ownerType: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="-- Sélectionner --" />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">-- Sélectionner --</SelectItem>
                  <SelectItem value="interne">Interne</SelectItem>
                  <SelectItem value="externe">Externe</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {form.ncType === 'audit' && (
              <FormField label="Nom de l'auditeur">
                <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))} className={inputClass} style={inputStyle} placeholder="Nom de l'auditeur" />
              </FormField>
            )}
            <FormField label="Description de la non-conformité *">
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Décrivez précisément la non-conformité observée…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
            </FormField>
            <FormField label="Analyse des causes (optionnel)">
              <textarea value={form.rootCause} onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))} rows={2} placeholder="Cause(s) racine identifiée(s)…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
            </FormField>
            <FormField label="Assigné à">
              <Select
                value={form.assignedTo === '' ? '__none__' : form.assignedTo}
                onValueChange={(v) => setForm((f) => ({ ...f, assignedTo: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="— Non assigné —" />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">— Non assigné —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Délai de traitement">
              <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className={inputClass} style={inputStyle} />
            </FormField>
            {formError && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting} style={{ background: 'var(--admin-red)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer la NC'}
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
