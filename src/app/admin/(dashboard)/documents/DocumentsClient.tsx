'use client'
// src/app/admin/(dashboard)/documents/DocumentsClient.tsx

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DmsDocRow } from '@/lib/dms/queries'
import {
  TYPE_CODES, PROCESS_CODES, TYPE_LABELS, PROCESS_LABELS,
  type TypeCode, type ProcessCode,
} from '@/lib/dms/codes'

// ── Label maps ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:            'Brouillon',
  in_review:        'En révision',
  pending_approval: 'En attente approbation',
  approved:         'Approuvé',
  effective:        'En vigueur',
  under_revision:   'En cours de révision',
  obsolete:         'Obsolète',
  archived:         'Archivé',
}

const STATUS_COLORS: Record<string, string> = {
  draft:            'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  in_review:        'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  pending_approval: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approved:         'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  effective:        'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  under_revision:   'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  obsolete:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
  archived:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
}

function simplifiedStatus(status: string): { label: string; className: string } {
  if (status === 'effective' || status === 'approved') {
    return { label: 'Ajout', className: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]' }
  }
  if (status === 'archived' || status === 'obsolete') {
    return { label: 'Éliminer', className: 'bg-[var(--admin-border)] text-[var(--admin-text-muted)]' }
  }
  return { label: 'En cours', className: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]' }
}

const CATEGORY_LABELS: Record<string, string> = {
  manuel_qualite:        'Manuel qualité',
  politique:             'Politique',
  procedure:             'Procédure',
  instruction:           'Instruction',
  formulaire:            'Formulaire / Fiche',
  enregistrement:        'Enregistrement',
  plan_qualite:          'Plan',
  cartographie_processus:'Cartographie / Processus',
  etude_technique:       'Étude technique',
  devis:                 'Devis',
  contrat:               'Contrat',
  bon_commande:          'Bon de commande',
  facture:               'Facture',
  rapport_inspection:    'Rapport d\'inspection',
  rapport_audit:         'Rapport d\'audit',
  ncr:                   'NCR',
  capa:                  'CAPA',
  document_fournisseur:  'Document fournisseur',
  document_client:       'Document client',
  externe:               'Document externe',
}

const DEPARTMENT_LABELS: Record<string, string> = {
  direction:   'Direction',
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
  qualite:     'Qualité',
  finance:     'Finance / Achat',
  rh:          'Ressources Humaines',
  rse:         'RSE',
  transverse:  'Transverse',
}

// ── Row highlight ────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

function rowHighlight(doc: DmsDocRow): React.CSSProperties {
  const isEliminated = doc.status === 'obsolete' || doc.status === 'archived'
  if (isEliminated) return { background: 'rgba(239,68,68,0.07)' }

  const isAddedThisYear = new Date(doc.createdAt).getFullYear() === CURRENT_YEAR
  if (isAddedThisYear) return { background: 'rgba(16,185,129,0.07)' }

  return {}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string }

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  users:         User[]
  canEdit:       boolean
  currentUserId: string
}

// ── Form state ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  typeCode:    '' as TypeCode | '',
  processCode: '' as ProcessCode | '',
  documentNumber: '',
  title:       '',
  category:    'procedure',
  department:  'qualite',
  ownerId:     '',
  confidentiality: 'internal',
  isoClauses:  '',
}

// ── Component ────────────────────────────────────────────────────────────────

export function DmsDocumentsClient({ users, canEdit, currentUserId }: Props) {
  const [rows, setRows]         = useState<DmsDocRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [search,        setSearch]        = useState('')

  const [form, setForm]             = useState({ ...EMPTY_FORM, ownerId: currentUserId })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [codePreview, setCodePreview] = useState('')

  useEffect(() => { loadDocs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDocs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus)  params.set('status',      filterStatus)
    if (filterType)    params.set('typeCode',     filterType)
    if (filterProcess) params.set('processCode',  filterProcess)
    if (search)        params.set('search',       search)
    const res = await fetch(`/api/dms?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: DmsDocRow[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

  async function handleTypeProcessChange(type: string, process: string) {
    if (!type || !process) { setCodePreview(''); return }
    const res = await fetch(`/api/dms/next-code?type=${type}&process=${process}`)
    if (res.ok) {
      const data = await res.json() as { code: string }
      setCodePreview(data.code)
      setForm(f => ({ ...f, documentNumber: data.code }))
    }
  }

  async function handleCreate() {
    if (!form.documentNumber) { setFormError('Le code est obligatoire'); return }
    if (!form.title.trim())   { setFormError('Le titre est obligatoire'); return }
    if (!form.typeCode || !form.processCode) {
      setFormError('Sélectionnez un type et un processus'); return
    }
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/dms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentNumber:  form.documentNumber,
        title:           form.title,
        category:        form.category,
        department:      form.department,
        ownerId:         form.ownerId,
        confidentiality: form.confidentiality,
        isoClauses:      form.isoClauses ? form.isoClauses.split(',').map(s => s.trim()).filter(Boolean) : [],
      }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ ...EMPTY_FORM, ownerId: currentUserId })
    setCodePreview('')
    await loadDocs()
    setSubmitting(false)
  }

  const activeCount = rows.filter(r => r.status === 'effective').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Informations Documentées
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · §7.5 · {activeCount} document{activeCount !== 1 ? 's' : ''} en vigueur
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white w-full sm:w-auto"
            style={{ background: 'var(--admin-emerald)' }}
          >
            <span>+</span> Nouveau document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
        <Select
          value={filterStatus === '' ? '__all__' : filterStatus}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterStatus(next); setTimeout(() => void loadDocs(), 0) }}
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
          value={filterType === '' ? '__all__' : filterType}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterType(next); setTimeout(() => void loadDocs(), 0) }}
        >
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous types</SelectItem>
            {TYPE_CODES.map(t => <SelectItem key={t} value={t}>{t} – {TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={filterProcess === '' ? '__all__' : filterProcess}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterProcess(next); setTimeout(() => void loadDocs(), 0) }}
        >
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous processus</SelectItem>
            {PROCESS_CODES.map(p => <SelectItem key={p} value={p}>{p} – {PROCESS_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadDocs()}
          placeholder="Code ou titre…"
          className="text-sm px-3 py-1.5 rounded-lg border w-full sm:col-span-2 lg:flex-1 lg:col-span-1 lg:min-w-[160px] outline-none focus:ring-2 focus:ring-[var(--admin-border-light)] focus:border-[var(--admin-border-light)]"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => void loadDocs()}
          className="text-sm px-3 py-1.5 rounded-lg border w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun document trouvé.</p>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {rows.map((doc) => {
                const codeParts = doc.documentNumber.split('-')
                const typeCode = codeParts[0] ?? ''
                const processCode = codeParts[1] ?? ''
                const s = simplifiedStatus(doc.status)
                return (
                  <li key={doc.id} className="px-4 py-3" style={{ borderColor: 'var(--admin-border)', ...rowHighlight(doc) }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{doc.documentNumber}</span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', s.className)}>{s.label}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium line-clamp-2" style={{ color: 'var(--admin-text)' }}>{doc.title}</p>
                        {doc.isoClauses.length > 0 && (
                          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>ISO {doc.isoClauses.join(', ')}</p>
                        )}
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Type / Proc.</dt>
                            <dd className="font-mono truncate" style={{ color: 'var(--admin-text)' }}>{typeCode} · {processCode}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Département</dt>
                            <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{DEPARTMENT_LABELS[doc.department] ?? doc.department}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Responsable</dt>
                            <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{doc.ownerName ?? '—'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>En vigueur</dt>
                            <dd style={{ color: 'var(--admin-text)' }}>{fmt(doc.effectiveDate)}</dd>
                          </div>
                        </dl>
                        {doc.assetUrl && (
                          <a href={doc.assetUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs underline" style={{ color: 'var(--admin-blue)' }}>Ouvrir PDF</a>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Code', 'Désignation', 'Type', 'Processus', 'Département', 'Statut', 'Responsable', 'En vigueur', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => {
                  const codeParts = doc.documentNumber.split('-')
                  const typeCode    = codeParts[0] ?? ''
                  const processCode = codeParts[1] ?? ''
                  return (
                    <tr key={doc.id} className="transition-colors hover:bg-[var(--admin-bg)]" style={{ borderBottom: '1px solid var(--admin-border)', ...rowHighlight(doc) }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {doc.documentNumber}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{doc.title}</p>
                        {doc.isoClauses.length > 0 && (
                          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>ISO {doc.isoClauses.join(', ')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {typeCode}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {processCode}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {DEPARTMENT_LABELS[doc.department] ?? doc.department}
                      </td>
                      <td className="px-4 py-3">
                        {(() => { const s = simplifiedStatus(doc.status); return <span className={cn('text-xs px-2 py-0.5 rounded font-medium', s.className)}>{s.label}</span> })()}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {doc.ownerName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {fmt(doc.effectiveDate)}
                      </td>
                      <td className="px-4 py-3">
                        {doc.assetUrl && (
                          <a href={doc.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>PDF</a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Create drawer */}
      {showForm && canEdit && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Nouveau document</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color: 'var(--admin-text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">

              {/* Type + Process selectors — drive code generation */}
              <div className="grid grid-cols-2 gap-3">
                <FF label="Type *">
                  <Select
                    value={form.typeCode === '' ? '__none__' : form.typeCode}
                    onValueChange={(v) => {
                      const t = (v === '__none__' ? '' : v) as TypeCode | ''
                      setForm(f => ({ ...f, typeCode: t }))
                      if (t) void handleTypeProcessChange(t, form.processCode)
                    }}
                  >
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue placeholder="— Choisir —" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="__none__">— Choisir —</SelectItem>
                      {TYPE_CODES.map(t => <SelectItem key={t} value={t}>{t} – {TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FF>
                <FF label="Processus *">
                  <Select
                    value={form.processCode === '' ? '__none__' : form.processCode}
                    onValueChange={(v) => {
                      const p = (v === '__none__' ? '' : v) as ProcessCode | ''
                      setForm(f => ({ ...f, processCode: p }))
                      if (p) void handleTypeProcessChange(form.typeCode, p)
                    }}
                  >
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue placeholder="— Choisir —" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="__none__">— Choisir —</SelectItem>
                      {PROCESS_CODES.map(p => <SelectItem key={p} value={p}>{p} – {PROCESS_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FF>
              </div>

              {/* Auto-generated code — readonly display */}
              <FF label="Code généré">
                <div
                  className="px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: codePreview ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}
                >
                  {codePreview || 'Sélectionner type + processus'}
                </div>
              </FF>

              <FF label="Désignation *">
                <input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Procédure de gestion des congés"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                />
              </FF>

              <div className="grid grid-cols-2 gap-3">
                <FF label="Catégorie DMS">
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FF>
                <FF label="Département">
                  <Select value={form.department} onValueChange={(v) => setForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      {Object.entries(DEPARTMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FF>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FF label="Confidentialité">
                  <Select value={form.confidentiality} onValueChange={(v) => setForm(f => ({ ...f, confidentiality: v }))}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Interne</SelectItem>
                      <SelectItem value="confidential">Confidentiel</SelectItem>
                      <SelectItem value="restricted">Restreint</SelectItem>
                    </SelectContent>
                  </Select>
                </FF>
                <FF label="Clauses ISO">
                  <input
                    value={form.isoClauses}
                    onChange={(e) => setForm(f => ({ ...f, isoClauses: e.target.value }))}
                    placeholder="ex: 7.5, 9.2"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  />
                </FF>
              </div>


              {formError && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
                <button onClick={() => void handleCreate()} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
