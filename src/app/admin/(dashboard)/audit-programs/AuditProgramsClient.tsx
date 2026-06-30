'use client'

import { useState } from 'react'
import { Calendar, Loader2, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditProgramRow, AuditProgramItemRow } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  AC: 'Achats', CO: 'Commercial', ET: 'Études',
  MI: 'Management Qualité', RE1: 'Réalisation 1',
  RE2: 'Réalisation 2 / Entretien', RH: 'Ressources Humaines',
}
const CONFORMITY_LABELS: Record<string, { label: string; color: string }> = {
  C:  { label: 'Conforme',             color: 'var(--admin-emerald)' },
  NC: { label: 'Non-conforme',         color: 'var(--admin-red)' },
  NA: { label: 'Non applicable',       color: 'var(--admin-text-muted)' },
  PA: { label: "Piste d'amélioration", color: 'var(--admin-amber)' },
}

// Default agenda steps per dept, from Excel FOR-MI-14
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const selectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
  const pct = rows.length > 0 ? Math.round(((byStatus['realise'] ?? 0) / rows.length) * 100) : 0

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
    setShowForm(false); setForm(buildEmptyForm())
    await loadRows(); setSubmitting(false)
  }

  async function patchRow(id: string, body: Record<string, unknown>) {
    await fetch(`/api/audit-programs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    await loadRows()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Programmes d&apos;audit interne</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-14 · ISO 9001:2015 clause 9.2 · {rows.length} programme{rows.length !== 1 ? 's' : ''} · {pct}% réalisés
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)} className="text-white hover:opacity-90 w-full sm:w-auto"
            style={{ background: 'var(--admin-blue)' }}>
            + Nouveau programme
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Avancement {filterYear || 'toutes années'}</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--admin-emerald)' }}>{byStatus['realise'] ?? 0} / {rows.length} réalisés ({pct}%)</p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--admin-emerald)' }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(byStatus).map(([s, n]) => (
            <span key={s} className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[s] ?? '')}>
              {STATUS_LABELS[s] ?? s} · {n}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border items-center"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {[
          { value: filterYear, setter: setFilterYear, key: 'year', all: 'Toutes années', options: YEAR_OPTIONS.map((y) => ({ v: String(y), l: String(y) })) },
          { value: filterDept, setter: setFilterDept, key: 'dept', all: 'Tous dépt.', options: Object.entries(DEPT_LABELS).map(([v, l]) => ({ v, l: `${v} – ${l}` })) },
          { value: filterStatus, setter: setFilterStatus, key: 'status', all: 'Tous statuts', options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ v, l })) },
        ].map(({ value, setter, key, all, options }) => (
          <Select key={key} value={value || '__all__'}
            onValueChange={(v) => { const val = v === '__all__' ? '' : v; setter(val); void loadRows({ [key]: val }) }}>
            <SelectTrigger className="text-sm h-9 w-auto" style={selectStyle}><SelectValue /></SelectTrigger>
            <SelectContent style={selectStyle}>
              <SelectItem value="__all__">{all}</SelectItem>
              {options.map(({ v, l }) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--admin-text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
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

      {/* Create Sheet */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setForm(buildEmptyForm()) }}>
        <SheetContent side="right" className="w-full max-w-2xl flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
          <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            <SheetTitle style={{ color: 'var(--admin-text)' }}>Nouveau programme d&apos;audit</SheetTitle>
            <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>FOR-MI-14 · ISO 9001:2015 clause 9.2</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <SectionLabel>Identification</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Département *">
                <Select value={form.dept || '__none__'}
                  onValueChange={(v) => setForm(buildEmptyForm(v === '__none__' ? '' : v))}>
                  <SelectTrigger style={selectStyle}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent style={selectStyle}>
                    <SelectItem value="__none__">—</SelectItem>
                    {Object.entries(DEPT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{v} – {l}</SelectItem>)}
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
                  className={inputClass} style={inputStyle} placeholder="Pilote processus" />
              </FormField>
            </div>

            <SectionLabel>Planification</SectionLabel>
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
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Horaire début">
                <input value={form.scheduledStartTime} onChange={(e) => setForm((f) => ({ ...f, scheduledStartTime: e.target.value }))}
                  className={inputClass} style={inputStyle} placeholder="09H00" />
              </FormField>
              <FormField label="Horaire fin">
                <input value={form.scheduledEndTime} onChange={(e) => setForm((f) => ({ ...f, scheduledEndTime: e.target.value }))}
                  className={inputClass} style={inputStyle} placeholder="11H00" />
              </FormField>
            </div>

            <SectionLabel>Référentiel</SectionLabel>
            <FormField label="Clauses ISO 9001">
              <input value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))}
                className={inputClass} style={inputStyle} placeholder="ex: 4.4; 6.1; 8.4" />
            </FormField>
            <FormField label="Documents de référence">
              <input value={form.referenceDocuments} onChange={(e) => setForm((f) => ({ ...f, referenceDocuments: e.target.value }))}
                className={inputClass} style={inputStyle} placeholder="ex: PRS-AC-01 & documents associés" />
            </FormField>

            <SectionLabel>Étapes du processus (agenda)</SectionLabel>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-mono shrink-0 w-5 text-right" style={{ color: 'var(--admin-text-muted)' }}>{idx + 1}.</span>
                    <input value={item.agendaStep}
                      onChange={(e) => setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], agendaStep: e.target.value }; return { ...f, items } })}
                      className={cn(inputClass, 'flex-1')} style={inputStyle} placeholder="Étape du processus…" />
                    <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      className="p-1 rounded hover:bg-[var(--admin-red-dim)] transition-colors shrink-0"
                      style={{ color: 'var(--admin-text-muted)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={item.interlocuteurs}
                    onChange={(e) => setForm((f) => { const items = [...f.items]; items[idx] = { ...items[idx], interlocuteurs: e.target.value }; return { ...f, items } })}
                    className={cn(inputClass, 'text-xs')} style={inputStyle}
                    placeholder="Interlocuteurs (ex: Pilote processus & Collaborateurs)" />
                </div>
              ))}
              <button onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed w-full justify-center hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                <Plus className="w-3.5 h-3.5" /> Ajouter une étape
              </button>
            </div>

            <SectionLabel>Notes</SectionLabel>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} className={cn(inputClass, 'resize-none')} style={inputStyle} placeholder="Notes complémentaires…" />

            {formError && (
              <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
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

  const timeSlot = row.scheduledStartTime && row.scheduledEndTime
    ? `${row.scheduledStartTime} à ${row.scheduledEndTime}` : null

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <button className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[var(--admin-bg)] transition-colors text-left"
        onClick={() => void handleToggle()}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>{row.dept}</span>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{row.reference}</span>
            {row.dmsDocumentCode && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{row.dmsDocumentCode}</span>
            )}
            <Badge className={cn('text-[10px] font-medium rounded-full border', STATUS_COLORS[row.status] ?? '')}>
              {STATUS_LABELS[row.status] ?? row.status}
            </Badge>
          </div>
          <p className="text-sm mt-1 truncate" style={{ color: 'var(--admin-text)' }}>
            {row.title ?? `Audit ${DEPT_LABELS[row.dept] ?? row.dept} ${row.year}`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {row.auditorName ? `Auditeur : ${row.auditorName}` : ''}
            {row.scheduledDate ? ` · ${new Date(row.scheduledDate).toLocaleDateString('fr-FR')}` : ''}
            {timeSlot ? ` · ${timeSlot}` : ''}
            {row.auditeeResponsible ? ` · ${row.auditeeResponsible}` : ''}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {expanded && (
        <div className="border-t space-y-5 px-5 py-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          {/* Meta pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {row.criteria           && <InfoPill label="Clauses ISO"        value={row.criteria} />}
            {row.referenceDocuments && <InfoPill label="Documents de réf."  value={row.referenceDocuments} />}
            {timeSlot               && <InfoPill label="Horaire"            value={timeSlot} />}
            {row.scope              && <InfoPill label="Périmètre"          value={row.scope} />}
            {row.auditorSignedAt    && <InfoPill label="Signé le"           value={new Date(row.auditorSignedAt).toLocaleDateString('fr-FR')} />}
          </div>

          {/* Agenda items */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>Étapes du processus</p>
            {loadingItems && (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--admin-text-muted)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
              </div>
            )}
            {items !== null && items.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucune étape enregistrée.</p>
            )}
            {items !== null && items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => (
                  <AgendaItemRow key={item.id} item={item} canEdit={canEdit}
                    onSave={(patch) => void saveItem(item, patch)} />
                ))}
              </div>
            )}
          </div>

          {/* Update panel */}
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
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Date de signature auditeur</label>
                <input type="date" value={auditorSignedAt} onChange={(e) => setAuditorSignedAt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Constats</label>
                <textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={3}
                  placeholder="Constats de l'audit, NC détectées…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
              <Button size="sm" disabled={saving} className="text-white" style={{ background: 'var(--admin-blue)' }}
                onClick={() => { setSaving(true); onPatch({ status: editStatus, actualDate: actualDate ? new Date(actualDate).toISOString() : undefined, auditorSignedAt: auditorSignedAt ? new Date(auditorSignedAt).toISOString() : undefined, findings: findings || undefined }); setSaving(false) }}>
                {saving ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Enregistrement…</> : 'Enregistrer'}
              </Button>
            </div>
          )}

          {!canEdit && row.findings && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Constats</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{row.findings}</p>
            </div>
          )}
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
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--admin-surface)] transition-colors"
        onClick={() => setOpen((o) => !o)}>
        <span className="text-xs font-mono w-5 shrink-0 text-right" style={{ color: 'var(--admin-text-muted)' }}>
          {item.sortOrder + 1}.
        </span>
        <span className="flex-1 text-sm" style={{ color: 'var(--admin-text)' }}>{item.agendaStep}</span>
        {item.interlocuteurs && (
          <span className="text-[10px] px-1.5 py-0.5 rounded hidden sm:inline"
            style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
            {item.interlocuteurs}
          </span>
        )}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--admin-border)', color: conf ? conf.color : 'var(--admin-text-muted)' }}>
          {conf ? conf.label : 'À évaluer'}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />
              : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--admin-text-muted)' }} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          {item.clauseRef && (
            <p className="text-xs pt-2" style={{ color: 'var(--admin-text-muted)' }}>
              Clauses : <span style={{ color: 'var(--admin-text)' }}>{item.clauseRef}</span>
            </p>
          )}
          {canEdit ? (
            <>
              <div className="space-y-1.5 pt-1">
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Conformité</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CONFORMITY_LABELS).map(([v, { label, color }]) => (
                    <button key={v} onClick={() => { setConformity(v); onSave({ conformity: v }) }}
                      className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                      style={{
                        borderColor: conformity === v ? color : 'var(--admin-border)',
                        color: conformity === v ? color : 'var(--admin-text-muted)',
                        fontWeight: conformity === v ? 600 : 400,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Observations</label>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)}
                  onBlur={() => onSave({ response })} rows={2}
                  placeholder="Observations de l'auditeur…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Preuves objectivées</label>
                <input value={evidence} onChange={(e) => setEvidence(e.target.value)}
                  onBlur={() => onSave({ evidence })}
                  placeholder="Références des preuves…"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
              </div>
            </>
          ) : (
            <>
              {item.response && <p className="text-sm pt-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{item.response}</p>}
              {item.evidence && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Preuves : {item.evidence}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--admin-text-muted)' }}>{children}</p>
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{label}</label>
      {children}
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--admin-surface)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}
