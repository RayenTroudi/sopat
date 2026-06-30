'use client'

import { useState } from 'react'
import {
  Calendar, Loader2, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2,
  ClipboardCheck, Clock, CheckCircle2, BookOpen, Users, FileText, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditProgramRow, AuditProgramItemRow } from '@/lib/db/iso'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; dim: string; text: string }> = {
  planifie: { label: 'Planifié',  dot: '#2563EB', dim: 'rgba(37,99,235,0.10)',   text: '#2563EB' },
  en_cours: { label: 'En cours',  dot: '#B8870A', dim: 'rgba(184,135,10,0.10)',  text: '#B8870A' },
  realise:  { label: 'Réalisé',   dot: '#1C7A48', dim: 'rgba(28,122,72,0.10)',   text: '#1C7A48' },
  reporte:  { label: 'Reporté',   dot: '#DC2626', dim: 'rgba(220,38,38,0.10)',   text: '#DC2626' },
  annule:   { label: 'Annulé',    dot: '#6B7280', dim: 'rgba(107,114,128,0.10)', text: '#6B7280' },
}

const DEPT_CONFIG: Record<string, { label: string; short: string; color: string }> = {
  AC:  { label: 'Achats',                    short: 'AC',  color: '#7C3AED' },
  CO:  { label: 'Commercial',                short: 'CO',  color: '#0D9488' },
  ET:  { label: 'Études',                    short: 'ET',  color: '#2563EB' },
  MI:  { label: 'Management Qualité',        short: 'MI',  color: '#1C7A48' },
  RE1: { label: 'Réalisation 1',             short: 'RE1', color: '#B8870A' },
  RE2: { label: 'Réalisation 2 / Entretien', short: 'RE2', color: '#EA6A0A' },
  RH:  { label: 'Ressources Humaines',       short: 'RH',  color: '#DC2626' },
}

const CONFORMITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  C:  { label: 'Conforme',             color: '#1C7A48', bg: 'rgba(28,122,72,0.10)' },
  NC: { label: 'Non-conforme',         color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  NA: { label: 'Non applicable',       color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  PA: { label: "Piste d'amélioration", color: '#B8870A', bg: 'rgba(184,135,10,0.10)' },
}

const DEFAULT_AGENDA: Record<string, string[]> = {
  AC:  ["Plans d'actions R&O / Objectifs qualité", 'Ressources - RH', 'Produits & services / Prestataires externes', 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
  CO:  ['Plans R&O / Objectifs', 'Ressources - RH / Compétences', 'Revue des offres / des contrats', 'Communication clients', 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
  ET:  ['Plans R&O / Objectifs', 'Ressources - RH / Compétences', 'Études', 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
  MI:  ['Contexte / Enjeux / Parties intéressées', 'Plan R&O', 'Politique et objectifs qualité', 'Responsabilité - Autorités', 'Satisfaction client', 'NC - AC', 'Audit Interne', 'Revue de direction', 'Communication', 'Gestion des connaissances', 'Améliorations'],
  RE1: ['Plans R&O / Objectifs', 'Ressources - RH', 'Planification & Réalisation', 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
  RE2: ["Plans R&O / Objectifs", 'Ressources - RH / Compétences', 'Infrastructures', 'Planification', "Réalisation (Travaux d'entretien)", 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
  RH:  ['Plans R&O / Objectifs', 'Ressources - RH / Compétences', 'Sensibilisation', 'Surveillance - Mesure - Analyse', 'NC - Réclamations', 'AC - Améliorations'],
}
const DEFAULT_CRITERIA: Record<string, string> = {
  AC:  '4.4; 6.1; 6.2; 7.5; 8.4; 8.6; 8.7; 9.1; 10.2; 10.3',
  CO:  '4.4; 6.1; 6.2; 7.5; 8.2; 9.1; 10.2; 10.3',
  ET:  '4.4; 6.1; 6.2; 7.1; 7.2; 7.5; 8.1; 8.2; 8.3; 9.1; 9.2; 10.1; 10.2; 10.3',
  MI:  '4.1; 4.2; 4.3; 4.4; 5.1; 5.2; 5.3; 6.1; 6.2; 7.1; 7.4; 7.5; 9.1; 9.3; 10.1; 10.2; 10.3',
  RE1: '4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3',
  RE2: '4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3',
  RH:  '4.4; 5.3; 6.1; 6.2; 7.2; 7.3; 7.5; 9.1; 10.2; 10.3',
}
const DEFAULT_REF_DOCS: Record<string, string> = {
  AC: 'PRS-AC-01 & documents associés', CO: 'PRS-CO-01 & documents associés',
  ET: 'PRS-ET-01 & documents associés', MI: 'PRS-MI-01 & PRS-MI-02 & documents associés',
  RE1: 'PRS-RE-01 & documents associés', RE2: 'PRS-RE-02 & documents associés',
  RH: 'PRS-RH-01 & documents associés',
}
const DEFAULT_INTERLOCUTEURS: Record<string, string> = { MI: 'DG / RMQ' }
const DEFAULT_INTERLOCUTEUR_FALLBACK = 'Pilote processus & Collaborateurs'
const DEFAULT_TIME_SLOTS: Record<string, { start: string; end: string }> = {
  AC: { start: '11H00', end: '12H30' }, CO: { start: '09H00', end: '11H00' },
  ET: { start: '13H00', end: '15H30' }, MI: { start: '08H30', end: '11H00' },
  RE1: { start: '13H00', end: '16H00' }, RE2: { start: '13H00', end: '16H00' },
  RH: { start: '11H00', end: '12H30' },
}

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => currentYear - i)

// ─── Types ────────────────────────────────────────────────────────────────────

type User = { id: string; name: string; email: string; role: string }
type Props = { initialRows: AuditProgramRow[]; users: User[]; currentUserId: string; canEdit: boolean }

type AgendaItemDraft = {
  agendaStep: string; clauseRef: string; interlocuteurs: string
  response: string; conformity: string; evidence: string
}

type FormState = {
  dept: string; title: string; auditorName: string; auditeeResponsible: string
  scheduledDate: string; scheduledStartTime: string; scheduledEndTime: string
  actualDate: string; status: string; scope: string; objectives: string
  criteria: string; referenceDocuments: string; findings: string; notes: string
  items: AgendaItemDraft[]
}

function emptyItem(step = '', interlocu = ''): AgendaItemDraft {
  return { agendaStep: step, clauseRef: '', interlocuteurs: interlocu, response: '', conformity: '', evidence: '' }
}

function buildDefaultItems(dept: string): AgendaItemDraft[] {
  const steps = DEFAULT_AGENDA[dept] ?? []
  const interlocu = DEFAULT_INTERLOCUTEURS[dept] ?? DEFAULT_INTERLOCUTEUR_FALLBACK
  return steps.map((s) => emptyItem(s, interlocu))
}

function buildEmptyForm(dept = ''): FormState {
  const slot = dept ? DEFAULT_TIME_SLOTS[dept] : undefined
  return {
    dept, title: '', auditorName: '', auditeeResponsible: '',
    scheduledDate: '', scheduledStartTime: slot?.start ?? '', scheduledEndTime: slot?.end ?? '',
    actualDate: '', status: 'planifie', scope: '', objectives: '',
    criteria: dept ? (DEFAULT_CRITERIA[dept] ?? '') : '',
    referenceDocuments: dept ? (DEFAULT_REF_DOCS[dept] ?? '') : '',
    findings: '', notes: '',
    items: dept ? buildDefaultItems(dept) : [],
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditProgramsClient({ initialRows, users, currentUserId, canEdit }: Props) {
  const [rows, setRows]             = useState(initialRows)
  const [showForm, setShowForm]     = useState(false)
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState(String(currentYear))
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState<FormState>(buildEmptyForm())
  const [formStep, setFormStep]     = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    if (!form.dept) { setFormError('Sélectionnez un département'); return }
    setSubmitting(true); setFormError('')
    const validItems = form.items.filter((i) => i.agendaStep.trim())
    const res = await fetch('/api/audit-programs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dept: form.dept, title: form.title || undefined,
        auditorName: form.auditorName || undefined,
        auditeeResponsible: form.auditeeResponsible || undefined,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        scheduledStartTime: form.scheduledStartTime || undefined,
        scheduledEndTime: form.scheduledEndTime || undefined,
        actualDate: form.actualDate ? new Date(form.actualDate).toISOString() : undefined,
        status: form.status || undefined,
        criteria: form.criteria || undefined,
        referenceDocuments: form.referenceDocuments || undefined,
        findings: form.findings || undefined,
        notes: form.notes || undefined,
      }),
    })
    const created = await res.json() as { id?: string; error?: string }
    if (!res.ok) { setFormError(created.error ?? 'Erreur'); setSubmitting(false); return }
    if (validItems.length > 0 && created.id) {
      await fetch(`/api/audit-programs/${created.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      })
    }
    setShowForm(false); setForm(buildEmptyForm()); setFormStep(1)
    await loadRows(); setSubmitting(false)
  }

  async function patchRow(id: string, body: Record<string, unknown>) {
    await fetch(`/api/audit-programs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    await loadRows()
  }

  function openForm() { setForm(buildEmptyForm()); setFormStep(1); setFormError(''); setShowForm(true) }

  return (
    <div className="space-y-6">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #1C3D2E 0%, #2F6F4F 50%, #1a3828 100%)' }}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-36 h-36 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6EE7A0 0%, transparent 70%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Programmes d&apos;audit interne</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                FOR-MI-14 · ISO 9001:2015 clause 9.2
              </p>
              {/* Progress bar */}
              <div className="mt-3 w-56">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>Avancement {filterYear}</span>
                  <span className="font-semibold" style={{ color: '#6EE7A0' }}>{realised}/{rows.length} · {pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6EE7A0, #34D399)' }} />
                </div>
              </div>
            </div>
          </div>
          {canEdit && (
            <button onClick={openForm}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}>
              <Plus className="w-4 h-4" /> Nouveau programme
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="relative flex flex-wrap gap-2 mt-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = byStatus[key] ?? 0
            if (count === 0) return null
            return (
              <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{cfg.label}</span>
                <span className="font-bold" style={{ color: '#fff' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--admin-text-muted)' }}>Filtres</span>

          {/* Year filter — pill buttons */}
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

          {/* Dept filter */}
          <Select value={filterDept || '__all__'}
            onValueChange={(v) => { const val = v === '__all__' ? '' : v; setFilterDept(val); void loadRows({ dept: val }) }}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
              <SelectItem value="__all__">Tous départements</SelectItem>
              {Object.entries(DEPT_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{v} — {c.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Status filter */}
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
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--admin-emerald)' }} />
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Calendar} title="Aucun programme d'audit" description="Créez le programme d'audit annuel par département." />
        ) : rows.map((row) => (
          <AuditProgramCard key={row.id} row={row} canEdit={canEdit}
            expanded={expandedId === row.id}
            onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
            onPatch={(body) => void patchRow(row.id, body)} />
        ))}
      </div>

      {/* ── Create Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setForm(buildEmptyForm()); setFormStep(1) } }}>
        <SheetContent side="right" className="w-full max-w-2xl flex flex-col p-0 border-l"
          style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }}>

          {/* Sheet header */}
          <div className="relative overflow-hidden px-6 py-5 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1C3D2E 0%, #2F6F4F 100%)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
            <SheetHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-white text-base font-semibold text-left">Nouveau programme d&apos;audit</SheetTitle>
                  <p className="text-xs mt-0.5 text-left" style={{ color: 'rgba(255,255,255,0.6)' }}>FOR-MI-14 · ISO 9001:2015 clause 9.2</p>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {['Département', 'Planification', 'Référentiel', 'Agenda'].map((label, i) => {
                  const step = i + 1
                  const done = formStep > step
                  const active = formStep === step
                  return (
                    <button key={step} onClick={() => setFormStep(step)}
                      className="flex items-center gap-1.5 text-xs transition-all">
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all', active ? 'text-[#1C3D2E]' : done ? 'text-[#1C3D2E]' : 'text-white')}
                        style={{ background: active ? '#6EE7A0' : done ? '#34D399' : 'rgba(255,255,255,0.2)' }}>
                        {done ? <Check className="w-2.5 h-2.5" /> : step}
                      </span>
                      <span className={cn('hidden sm:inline', active ? 'font-semibold' : '')}
                        style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>{label}</span>
                      {step < 4 && <span style={{ color: 'rgba(255,255,255,0.25)' }}>›</span>}
                    </button>
                  )
                })}
              </div>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">

            {/* Step 1 — Département */}
            {formStep === 1 && (
              <div className="space-y-5">
                <StepHeader icon={<ClipboardCheck className="w-4 h-4" />} title="Sélectionnez le département audité" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(DEPT_CONFIG).map(([key, cfg]) => (
                    <button key={key}
                      onClick={() => { const f = buildEmptyForm(key); setForm(f) }}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: form.dept === key ? cfg.color : 'var(--admin-border)',
                        background: form.dept === key ? `${cfg.color}10` : 'var(--admin-surface)',
                      }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: cfg.color }}>
                        {cfg.short}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: form.dept === key ? cfg.color : 'var(--admin-text)' }}>{cfg.short}</p>
                        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--admin-text-muted)' }}>{cfg.label}</p>
                      </div>
                      {form.dept === key && (
                        <Check className="w-3.5 h-3.5 ml-auto mt-auto" style={{ color: cfg.color }} />
                      )}
                    </button>
                  ))}
                </div>

                {form.dept && (
                  <div className="space-y-3 pt-2">
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
                      <FieldGroup label="Auditeur">
                        <input value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                          placeholder="Nom de l'auditeur" />
                      </FieldGroup>
                      <FieldGroup label="Responsable audité">
                        <input value={form.auditeeResponsible} onChange={(e) => setForm((f) => ({ ...f, auditeeResponsible: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                          placeholder="Pilote processus" />
                      </FieldGroup>
                    </div>
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
                    {form.dept && DEFAULT_TIME_SLOTS[form.dept] && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                        Pré-rempli depuis Excel
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
              </div>
            )}

            {/* Step 3 — Référentiel */}
            {formStep === 3 && (
              <div className="space-y-4">
                <StepHeader icon={<BookOpen className="w-4 h-4" />} title="Référentiel ISO et documents" />
                <FieldGroup label="Clauses ISO 9001 applicables">
                  <div className="relative">
                    <input value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm focus-visible:outline-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                      placeholder="4.4; 6.1; 6.2; …" />
                    {form.dept && DEFAULT_CRITERIA[form.dept] && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                        Excel
                      </span>
                    )}
                  </div>
                </FieldGroup>
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

                {form.dept && DEFAULT_AGENDA[form.dept] && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{form.items.length} étapes pré-remplies depuis le FOR-MI-14 du département {form.dept}. Vous pouvez les modifier ci-dessous.</span>
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
                          onChange={(e) => setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], agendaStep: e.target.value }; return { ...f, items } })}
                          className="flex-1 bg-transparent text-sm focus-visible:outline-none"
                          style={{ color: 'var(--admin-text)' }}
                          placeholder="Étape du processus…" />
                        <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          className="p-1 rounded-lg transition-colors shrink-0"
                          style={{ color: 'var(--admin-text-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--admin-text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-3 pb-2.5 pl-10">
                        <input value={item.interlocuteurs}
                          onChange={(e) => setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], interlocuteurs: e.target.value }; return { ...f, items } })}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
                          placeholder="Interlocuteurs…" />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                    className="flex items-center gap-2 text-xs px-4 py-3 rounded-xl border-2 border-dashed w-full justify-center transition-colors"
                    style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--admin-accent)'; e.currentTarget.style.color = 'var(--admin-accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--admin-border)'; e.currentTarget.style.color = 'var(--admin-text-muted)' }}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter une étape
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl mt-4"
                style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
          </div>

          {/* Footer navigation */}
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
              <button onClick={() => { if (!form.dept && formStep === 1) { setFormError('Sélectionnez un département'); return }; setFormError(''); setFormStep((s) => s + 1) }}
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

// ─── Card ─────────────────────────────────────────────────────────────────────

function AuditProgramCard({ row, canEdit, expanded, onToggle, onPatch }: {
  row: AuditProgramRow; canEdit: boolean; expanded: boolean
  onToggle: () => void; onPatch: (body: Record<string, unknown>) => void
}) {
  const [items, setItems]                 = useState<AuditProgramItemRow[] | null>(null)
  const [loadingItems, setLoadingItems]   = useState(false)
  const [editStatus, setEditStatus]       = useState(row.status)
  const [actualDate, setActualDate]       = useState(row.actualDate ? new Date(row.actualDate).toISOString().split('T')[0] : '')
  const [auditorSignedAt, setAuditorSignedAt] = useState(row.auditorSignedAt ? new Date(row.auditorSignedAt).toISOString().split('T')[0] : '')
  const [findings, setFindings]           = useState(row.findings ?? '')
  const [saving, setSaving]               = useState(false)

  const statusCfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.planifie
  const deptCfg   = DEPT_CONFIG[row.dept]
  const timeSlot  = row.scheduledStartTime && row.scheduledEndTime
    ? `${row.scheduledStartTime} – ${row.scheduledEndTime}` : null
  const realised = items ? items.filter((i) => i.conformity && i.conformity !== '').length : 0
  const total    = items ? items.length : 0
  const pct      = total > 0 ? Math.round((realised / total) * 100) : 0

  async function loadItems() {
    if (items !== null) return
    setLoadingItems(true)
    const res = await fetch(`/api/audit-programs/${row.id}`)
    if (res.ok) { const d = await res.json() as { items: AuditProgramItemRow[] }; setItems(d.items ?? []) }
    setLoadingItems(false)
  }

  async function handleToggle() { onToggle(); if (!expanded) await loadItems() }

  async function saveItem(item: AuditProgramItemRow, patch: Partial<AuditProgramItemRow>) {
    const newItems = (items ?? []).map((i) => i.id === item.id ? { ...i, ...patch } : i)
    setItems(newItems)
    await fetch(`/api/audit-programs/${row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: newItems.map((i) => ({
          agendaStep: i.agendaStep, clauseRef: i.clauseRef,
          interlocuteurs: i.interlocuteurs, response: i.response,
          conformity: i.conformity, evidence: i.evidence, sortOrder: i.sortOrder,
        })),
      }),
    })
  }

  return (
    <div className="rounded-2xl border overflow-hidden transition-shadow"
      style={{
        borderColor: expanded ? (deptCfg?.color ?? 'var(--admin-accent)') : 'var(--admin-border)',
        background: 'var(--admin-surface)',
        boxShadow: expanded ? 'var(--admin-shadow-md)' : 'var(--admin-shadow-sm)',
        borderWidth: expanded ? '1.5px' : '1px',
      }}>

      {/* Card header */}
      <button className="w-full px-5 py-4 flex items-center gap-4 transition-colors text-left"
        style={{ background: expanded ? `${deptCfg?.color ?? '#2F6F4F'}08` : 'transparent' }}
        onClick={() => void handleToggle()}>

        {/* Dept badge */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: deptCfg?.color ?? 'var(--admin-accent)' }}>
          {row.dept}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{row.reference}</span>
            {row.dmsDocumentCode && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{row.dmsDocumentCode}</span>
            )}
            {/* Status chip */}
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: statusCfg.dim, color: statusCfg.text }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusCfg.dot }} />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--admin-text)' }}>
            {row.title ?? `Audit ${deptCfg?.label ?? row.dept} ${row.year}`}
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

      {/* Expanded body */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="px-5 py-5 space-y-5" style={{ background: 'var(--admin-bg)' }}>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {row.criteria && <MetaCard icon={<BookOpen className="w-3.5 h-3.5" />} label="Clauses ISO" value={row.criteria} />}
              {row.referenceDocuments && <MetaCard icon={<FileText className="w-3.5 h-3.5" />} label="Documents de réf." value={row.referenceDocuments} />}
              {timeSlot && <MetaCard icon={<Clock className="w-3.5 h-3.5" />} label="Horaire" value={timeSlot} />}
              {row.scope && <MetaCard icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Périmètre" value={row.scope} />}
              {row.auditorSignedAt && <MetaCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Signé le" value={new Date(row.auditorSignedAt).toLocaleDateString('fr-FR')} />}
            </div>

            {/* Agenda items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Étapes du processus</p>
                {items !== null && total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--admin-emerald)' }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--admin-emerald)' }}>{realised}/{total} évalués</span>
                  </div>
                )}
              </div>
              {loadingItems && (
                <div className="flex items-center gap-2 text-xs py-3" style={{ color: 'var(--admin-text-muted)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement des étapes…
                </div>
              )}
              {items !== null && items.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--admin-text-muted)' }}>Aucune étape enregistrée.</p>
              )}
              {items !== null && items.length > 0 && (
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <AgendaItemRow key={item.id} item={item} canEdit={canEdit}
                      onSave={(patch) => void saveItem(item, patch)} />
                  ))}
                </div>
              )}
            </div>

            {/* Update panel */}
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
                  onClick={() => { setSaving(true); onPatch({ status: editStatus, actualDate: actualDate ? new Date(actualDate).toISOString() : undefined, auditorSignedAt: auditorSignedAt ? new Date(auditorSignedAt).toISOString() : undefined, findings: findings || undefined }); setSaving(false) }}>
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

// ─── Agenda Item Row ──────────────────────────────────────────────────────────

function AgendaItemRow({ item, canEdit, onSave }: {
  item: AuditProgramItemRow; canEdit: boolean
  onSave: (patch: Partial<AuditProgramItemRow>) => void
}) {
  const [open, setOpen]         = useState(false)
  const [conformity, setConformity] = useState(item.conformity ?? '')
  const [response, setResponse] = useState(item.response ?? '')
  const [evidence, setEvidence] = useState(item.evidence ?? '')
  const conf = CONFORMITY_LABELS[conformity]

  return (
    <div className="rounded-xl border overflow-hidden transition-colors"
      style={{ borderColor: conf ? conf.color + '40' : 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #2F6F4F, #1C3D2E)' }}>
          {item.sortOrder + 1}
        </span>
        <span className="flex-1 text-sm" style={{ color: 'var(--admin-text)' }}>{item.agendaStep}</span>
        {item.interlocuteurs && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-lg hidden sm:inline"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
            {item.interlocuteurs}
          </span>
        )}
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: conf ? conf.bg : 'var(--admin-bg)',
            color: conf ? conf.color : 'var(--admin-text-muted)',
          }}>
          {conf ? conf.label : 'À évaluer'}
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
          : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          {item.clauseRef && (
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Clauses ISO : <span style={{ color: 'var(--admin-text)' }}>{item.clauseRef}</span>
            </p>
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
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
            </>
          ) : (
            <>
              {item.response && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{item.response}</p>}
              {item.evidence && <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Preuves : {item.evidence}</p>}
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
