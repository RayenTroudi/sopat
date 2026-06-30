'use client'

import { useState } from 'react'
import { Calendar, CheckCircle, Clock, AlertTriangle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditProgramRow } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié', en_cours: 'En cours', realise: 'Réalisé',
  reporte: 'Reporté', annule: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  planifie: 'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  en_cours: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  realise:  'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
  reporte:  'bg-[var(--admin-red-dim)] text-[var(--admin-red)] border-transparent',
  annule:   'bg-[var(--admin-border)] text-[var(--admin-text-muted)] border-transparent',
}
const DEPT_LABELS: Record<string, string> = {
  AC: 'AC – Achats', CO: 'CO – Commercial', ET: 'ET – Études',
  MI: 'MI – Management Qualité', RE1: 'RE1 – Réalisation 1',
  RE2: 'RE2 – Réalisation 2', RH: 'RH – Ressources Humaines',
}

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const currentYear = new Date().getFullYear()

// ─── Types ────────────────────────────────────────────────────────────────────

type User = { id: string; name: string; email: string; role: string }

type Props = {
  initialRows: AuditProgramRow[]
  users:       User[]
  currentUserId: string
  canEdit:     boolean
}

type FormState = {
  dept:               string
  title:              string
  auditorName:        string
  auditeeResponsible: string
  scheduledDate:      string
  actualDate:         string
  status:             string
  scope:              string
  objectives:         string
  criteria:           string
  findings:           string
  notes:              string
}

const EMPTY_FORM: FormState = {
  dept: '', title: '', auditorName: '', auditeeResponsible: '',
  scheduledDate: '', actualDate: '', status: 'planifie',
  scope: '', objectives: '', criteria: '', findings: '', notes: '',
}

const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditProgramsClient({ initialRows, users, currentUserId, canEdit }: Props) {
  const [rows, setRows]             = useState(initialRows)
  const [showForm, setShowForm]     = useState(false)
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<Partial<FormState>>({})

  // ── Stats ──────────────────────────────────────────────────────────────────
  const byDept = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.dept] = (acc[r.dept] ?? 0) + 1; return acc
  }, {})
  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc
  }, {})
  const totalRealise = byStatus['realise'] ?? 0
  const pct = rows.length > 0 ? Math.round((totalRealise / rows.length) * 100) : 0

  // ── Load ───────────────────────────────────────────────────────────────────
  async function loadRows() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterDept)   params.set('dept',   filterDept)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/audit-programs?${params}`)
    if (res.ok) setRows(await res.json() as AuditProgramRow[])
    setLoading(false)
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.dept) { setFormError('Sélectionnez un département'); return }
    setSubmitting(true)
    setFormError('')
    const res = await fetch('/api/audit-programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dept:               form.dept,
        title:              form.title         || undefined,
        auditorName:        form.auditorName   || undefined,
        auditeeResponsible: form.auditeeResponsible || undefined,
        scheduledDate:      form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        actualDate:         form.actualDate    ? new Date(form.actualDate).toISOString()    : undefined,
        status:             form.status        || undefined,
        scope:              form.scope         || undefined,
        objectives:         form.objectives    || undefined,
        criteria:           form.criteria      || undefined,
        findings:           form.findings      || undefined,
        notes:              form.notes         || undefined,
      }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    await loadRows()
    setSubmitting(false)
  }

  // ── Update status ──────────────────────────────────────────────────────────
  async function patchRow(id: string, patch: Partial<FormState>) {
    const body: Record<string, unknown> = {}
    if (patch.status)       body.status       = patch.status
    if (patch.findings)     body.findings     = patch.findings
    if (patch.actualDate)   body.actualDate   = new Date(patch.actualDate).toISOString()
    if (patch.objectives)   body.objectives   = patch.objectives
    if (patch.scope)        body.scope        = patch.scope
    if (patch.criteria)     body.criteria     = patch.criteria
    if (patch.notes)        body.notes        = patch.notes
    const res = await fetch(`/api/audit-programs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) await loadRows()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Programmes d&apos;audit interne
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-14 · ISO 9001:2015 clause 9.2 · {rows.length} programme{rows.length !== 1 ? 's' : ''} · {pct}% réalisés
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)} style={{ background: 'var(--admin-blue)' }}
            className="text-white hover:opacity-90 w-full sm:w-auto">
            + Nouveau programme d&apos;audit
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Avancement du programme {currentYear}</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--admin-emerald)' }}>{totalRealise} / {rows.length} réalisés ({pct}%)</p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--admin-emerald)' }} />
        </div>
        {/* Status summary */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(byStatus).map(([s, n]) => (
            <span key={s} className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[s] ?? '')}>
              {STATUS_LABELS[s] ?? s} · {n}
            </span>
          ))}
        </div>
      </div>

      {/* Dept distribution */}
      {Object.keys(byDept).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byDept).map(([dept, cnt]) => (
            <button key={dept}
              onClick={() => { setFilterDept(dept === filterDept ? '' : dept); setTimeout(() => void loadRows(), 0) }}
              className={cn('text-xs px-2.5 py-1 rounded-full border font-mono transition-colors', filterDept === dept ? 'font-semibold' : '')}
              style={{
                borderColor: 'var(--admin-border)',
                background: filterDept === dept ? 'var(--admin-text)' : 'var(--admin-bg)',
                color: filterDept === dept ? 'var(--admin-surface)' : 'var(--admin-text)',
              }}>
              {dept} · {cnt}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border items-center"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <Select value={filterDept || '__all__'}
          onValueChange={(v) => { setFilterDept(v === '__all__' ? '' : v); setTimeout(() => void loadRows(), 0) }}>
          <SelectTrigger className="text-sm h-9 w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
          <SelectContent style={selectStyle}>
            <SelectItem value="__all__">Tous dépt.</SelectItem>
            {Object.entries(DEPT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{v} – {l.split(' – ')[1]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus || '__all__'}
          onValueChange={(v) => { setFilterStatus(v === '__all__' ? '' : v); setTimeout(() => void loadRows(), 0) }}>
          <SelectTrigger className="text-sm h-9 w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
          <SelectContent style={selectStyle}>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void loadRows()}
          style={{ borderColor: 'var(--admin-border-light)', color: 'var(--admin-text-muted)' }}>
          Filtrer
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--admin-text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Calendar} title="Aucun programme d'audit" description="Créez le programme d'audit annuel par département." />
        ) : (
          rows.map((row) => (
            <AuditProgramCard
              key={row.id}
              row={row}
              canEdit={canEdit}
              expanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onPatch={(patch) => void patchRow(row.id, patch)}
            />
          ))
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setForm(EMPTY_FORM) }}>
        <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
          <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Nouveau programme d&apos;audit</SheetTitle>
            <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>FOR-MI-14 · ISO 9001:2015 clause 9.2</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Département *">
                <Select value={form.dept || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, dept: v === '__none__' ? '' : v }))}>
                  <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent style={selectStyle}>
                    <SelectItem value="__none__">—</SelectItem>
                    {Object.entries(DEPT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Statut">
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger style={selectStyle}><SelectValue /></SelectTrigger>
                  <SelectContent style={selectStyle}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField label="Titre">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass} style={inputStyle} placeholder="ex: Audit interne AC 2025" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Auditeur">
                <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                  className={inputClass} style={inputStyle} placeholder="Nom de l'auditeur" />
              </FormField>
              <FormField label="Responsable audité">
                <input value={form.auditeeResponsible} onChange={(e) => setForm((f) => ({ ...f, auditeeResponsible: e.target.value }))}
                  className={inputClass} style={inputStyle} placeholder="Responsable du dépt." />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date prévue">
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                  className={inputClass} style={inputStyle} />
              </FormField>
              <FormField label="Date réalisée">
                <input type="date" value={form.actualDate} onChange={(e) => setForm((f) => ({ ...f, actualDate: e.target.value }))}
                  className={inputClass} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Périmètre d'audit">
              <textarea value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                rows={2} className={cn(inputClass, 'resize-none')} style={inputStyle} placeholder="Périmètre couvert par cet audit…" />
            </FormField>
            <FormField label="Objectifs">
              <textarea value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
                rows={2} className={cn(inputClass, 'resize-none')} style={inputStyle} placeholder="Objectifs de l'audit…" />
            </FormField>
            <FormField label="Critères (clauses ISO 9001)">
              <input value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))}
                className={inputClass} style={inputStyle} placeholder="ex: 8.4.1, 8.5.1, 9.1.2" />
            </FormField>
            <FormField label="Constats">
              <textarea value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))}
                rows={3} className={cn(inputClass, 'resize-none')} style={inputStyle} placeholder="Constats de l'audit…" />
            </FormField>
            <FormField label="Notes">
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={inputClass} style={inputStyle} placeholder="Notes complémentaires…" />
            </FormField>
            {formError && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting}
              style={{ background: 'var(--admin-blue)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création…</> : 'Créer le programme'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Audit Program Card ───────────────────────────────────────────────────────

function AuditProgramCard({ row, canEdit, expanded, onToggle, onPatch }: {
  row: AuditProgramRow
  canEdit: boolean
  expanded: boolean
  onToggle: () => void
  onPatch: (patch: { status?: string; findings?: string; actualDate?: string }) => void
}) {
  const [editStatus, setEditStatus] = useState(row.status)
  const [findings, setFindings]     = useState(row.findings ?? '')
  const [actualDate, setActualDate] = useState(row.actualDate ? new Date(row.actualDate).toISOString().split('T')[0] : '')
  const [saving, setSaving]         = useState(false)

  async function save() {
    setSaving(true)
    onPatch({ status: editStatus, findings: findings || undefined, actualDate: actualDate || undefined })
    setSaving(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      {/* Row header */}
      <button className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[var(--admin-bg)] transition-colors" onClick={onToggle}>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              {row.dept}
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{row.reference}</span>
            {row.dmsDocumentCode && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                {row.dmsDocumentCode}
              </span>
            )}
            <Badge className={cn('text-[10px] font-medium rounded-full border', STATUS_COLORS[row.status] ?? '')}>
              {STATUS_LABELS[row.status] ?? row.status}
            </Badge>
          </div>
          <p className="text-sm mt-1 truncate" style={{ color: 'var(--admin-text)' }}>
            {row.title ?? `Audit ${row.dept} ${row.year}`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {row.auditorName ? `Auditeur : ${row.auditorName}` : ''}
            {row.auditeeResponsible ? ` · Audité : ${row.auditeeResponsible}` : ''}
            {row.scheduledDate ? ` · Prévu : ${new Date(row.scheduledDate).toLocaleDateString('fr-FR')}` : ''}
            {row.actualDate    ? ` · Réalisé : ${new Date(row.actualDate).toLocaleDateString('fr-FR')}` : ''}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
                  : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          {row.scope && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Périmètre</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.scope}</p>
            </div>
          )}
          {row.objectives && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Objectifs</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.objectives}</p>
            </div>
          )}
          {row.criteria && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Critères</p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{row.criteria}</p>
            </div>
          )}

          {canEdit && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>Mise à jour</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Statut</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="text-sm h-8" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Date réalisée</label>
                  <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Constats</label>
                <textarea value={findings} onChange={(e) => setFindings(e.target.value)}
                  rows={3} placeholder="Constats de l'audit, NC détectées…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
              <Button size="sm" onClick={() => void save()} disabled={saving}
                style={{ background: 'var(--admin-blue)' }} className="text-white">
                {saving ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Enregistrement…</> : 'Enregistrer'}
              </Button>
            </div>
          )}

          {row.findings && !canEdit && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Constats</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.findings}</p>
            </div>
          )}
          {row.notes && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Notes</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.notes}</p>
            </div>
          )}
        </div>
      )}
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
