'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Loader2, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2,
  ClipboardCheck, Clock, CheckCircle2, BookOpen, Users, FileText, Check, ShieldAlert, Download,
} from 'lucide-react'
import type { AuditProgramRow, AuditProgramItemRow } from '@/lib/db/iso'
import type { IsoClause, QmsProcessDefinition, AnnualCoverage, AnnualClauseCoverage } from '@/lib/db/iso-reference'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgramListSkeleton, AgendaSkeleton } from './ProgramSkeleton'

/**
 * FOR-MI-14 — internal audit programmes.
 *
 * Every piece of ISO and process reference data this screen needs now arrives as
 * props from the database (iso_clauses, qms_processes, qms_process_steps and
 * their clause mappings). It used to live here as literal objects — DEFAULT_AGENDA,
 * DEFAULT_CRITERIA, DEFAULT_REF_DOCS, DEFAULT_TIME_SLOTS, DEFAULT_INTERLOCUTEURS,
 * DEPT_CONFIG — which meant the server could not validate what the form sent, no
 * query could reach it, and it had drifted from the workbooks it was copied from
 * (steps merged or dropped in all seven departments).
 *
 * Only presentation constants remain below.
 */

// ─── Presentation constants ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; dim: string; text: string }> = {
  planifie: { label: 'Planifié',  dot: '#2563EB', dim: 'rgba(37,99,235,0.10)',   text: '#2563EB' },
  en_cours: { label: 'En cours',  dot: '#B8870A', dim: 'rgba(184,135,10,0.10)',  text: '#B8870A' },
  realise:  { label: 'Réalisé',   dot: '#1C7A48', dim: 'rgba(28,122,72,0.10)',   text: '#1C7A48' },
  reporte:  { label: 'Reporté',   dot: '#DC2626', dim: 'rgba(220,38,38,0.10)',   text: '#DC2626' },
  annule:   { label: 'Annulé',    dot: '#6B7280', dim: 'rgba(107,114,128,0.10)', text: '#6B7280' },
}

const CONFORMITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  C:  { label: 'Conforme',             color: '#1C7A48', bg: 'rgba(28,122,72,0.10)' },
  NC: { label: 'Non-conforme',         color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  NA: { label: 'Non applicable',       color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  PA: { label: "Piste d'amélioration", color: '#B8870A', bg: 'rgba(184,135,10,0.10)' },
}

const FALLBACK_COLOR = '#2F6F4F'
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i)

// ─── Types ────────────────────────────────────────────────────────────────────

type Auditor = { id: string; name: string; role: string; domain: string | null }

type Props = {
  initialRows: AuditProgramRow[]
  clauses: IsoClause[]
  processes: QmsProcessDefinition[]
  auditors: Auditor[]
  coverage: AnnualCoverage
  canEdit: boolean
}

type AgendaItemDraft = {
  /** Row id for a finding already on record; absent for one added in the form. */
  id?: string
  agendaStep: string
  clauseCodes: string[]
  processStepId: string | null
  interlocuteurs: string
  response: string
  conformity: string
  evidence: string
}

type FormState = {
  dept: string; title: string; auditorName: string; auditorId: string
  auditeeResponsible: string
  scheduledDate: string; scheduledStartTime: string; scheduledEndTime: string
  actualDate: string; status: string; scope: string; objectives: string
  clauseCodes: string[]; referenceDocuments: string; findings: string; notes: string
  items: AgendaItemDraft[]
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function emptyItem(): AgendaItemDraft {
  return {
    agendaStep: '', clauseCodes: [], processStepId: null,
    interlocuteurs: '', response: '', conformity: '', evidence: '',
  }
}

/** Seeds a form from a process definition — the agenda, clauses, documents and slot. */
function buildFormForProcess(p: QmsProcessDefinition | undefined): FormState {
  return {
    dept: p?.code ?? '',
    title: '', auditorName: '', auditorId: '', auditeeResponsible: '',
    scheduledDate: '',
    scheduledStartTime: p?.defaultStartTime ?? '',
    scheduledEndTime:   p?.defaultEndTime   ?? '',
    actualDate: '', status: 'planifie', scope: '', objectives: '',
    clauseCodes: p?.clauseCodes ?? [],
    referenceDocuments: p?.procedureCodes ?? '',
    findings: '', notes: '',
    items: (p?.steps ?? []).map((s) => ({
      agendaStep:     s.label,
      clauseCodes:    s.clauseCodes,
      processStepId:  s.id,
      interlocuteurs: s.defaultInterlocuteurs ?? p?.defaultInterlocuteurs ?? '',
      response: '', conformity: '', evidence: '',
    })),
  }
}

function compareClauseCodes(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1)
    if (d !== 0) return d
  }
  return 0
}

function formatClauses(codes: string[]): string {
  return [...codes].sort(compareClauseCodes).join('; ')
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditProgramsClient({ initialRows, clauses, processes, auditors, coverage, canEdit }: Props) {
  const [rows, setRows]             = useState(initialRows)
  const [showForm, setShowForm]     = useState(false)
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState(String(currentYear))
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState<FormState>(buildFormForProcess(undefined))
  const [formStep, setFormStep]     = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [notice, setNotice]         = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const processByCode = useMemo(
    () => new Map(processes.map((p) => [p.code, p])),
    [processes],
  )
  const clauseByCode = useMemo(
    () => new Map(clauses.map((c) => [c.code, c])),
    [clauses],
  )
  const selectedProcess = form.dept ? processByCode.get(form.dept) : undefined

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
  const realised = byStatus['realise'] ?? 0
  const pct = rows.length > 0 ? Math.round((realised / rows.length) * 100) : 0

  async function loadRows(overrides?: { dept?: string; status?: string; year?: string }) {
    setLoading(true)
    const params = new URLSearchParams()
    const d = overrides?.dept   ?? filterDept
    const s = overrides?.status ?? filterStatus
    const y = overrides?.year   ?? filterYear
    if (d) params.set('dept', d)
    if (s) params.set('status', s)
    if (y) params.set('year', y)
    const res = await fetch(`/api/audit-programs?${params}`)
    if (res.ok) setRows(await res.json() as AuditProgramRow[])
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.dept) { setFormError('Sélectionnez un processus'); return }
    if (form.clauseCodes.length === 0) {
      setFormError('Sélectionnez au moins une clause ISO 9001 : un programme d\'audit sans critère n\'est pas auditable.')
      setFormStep(3)
      return
    }
    setSubmitting(true); setFormError(''); setNotice('')

    const validItems = form.items.filter((i) => i.agendaStep.trim())
    const res = await fetch('/api/audit-programs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dept: form.dept,
        title: form.title || undefined,
        auditorName: form.auditorName || undefined,
        auditorId: form.auditorId || undefined,
        auditeeResponsible: form.auditeeResponsible || undefined,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        scheduledStartTime: form.scheduledStartTime || undefined,
        scheduledEndTime: form.scheduledEndTime || undefined,
        actualDate: form.actualDate ? new Date(form.actualDate).toISOString() : undefined,
        status: form.status || undefined,
        // Périmètre and objectifs are ISO 9001 § 9.2.2 b) content of a programme.
        // The old form collected them and then left them out of this body, so
        // both were discarded on every create.
        scope: form.scope || undefined,
        objectives: form.objectives || undefined,
        clauseCodes: form.clauseCodes,
        referenceDocuments: form.referenceDocuments || undefined,
        findings: form.findings || undefined,
        notes: form.notes || undefined,
        // The agenda is sent explicitly, so an auditor's edits to the template
        // are what gets created rather than a fresh copy of the template.
        seedFromTemplate: false,
      }),
    })
    const created = await res.json() as { id?: string; error?: string; warnings?: string[] }
    if (!res.ok) { setFormError(created.error ?? 'Erreur'); setSubmitting(false); return }

    if (validItems.length > 0 && created.id) {
      const itemsRes = await fetch(`/api/audit-programs/${created.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map((i, idx) => ({
            agendaStep: i.agendaStep,
            clauseCodes: i.clauseCodes,
            processStepId: i.processStepId,
            interlocuteurs: i.interlocuteurs || undefined,
            sortOrder: idx,
          })),
        }),
      })
      if (!itemsRes.ok) {
        const err = await itemsRes.json().catch(() => ({})) as { error?: string }
        setFormError(`Programme créé, mais l'agenda n'a pas été enregistré : ${err.error ?? 'erreur'}`)
        setSubmitting(false)
        await loadRows()
        return
      }
    }

    if (created.warnings && created.warnings.length > 0) setNotice(created.warnings.join(' '))
    setShowForm(false); setForm(buildFormForProcess(undefined)); setFormStep(1)
    await loadRows(); setSubmitting(false)
  }

  async function patchRow(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/audit-programs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      setNotice(err.error ?? 'Enregistrement refusé.')
    }
    await loadRows()
  }

  function openForm() {
    setForm(buildFormForProcess(undefined)); setFormStep(1); setFormError(''); setNotice(''); setShowForm(true)
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Programmes d&apos;audit interne</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-14 · ISO 9001:2015 clause 9.2 · {rows.length} programme{rows.length !== 1 ? 's' : ''} · {pct}% réalisés
          </p>
        </div>
        {canEdit && (
          <button onClick={openForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--admin-emerald)' }}>
            <Plus className="w-4 h-4" /> Nouveau programme
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-start gap-2 text-xs px-4 py-3 rounded-xl"
          style={{ background: 'rgba(184,135,10,0.10)', color: '#B8870A' }}>
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} className="shrink-0 font-medium">Fermer</button>
        </div>
      )}

      <AnnualCoveragePanel coverage={coverage} canEdit={canEdit} onNotice={setNotice} />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--admin-text-muted)' }}>Filtres</span>

          <div className="flex gap-1.5">
            {YEAR_OPTIONS.map((y) => (
              <button key={y}
                onClick={() => { setFilterYear(String(y)); void loadRows({ year: String(y) }) }}
                className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-all"
                style={{
                  borderColor: filterYear === String(y) ? 'var(--admin-accent)' : 'var(--admin-border)',
                  background: filterYear === String(y) ? 'var(--admin-accent)' : 'transparent',
                  color: filterYear === String(y) ? '#fff' : 'var(--admin-text-muted)',
                }}>
                {y}
              </button>
            ))}
          </div>

          <div className="w-px h-5 mx-1" style={{ background: 'var(--admin-border)' }} />

          <Select value={filterDept || '__all__'}
            onValueChange={(v) => { const val = v === '__all__' ? '' : v; setFilterDept(val); void loadRows({ dept: val }) }}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
              <SelectItem value="__all__">Tous processus</SelectItem>
              {processes.map((p) => <SelectItem key={p.code} value={p.code}>{p.code} — {p.shortLabel}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus || '__all__'}
            onValueChange={(v) => { const val = v === '__all__' ? '' : v; setFilterStatus(val); void loadRows({ status: val }) }}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
              <SelectItem value="__all__">Tous statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          // Le même squelette que le chargement de la route : changer de filtre ne
          // doit pas faire disparaître la liste au profit d'un vide centré.
          <ProgramListSkeleton rows={Math.min(Math.max(rows.length, 1), 4)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Calendar} title="Aucun programme d'audit" description="Créez le programme d'audit annuel par processus." />
        ) : rows.map((row) => (
          <AuditProgramCard key={row.id} row={row} canEdit={canEdit}
            process={processByCode.get(row.dept)}
            clauseByCode={clauseByCode}
            expanded={expandedId === row.id}
            onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
            onNotice={setNotice}
            onPatch={(body) => void patchRow(row.id, body)} />
        ))}
      </div>

      {/* ── Create sheet ────────────────────────────────────────────────────── */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setForm(buildFormForProcess(undefined)); setFormStep(1) } }}>
        <SheetContent side="right" className="w-full max-w-2xl flex flex-col p-0 border-l"
          style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }}>

          <SheetHeader className="px-6 pt-4 pb-3 shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Nouveau programme d&apos;audit</SheetTitle>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>FOR-MI-14 · ISO 9001:2015 clause 9.2</p>
          </SheetHeader>

          <div className="px-6 pb-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['Processus', 'Planification', 'Référentiel', 'Agenda'].map((label, i) => {
                const step = i + 1
                const done = formStep > step
                const active = formStep === step
                return (
                  <button key={step} onClick={() => setFormStep(step)}
                    className="flex items-center gap-1.5 text-xs transition-all min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: active ? 'var(--admin-accent)' : done ? 'var(--admin-emerald-dim)' : 'var(--admin-border)',
                        color: active ? '#fff' : done ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                      }}>
                      {done ? <Check className="w-2.5 h-2.5" /> : step}
                    </span>
                    <span className="hidden sm:inline truncate" style={{ color: active ? 'var(--admin-text)' : 'var(--admin-text-muted)', fontWeight: active ? 600 : 400 }}>{label}</span>
                    {step < 4 && <span className="shrink-0" style={{ color: 'var(--admin-border)' }}>›</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">

            {/* Step 1 — Processus */}
            {formStep === 1 && (
              <div className="space-y-5">
                <StepHeader icon={<ClipboardCheck className="w-4 h-4" />} title="Sélectionnez le processus audité" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {processes.map((p) => (
                    <button key={p.code}
                      onClick={() => setForm(buildFormForProcess(p))}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: form.dept === p.code ? (p.color ?? FALLBACK_COLOR) : 'var(--admin-border)',
                        background: form.dept === p.code ? `${p.color ?? FALLBACK_COLOR}10` : 'var(--admin-surface)',
                      }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: p.color ?? FALLBACK_COLOR }}>
                        {p.code}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: form.dept === p.code ? (p.color ?? FALLBACK_COLOR) : 'var(--admin-text)' }}>{p.code}</p>
                        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--admin-text-muted)' }}>{p.shortLabel}</p>
                      </div>
                      {form.dept === p.code && (
                        <Check className="w-3.5 h-3.5 ml-auto mt-auto" style={{ color: p.color ?? FALLBACK_COLOR }} />
                      )}
                    </button>
                  ))}
                </div>

                {selectedProcess && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {selectedProcess.name} · {selectedProcess.procedureCodes}
                    </p>
                    <div className="h-px" style={{ background: 'var(--admin-border)' }} />
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup label="Titre du programme">
                        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                          placeholder={`Audit ${form.dept} ${currentYear}`} />
                      </FieldGroup>
                      <FieldGroup label="Statut">
                        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                          <SelectTrigger className="rounded-xl" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                            {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FieldGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Auditor selection from the qualified register (LIS-MI-05).
                          ISO 9001 § 9.2.2 c) requires auditor selection to ensure
                          objectivity; the server re-checks and refuses an
                          unqualified auditor. */}
                      <FieldGroup label="Auditeur interne qualifié">
                        <Select value={form.auditorId || '__none__'}
                          onValueChange={(v) => setForm((f) => {
                            if (v === '__none__') return { ...f, auditorId: '', auditorName: '' }
                            const a = auditors.find((x) => x.id === v)
                            return { ...f, auditorId: v, auditorName: a?.name ?? f.auditorName }
                          })}>
                          <SelectTrigger className="rounded-xl" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                            <SelectValue placeholder="Auditeur…" />
                          </SelectTrigger>
                          <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                            <SelectItem value="__none__">Auditeur externe (saisie libre)</SelectItem>
                            {auditors.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}{a.domain ? ` — ${a.domain}` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {auditors.length === 0 && (
                          <p className="text-[10px] mt-1" style={{ color: '#B8870A' }}>
                            Aucun auditeur qualifié enregistré (LIS-MI-05).
                          </p>
                        )}
                      </FieldGroup>
                      <FieldGroup label="Nom de l'auditeur">
                        <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                          placeholder="Nom de l'auditeur" />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="Responsable audité">
                      <input value={form.auditeeResponsible} onChange={(e) => setForm((f) => ({ ...f, auditeeResponsible: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                        placeholder="Pilote processus" />
                    </FieldGroup>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Planification */}
            {formStep === 2 && (
              <div className="space-y-4">
                <StepHeader icon={<Calendar className="w-4 h-4" />} title="Dates et horaires" />
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Date prévue">
                    <input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </FieldGroup>
                  <FieldGroup label="Date réalisée">
                    <input type="date" value={form.actualDate} onChange={(e) => setForm((f) => ({ ...f, actualDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </FieldGroup>
                </div>

                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                  <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--admin-emerald)' }} />
                    Horaire de l&apos;audit
                    {selectedProcess?.defaultStartTime && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                        Créneau habituel {selectedProcess.code}
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Début">
                      <input value={form.scheduledStartTime} onChange={(e) => setForm((f) => ({ ...f, scheduledStartTime: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        placeholder="09H00" />
                    </FieldGroup>
                    <FieldGroup label="Fin">
                      <input value={form.scheduledEndTime} onChange={(e) => setForm((f) => ({ ...f, scheduledEndTime: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                        placeholder="11H00" />
                    </FieldGroup>
                  </div>
                </div>

                {/* Périmètre and objectifs — ISO 9001 § 9.2.2 b). Collected but
                    never sent by the previous form. */}
                <FieldGroup label="Périmètre de l'audit">
                  <textarea value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                    rows={2} placeholder="Activités, sites et périodes couverts…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </FieldGroup>
                <FieldGroup label="Objectifs de l'audit">
                  <textarea value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
                    rows={2} placeholder="Vérifier la conformité et l'efficacité du processus…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </FieldGroup>
              </div>
            )}

            {/* Step 3 — Référentiel */}
            {formStep === 3 && (
              <div className="space-y-4">
                <StepHeader icon={<BookOpen className="w-4 h-4" />} title="Clauses ISO 9001 applicables" />
                <ClausePicker
                  clauses={clauses}
                  selected={form.clauseCodes}
                  processDefault={selectedProcess?.clauseCodes ?? []}
                  onChange={(codes) => setForm((f) => ({ ...f, clauseCodes: codes }))}
                />
                <FieldGroup label="Documents de référence">
                  <input value={form.referenceDocuments} onChange={(e) => setForm((f) => ({ ...f, referenceDocuments: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                    placeholder="PRS-XX-01 & documents associés" />
                </FieldGroup>
                <FieldGroup label="Notes">
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3} placeholder="Observations, contexte de l'audit…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </FieldGroup>
              </div>
            )}

            {/* Step 4 — Agenda */}
            {formStep === 4 && (
              <div className="space-y-4">
                <StepHeader icon={<Users className="w-4 h-4" />} title="Étapes du processus (agenda)" />

                {selectedProcess && selectedProcess.steps.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {form.items.length} étape{form.items.length !== 1 ? 's' : ''} issues du référentiel FOR-MI-14 du
                      processus {selectedProcess.code}. Modifiez-les si l&apos;audit s&apos;en écarte.
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border overflow-hidden"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
                      <div className="flex gap-2 items-center px-3 py-2.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2F6F4F, #1C3D2E)' }}>
                          {idx + 1}
                        </span>
                        <input value={item.agendaStep}
                          onChange={(e) => setForm((f) => {
                            const items = [...f.items]
                            // Editing the wording detaches the finding from the
                            // reusable criterion: it is no longer that criterion.
                            items[idx] = {
                              ...items[idx],
                              agendaStep: e.target.value,
                              processStepId: e.target.value === items[idx].agendaStep ? items[idx].processStepId : null,
                            }
                            return { ...f, items }
                          })}
                          className="flex-1 bg-transparent text-sm focus-visible:outline-none"
                          style={{ color: 'var(--admin-text)' }}
                          placeholder="Étape du processus…" />
                        <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg transition-colors shrink-0"
                          style={{ color: 'var(--admin-text-muted)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-3 pb-2.5 pl-10 space-y-1.5">
                        <input value={item.interlocuteurs}
                          onChange={(e) => setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], interlocuteurs: e.target.value }; return { ...f, items } })}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
                          placeholder="Interlocuteurs…" />
                        {item.clauseCodes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {[...item.clauseCodes].sort(compareClauseCodes).map((c) => (
                              <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
                                title={clauseByCode.get(c)?.title ?? c}>
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                    className="flex items-center gap-2 text-xs px-4 py-3 rounded-xl border-2 border-dashed w-full justify-center transition-colors"
                    style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter une étape
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 text-sm px-4 py-3 rounded-xl mt-4"
                style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            {formStep > 1 ? (
              <button onClick={() => setFormStep((s) => s - 1)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                ← Précédent
              </button>
            ) : (
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
            )}
            {formStep < 4 ? (
              <button onClick={() => { if (!form.dept && formStep === 1) { setFormError('Sélectionnez un processus'); return }; setFormError(''); setFormStep((s) => s + 1) }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                style={{ background: 'linear-gradient(135deg, #1C7A48 0%, #2F6F4F 100%)' }}>
                Suivant →
              </button>
            ) : (
              <button onClick={() => void handleCreate()} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1C7A48 0%, #2F6F4F 100%)' }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : 'Créer le programme'}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Annual programme coverage ────────────────────────────────────────────────

const COVERAGE_STYLE: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  executed:    { bg: 'var(--admin-emerald)',     fg: '#fff',                border: 'var(--admin-emerald)', label: 'Auditée' },
  planned:     { bg: 'var(--admin-emerald-dim)', fg: 'var(--admin-emerald)', border: 'var(--admin-emerald)', label: 'Planifiée' },
  not_planned: { bg: 'rgba(184,135,10,0.12)',    fg: '#B8870A',             border: '#B8870A',              label: 'Non planifiée' },
  unassigned:  { bg: 'var(--admin-red-dim)',     fg: 'var(--admin-red)',    border: 'var(--admin-red)',     label: 'Aucun processus' },
}

const SCOPE_LABEL: Record<string, string> = {
  transversal:      'transversale',
  shared:           'partagée',
  process_specific: 'spécifique',
  unassigned:       'non attribuée',
}

/**
 * Coverage of ISO 9001 by the year's audit programme as a whole.
 *
 * Clause 9.2.2 a) asks this of the programme, not of any single audit, so the
 * chain shown is annual programme → audits → processes → clause scope → clauses.
 *
 * The panel keeps two kinds of gap apart, because the remedies are different: a
 * clause nobody has scheduled an audit for yet is closed by planning that audit,
 * while a clause no process is audited against at all is a cartography question
 * for the quality manager and no amount of scheduling will close it.
 */
function AnnualCoveragePanel({ coverage, canEdit, onNotice }: {
  coverage: AnnualCoverage; canEdit: boolean; onNotice: (m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { totals, clauses, processes, year } = coverage
  if (clauses.length === 0) return null

  const covered = totals.executed + totals.planned
  const notPlanned = clauses.filter((c) => c.state === 'not_planned')
  const unassigned = clauses.filter((c) => c.state === 'unassigned')
  const multiply = clauses.filter((c) => c.multiplyCovered)
  const withNc = clauses.filter((c) => c.ncCount > 0)

  const byChapter = new Map<number, AnnualClauseCoverage[]>()
  for (const c of clauses) {
    const list = byChapter.get(c.chapter) ?? []
    list.push(c)
    byChapter.set(c.chapter, list)
  }

  // Which audits would close the scheduling gap, grouped by the process that owns
  // the clause — this is the actionable half of an uncovered clause.
  const missingByProcess = new Map<string, string[]>()
  for (const c of notPlanned) {
    for (const p of c.owningProcesses) {
      const list = missingByProcess.get(p) ?? []
      list.push(c.code)
      missingByProcess.set(p, list)
    }
  }

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-emerald)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
            Couverture du référentiel ISO 9001 — programme annuel {year}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {covered}/{totals.auditable} clauses au programme
            {' · '}{totals.processesPlanned}/{totals.processesTotal} processus planifiés
            {totals.notPlanned > 0 && ` · ${totals.notPlanned} en attente de planification`}
            {totals.unassigned > 0 && ` · ${totals.unassigned} sans processus`}
          </p>
        </div>
        <div className="hidden sm:flex gap-0.5 shrink-0">
          {clauses.map((c) => (
            <span key={c.code} title={`${c.code} — ${c.title} (${COVERAGE_STYLE[c.state]?.label})`}
              className="w-1.5 h-5 rounded-sm"
              style={{ background: COVERAGE_STYLE[c.state]?.border ?? 'var(--admin-border)',
                       opacity: c.state === 'planned' ? 0.45 : 1 }} />
          ))}
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
              : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t space-y-4" style={{ borderColor: 'var(--admin-border)' }}>

          {/* Which processes carry a programme this year */}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
              Processus au programme {year}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {processes.map((p) => (
                <span key={p.code}
                  title={p.planned
                    ? `${p.name} — ${p.programmes.map((x) => x.reference).join(', ')}`
                    : `${p.name} — aucun audit planifié en ${year}`}
                  className="text-[11px] px-2 py-0.5 rounded-lg"
                  style={{
                    background: p.planned ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
                    color: p.planned ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                    border: `1px solid ${p.planned ? 'var(--admin-emerald)' : 'var(--admin-border)'}`,
                  }}>
                  <span className="font-mono font-semibold">{p.code}</span>
                  <span className="ml-1.5 opacity-80">
                    {p.planned ? `${p.criteriaEvaluated}/${p.criteriaCount} critères évalués` : 'non planifié'}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Clause grid, chapter by chapter */}
          <div className="space-y-1.5">
            {[...byChapter.entries()].sort((a, b) => a[0] - b[0]).map(([chapter, list]) => (
              <div key={chapter} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-mono text-[11px] w-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{chapter}</span>
                {list.map((c) => {
                  const st = COVERAGE_STYLE[c.state]
                  return (
                    <span key={c.code}
                      title={`${c.code} — ${c.title}\n${st?.label}${c.owningProcesses.length ? ` · processus : ${c.owningProcesses.join(', ')}` : ''}${c.plannedBy.length ? `\naudits : ${c.plannedBy.join(', ')}` : ''}`}
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: st?.bg, color: st?.fg, border: `1px solid ${st?.border}` }}>
                      {c.code}{c.multiplyCovered && <span className="ml-1 opacity-70">×{c.plannedBy.length}</span>}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            {Object.entries(COVERAGE_STYLE).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: v.bg, border: `1px solid ${v.border}` }} />
                {v.label}
              </span>
            ))}
          </div>

          {/* Scheduling gap — actionable */}
          {notPlanned.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                Clauses en attente de planification — l&apos;audit du processus concerné n&apos;est pas encore au calendrier
              </p>
              <div className="flex flex-col gap-1">
                {[...missingByProcess.entries()].sort().map(([proc, codes]) => (
                  <p key={proc} className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    <span className="font-mono font-semibold" style={{ color: '#B8870A' }}>{proc}</span>
                    <span className="mx-1.5">→</span>
                    <span className="font-mono">{[...new Set(codes)].sort(compareClauseCodes).join(', ')}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Cartography gap — a decision, not a schedule */}
          {unassigned.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                Clauses attribuées à aucun processus — décision qualité
              </p>
              <div className="flex flex-col gap-2">
                {unassigned.map((c) => (
                  <ClauseDecisionCard key={c.code} clause={c} canEdit={canEdit} onNotice={onNotice} />
                ))}
              </div>
            </div>
          )}

          {(multiply.length > 0 || withNc.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {multiply.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                    Couvertes par plusieurs audits
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {multiply.map((c) => (
                      <span key={c.code} title={c.plannedBy.join(', ')}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-lg"
                        style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                        {c.code} ×{c.plannedBy.length}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {withNc.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                    Clauses ayant donné lieu à une non-conformité
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {withNc.map((c) => (
                      <span key={c.code} className="text-[11px] px-2 py-0.5 rounded-lg"
                        style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                        <span className="font-mono font-semibold">{c.code}</span>
                        <span className="ml-1.5 opacity-80">{c.ncCount} NC</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] pt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Portée des clauses&nbsp;:{' '}
            {(['transversal', 'shared', 'process_specific', 'unassigned'] as const).map((sc, i) => (
              <span key={sc}>
                {i > 0 && ' · '}
                {clauses.filter((c) => c.scope === sc).length} {SCOPE_LABEL[sc]}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * The ruling on a clause the cartography assigns to nobody.
 *
 * Two dispositions can be settled here, and the third route is named rather than
 * offered: attaching the clause to a process means revising the controlled
 * FOR-MI-14 workbook and re-seeding the cartography, because the referential is
 * transcribed from that document. Offering it as a button would let the
 * application and the controlled document drift apart.
 */
function ClauseDecisionCard({ clause, canEdit, onNotice }: {
  clause: AnnualClauseCoverage; canEdit: boolean; onNotice: (m: string) => void
}) {
  const [open, setOpen]         = useState(false)
  const [disposition, setDisp]  = useState<'transversal' | 'excluded'>('transversal')
  const [justification, setJus] = useState(clause.decision?.justification ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  const signed = Boolean(clause.decision?.decidedAt)

  async function save() {
    setSaving(true); setError('')
    const res = await fetch(`/api/qms-reference/clause-decisions/${encodeURIComponent(clause.code)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disposition, justification }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      setError(d.error ?? 'Erreur'); setSaving(false); return
    }
    onNotice(`Décision enregistrée pour la clause ${clause.code}.`)
    setSaving(false); setOpen(false)
    // Server-rendered coverage: refresh the tree rather than reloading the page,
    // so the panel stays open where the user left it.
    router.refresh()
  }

  return (
    <div className="rounded-lg px-3 py-2.5"
      style={{
        background: signed ? 'var(--admin-emerald-dim)' : 'var(--admin-red-dim)',
        border: `1px solid ${signed ? 'var(--admin-emerald)' : 'var(--admin-red)'}`,
      }}>
      <div className="flex items-start gap-2 flex-wrap">
        <p className="text-[12px] font-semibold flex-1"
          style={{ color: signed ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>
          <span className="font-mono">{clause.code}</span>
          <span className="ml-2">{clause.title}</span>
          <span className="ml-2 font-normal opacity-80">
            {signed ? '· décision enregistrée' : '· décision qualité requise'}
          </span>
        </p>
        {canEdit && (
          <button onClick={() => setOpen((o) => !o)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg shrink-0"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
            {open ? 'Fermer' : signed ? 'Modifier' : 'Enregistrer une décision'}
          </button>
        )}
      </div>

      {clause.decision && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-muted)' }}>
          {clause.decision.justification}
          {clause.decision.decidedAt && (
            <span className="ml-1 italic">
              (statué le {new Date(clause.decision.decidedAt).toLocaleDateString('fr-FR')})
            </span>
          )}
        </p>
      )}

      {open && canEdit && (
        <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['transversal', 'Auditée au niveau organisation'],
              ['excluded',    'Non applicable — exclusion justifiée'],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDisp(v)}
                className="text-[11px] px-2.5 py-1 rounded-lg border font-medium"
                style={{
                  borderColor: disposition === v ? 'var(--admin-emerald)' : 'var(--admin-border)',
                  background: disposition === v ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
                  color: disposition === v ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                }}>
                {label}
              </button>
            ))}
          </div>
          <textarea value={justification} onChange={(e) => setJus(e.target.value)} rows={3}
            placeholder="Motif de la décision — opposable en audit, minimum 20 caractères…"
            className="w-full px-3 py-2 rounded-xl border text-xs resize-none"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
          <p className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            Pour rattacher {clause.code} à un processus, il faut réviser le classeur FOR-MI-14 du
            processus concerné puis re-semer la cartographie : le référentiel est transcrit du
            document maîtrisé et ne se modifie pas depuis un écran.
          </p>
          {error && <p className="text-[11px]" style={{ color: 'var(--admin-red)' }}>{error}</p>}
          <button onClick={() => void save()} disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1C7A48, #2F6F4F)' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer la décision'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Clause picker ────────────────────────────────────────────────────────────

/**
 * Selects ISO clauses from the register, grouped by chapter.
 *
 * Replaces a free-text box whose contents nothing validated. Only second-level
 * clauses are offered, which is the granularity FOR-MI-14 plans at; the register
 * holds the third level too, for attaching a finding more precisely.
 */
function ClausePicker({ clauses, selected, processDefault, onChange }: {
  clauses: IsoClause[]
  selected: string[]
  processDefault: string[]
  onChange: (codes: string[]) => void
}) {
  const selectable = clauses.filter((c) => c.code.split('.').length === 2)
  const byChapter = new Map<number, IsoClause[]>()
  for (const c of selectable) {
    const list = byChapter.get(c.chapter) ?? []
    list.push(c)
    byChapter.set(c.chapter, list)
  }
  const chapterTitle = (n: number) => clauses.find((c) => c.code === String(n))?.title ?? `Chapitre ${n}`
  const selectedSet = new Set(selected)

  function toggle(code: string) {
    onChange(selectedSet.has(code) ? selected.filter((c) => c !== code) : [...selected, code])
  }

  const isDefault =
    processDefault.length > 0 &&
    processDefault.length === selected.length &&
    processDefault.every((c) => selectedSet.has(c))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {selected.length} clause{selected.length !== 1 ? 's' : ''} sélectionnée{selected.length !== 1 ? 's' : ''}
          {isDefault && ' · référentiel habituel du processus'}
        </p>
        {processDefault.length > 0 && !isDefault && (
          <button onClick={() => onChange(processDefault)}
            className="text-[11px] font-medium hover:underline" style={{ color: 'var(--admin-accent)' }}>
            Rétablir le référentiel du processus
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl px-3 py-2 font-mono text-xs"
          style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
          {formatClauses(selected)}
        </div>
      )}

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {[...byChapter.entries()].sort((a, b) => a[0] - b[0]).map(([chapter, list]) => (
          <div key={chapter}>
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
              {chapter} — {chapterTitle(chapter)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((c) => {
                const on = selectedSet.has(c.code)
                return (
                  <button key={c.code} onClick={() => toggle(c.code)} title={c.title}
                    className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-all"
                    style={{
                      borderColor: on ? 'var(--admin-emerald)' : 'var(--admin-border)',
                      background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
                      color: on ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                    }}>
                    {c.code}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Programme card ───────────────────────────────────────────────────────────

function AuditProgramCard({ row, canEdit, process, clauseByCode, expanded, onToggle, onPatch, onNotice }: {
  row: AuditProgramRow
  canEdit: boolean
  process: QmsProcessDefinition | undefined
  clauseByCode: Map<string, IsoClause>
  expanded: boolean
  onToggle: () => void
  onPatch: (body: Record<string, unknown>) => void
  onNotice: (msg: string) => void
}) {
  const [items, setItems]                 = useState<AuditProgramItemRow[] | null>(null)
  const [loadingItems, setLoadingItems]   = useState(false)
  const [editStatus, setEditStatus]       = useState(row.status)
  const [actualDate, setActualDate]       = useState(row.actualDate ? new Date(row.actualDate).toISOString().split('T')[0] : '')
  const [auditorSignedAt, setAuditorSignedAt] = useState(row.auditorSignedAt ? new Date(row.auditorSignedAt).toISOString().split('T')[0] : '')
  const [findings, setFindings]           = useState(row.findings ?? '')
  const [saving, setSaving]               = useState(false)

  const statusCfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.planifie
  const color = process?.color ?? FALLBACK_COLOR
  const timeSlot = row.scheduledStartTime && row.scheduledEndTime
    ? `${row.scheduledStartTime} – ${row.scheduledEndTime}` : null
  const evaluated = items ? items.filter((i) => i.conformity).length : 0
  const total     = items ? items.length : 0
  const pct       = total > 0 ? Math.round((evaluated / total) * 100) : 0
  const ncCount   = items ? items.filter((i) => i.ncId).length : 0

  async function loadItems() {
    if (items !== null) return
    setLoadingItems(true)
    const res = await fetch(`/api/audit-programs/${row.id}`)
    if (res.ok) { const d = await res.json() as { items: AuditProgramItemRow[] }; setItems(d.items ?? []) }
    setLoadingItems(false)
  }

  async function handleToggle() { onToggle(); if (!expanded) await loadItems() }

  /**
   * Saves one finding.
   *
   * `id` is round-tripped for every row so the server updates the finding in
   * place. Before the accompanying fix the route's schema had no `id` field and
   * Zod dropped it, so each save reinserted the findings and cleared their link
   * to any non-conformity they had raised.
   */
  async function saveItem(item: AuditProgramItemRow, patch: Partial<AuditProgramItemRow>) {
    const newItems = (items ?? []).map((i) => i.id === item.id ? { ...i, ...patch } : i)
    setItems(newItems)
    const res = await fetch(`/api/audit-programs/${row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: newItems.map((i) => ({
          id: i.id, agendaStep: i.agendaStep, clauseCodes: i.clauseCodes,
          processStepId: i.processStepId,
          interlocuteurs: i.interlocuteurs ?? undefined, response: i.response ?? undefined,
          conformity: i.conformity || undefined, evidence: i.evidence ?? undefined,
          sortOrder: i.sortOrder,
        })),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      onNotice(err.error ?? 'Enregistrement du constat refusé.')
      return
    }
    // Re-read so the server's view (clause ordering, NC links) is what is shown.
    const fresh = await res.json() as { items?: AuditProgramItemRow[] }
    if (fresh.items) setItems(fresh.items)
  }

  return (
    <div className="rounded-2xl border overflow-hidden transition-shadow relative"
      style={{
        borderColor: expanded ? 'var(--admin-accent)' : 'var(--admin-border)',
        background: 'var(--admin-surface)',
        boxShadow: expanded ? 'var(--admin-shadow-md)' : 'var(--admin-shadow-sm)',
        borderWidth: expanded ? '1.5px' : '1px',
      }}>

      <button className="w-full px-5 py-4 flex items-center gap-4 transition-colors text-left"
        style={{ background: expanded ? 'var(--admin-accent-dim)' : 'transparent' }}
        onClick={() => void handleToggle()}>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: color }}>
          {row.dept}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{row.reference}</span>
            {row.dmsDocumentCode && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{row.dmsDocumentCode}</span>
            )}
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: statusCfg.dim, color: statusCfg.text }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusCfg.dot }} />
              {statusCfg.label}
            </span>
            {ncCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                {ncCount} NC
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--admin-text)' }}>
            {row.title ?? `Audit ${process?.shortLabel ?? row.dept} ${row.year}`}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--admin-text-muted)' }}>
            {row.auditorName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{row.auditorName}</span>}
            {row.scheduledDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(row.scheduledDate).toLocaleDateString('fr-FR')}</span>}
            {timeSlot && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeSlot}</span>}
            {row.auditeeResponsible && <span>{row.auditeeResponsible}</span>}
          </div>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {/* FOR-MI-14 export — the controlled form, built from the register. */}
      <a href={`/api/audit-programs/${row.id}/export`}
        className="absolute top-4 right-12 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text-muted)' }}
        title="Exporter au format FOR-MI-14">
        <Download className="w-3 h-3" /> FOR-MI-14
      </a>

      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="px-5 py-5 space-y-5" style={{ background: 'var(--admin-bg)' }}>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {row.clauseCodes.length > 0 && (
                <MetaCard icon={<BookOpen className="w-3.5 h-3.5" />} label="Clauses ISO"
                  value={formatClauses(row.clauseCodes)} />
              )}
              {row.referenceDocuments && <MetaCard icon={<FileText className="w-3.5 h-3.5" />} label="Documents de réf." value={row.referenceDocuments} />}
              {timeSlot && <MetaCard icon={<Clock className="w-3.5 h-3.5" />} label="Horaire" value={timeSlot} />}
              {row.scope && <MetaCard icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Périmètre" value={row.scope} />}
              {row.objectives && <MetaCard icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Objectifs" value={row.objectives} />}
              {row.auditorSignedAt && <MetaCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Signé le" value={new Date(row.auditorSignedAt).toLocaleDateString('fr-FR')} />}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Étapes du processus</p>
                {items !== null && total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--admin-emerald)' }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--admin-emerald)' }}>{evaluated}/{total} évalués</span>
                  </div>
                )}
              </div>
              {loadingItems && (
                // 8 lignes par défaut : les classeurs FOR-MI-14 comptent entre 7 et 10
                // étapes, donc le squelette réserve à peu près la bonne hauteur et la
                // liste ne pousse pas le reste de la carte en arrivant. Sur une
                // réouverture, on connaît le compte exact.
                <AgendaSkeleton rows={total || 8} />
              )}
              {items !== null && items.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--admin-text-muted)' }}>Aucune étape enregistrée.</p>
              )}
              {items !== null && items.length > 0 && (
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <AgendaItemRow key={item.id} item={item} canEdit={canEdit}
                      programId={row.id} clauseByCode={clauseByCode}
                      onSave={(patch) => void saveItem(item, patch)} />
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--admin-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Mise à jour</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Statut</label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-9 text-sm rounded-xl" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                        {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date réalisée</label>
                    <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Signature auditeur</label>
                    <input type="date" value={auditorSignedAt} onChange={(e) => setAuditorSignedAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Constats</label>
                  <textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={3}
                    placeholder="Constats de l'audit, NC détectées…"
                    className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </div>
                <button disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1C7A48, #2F6F4F)' }}
                  onClick={() => {
                    setSaving(true)
                    onPatch({
                      status: editStatus,
                      actualDate: actualDate ? new Date(actualDate).toISOString() : undefined,
                      auditorSignedAt: auditorSignedAt ? new Date(auditorSignedAt).toISOString() : undefined,
                      findings: findings || undefined,
                    })
                    setSaving(false)
                  }}>
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement…</> : <><Check className="w-3.5 h-3.5" /> Enregistrer</>}
                </button>
              </div>
            )}

            {!canEdit && row.findings && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-muted)' }}>Constats</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.findings}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Finding row ──────────────────────────────────────────────────────────────

function AgendaItemRow({ item, canEdit, onSave, programId, clauseByCode }: {
  item: AuditProgramItemRow
  canEdit: boolean
  onSave: (patch: Partial<AuditProgramItemRow>) => void
  programId: string
  clauseByCode: Map<string, IsoClause>
}) {
  const [open, setOpen]             = useState(false)
  const [conformity, setConformity] = useState(item.conformity ?? '')
  const [response, setResponse]     = useState(item.response ?? '')
  const [evidence, setEvidence]     = useState(item.evidence ?? '')
  const [ncId, setNcId]             = useState(item.ncId)
  const [ncRef, setNcRef]           = useState(item.ncReference)
  const [ncBusy, setNcBusy]         = useState(false)
  const [ncError, setNcError]       = useState('')
  const conf = CONFORMITY_LABELS[conformity]

  // A non-conformity has to be traceable to the evidence that justified it.
  const evidenceMissing = conformity === 'NC' && !evidence.trim()

  async function raiseNc() {
    setNcBusy(true); setNcError('')
    const res = await fetch(`/api/audit-programs/${programId}/items/${item.id}/nc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })
    const data = await res.json() as { ncId?: string; reference?: string; error?: string }
    if (!res.ok) {
      if (res.status === 409 && data.ncId) { setNcId(data.ncId); setNcRef(null) }
      else setNcError(data.error ?? 'Erreur')
      setNcBusy(false); return
    }
    setNcId(data.ncId ?? null)
    setNcRef(data.reference ?? null)
    setNcBusy(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-colors"
      style={{ borderColor: conf ? conf.color + '40' : 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #2F6F4F, #1C3D2E)' }}>
          {item.sortOrder + 1}
        </span>
        <span className="flex-1 text-sm" style={{ color: 'var(--admin-text)' }}>{item.agendaStep}</span>
        {item.clauseCodes.length > 0 ? (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg shrink-0 hidden md:inline"
            style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
            {formatClauses(item.clauseCodes)}
          </span>
        ) : item.criterionType === 'process' && (
          // A criterion the workbook lists but that maps to no clause of its own
          // process referential. Saying so stops it reading as a missing mapping.
          <span className="text-[10px] px-1.5 py-0.5 rounded-lg shrink-0 hidden md:inline"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
            critère processus
          </span>
        )}
        {ncId && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg shrink-0 hidden sm:inline"
            style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {ncRef ?? 'NC liée'}
          </span>
        )}
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: conf ? conf.bg : 'var(--admin-bg)', color: conf ? conf.color : 'var(--admin-text-muted)' }}>
          {conf ? conf.label : 'À évaluer'}
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
          : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          {item.clauseCodes.length === 0 && item.criterionType === 'process' && (
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              Critère propre au processus&nbsp;: le classeur FOR-MI-14 l&apos;inscrit à l&apos;ordre du jour
              sans lui rattacher de clause du référentiel de ce processus. Il s&apos;audite contre le
              référentiel du processus dans son ensemble.
            </p>
          )}
          {item.clauseCodes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Exigences ISO évaluées</p>
              <div className="flex flex-wrap gap-1">
                {[...item.clauseCodes].sort(compareClauseCodes).map((c) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded-lg"
                    style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                    <span className="font-mono font-semibold">{c}</span>
                    {clauseByCode.get(c) && <span className="ml-1.5 opacity-80">{clauseByCode.get(c)!.title}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {canEdit ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Résultat de conformité</label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(CONFORMITY_LABELS).map(([v, { label, color, bg }]) => (
                    <button key={v} onClick={() => { setConformity(v); onSave({ conformity: v }) }}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all"
                      style={{
                        borderColor: conformity === v ? color : 'var(--admin-border)',
                        background: conformity === v ? bg : 'var(--admin-surface)',
                        color: conformity === v ? color : 'var(--admin-text-muted)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Observations</label>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)}
                  onBlur={() => onSave({ response })} rows={2}
                  placeholder="Observations de l'auditeur…"
                  className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Preuves objectivées</label>
                <input value={evidence} onChange={(e) => setEvidence(e.target.value)}
                  onBlur={() => onSave({ evidence })}
                  placeholder="Références des preuves…"
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{
                    borderColor: evidenceMissing ? 'var(--admin-red)' : 'var(--admin-border)',
                    background: 'var(--admin-surface)', color: 'var(--admin-text)',
                  }} />
                {evidenceMissing && (
                  <p className="text-[11px]" style={{ color: 'var(--admin-red)' }}>
                    Un constat de non-conformité doit s&apos;appuyer sur une preuve objective.
                  </p>
                )}
              </div>

              {(conformity === 'NC' || ncId) && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                  {ncId ? (
                    <a href={`/admin/nc/${ncId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                      style={{ color: 'var(--admin-red)' }}>
                      Non-conformité liée {ncRef ? `— ${ncRef}` : ''} →
                    </a>
                  ) : (
                    <button onClick={() => void raiseNc()} disabled={ncBusy}
                      className="text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-60"
                      style={{ borderColor: 'var(--admin-red)', color: 'var(--admin-red)', background: 'var(--admin-surface)' }}>
                      {ncBusy ? 'Création…' : 'Créer une non-conformité'}
                    </button>
                  )}
                  {ncError && <p className="text-xs mt-1.5" style={{ color: 'var(--admin-red)' }}>{ncError}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              {item.response && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{item.response}</p>}
              {item.evidence && <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Preuves : {item.evidence}</p>}
              {ncId && (
                <a href={`/admin/nc/${ncId}`} className="inline-block text-xs mt-1.5 hover:underline"
                  style={{ color: 'var(--admin-red)' }}>
                  Non-conformité liée {ncRef ? `— ${ncRef}` : ''} →
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
        {icon}
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</p>
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--admin-text-muted)' }}>
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}
