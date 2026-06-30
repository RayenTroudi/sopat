'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ClipboardCheck, Loader2, AlertCircle, Calendar, User,
  CheckCircle2, Clock, CircleDot, ChevronRight, ChevronDown,
  Pencil, X, Check,
} from 'lucide-react'
import type { AuditRow } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CircleDot; gradient: string; dot: string }> = {
  scheduled:   { label: 'Planifié',  icon: CircleDot,    gradient: 'from-[#2563EB]/10 to-[#2563EB]/5', dot: '#2563EB' },
  in_progress: { label: 'En cours',  icon: Clock,        gradient: 'from-[#B8870A]/10 to-[#B8870A]/5', dot: '#B8870A' },
  completed:   { label: 'Clôturé',   icon: CheckCircle2, gradient: 'from-[#1C7A48]/12 to-[#1C7A48]/4', dot: '#1C7A48' },
}

const PROCESS_OPTIONS = [
  { value: 'etudes',      label: 'Études & Conception',  desc: 'Conception, chiffrage, dossiers techniques' },
  { value: 'realisation', label: 'Réalisation',          desc: 'Exécution chantier, suivi terrain' },
  { value: 'entretien',   label: 'Entretien & Suivi',    desc: 'Maintenance, visites périodiques' },
  { value: 'systeme',     label: 'Système qualité',      desc: 'Processus QMS, documentation' },
  { value: 'direction',   label: 'Revue de direction',   desc: 'Revue annuelle, orientations' },
]
const PROCESS_MAP = Object.fromEntries(PROCESS_OPTIONS.map((p) => [p.value, p.label]))

function fmtShort(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User  = { id: string; name: string }
type Props = { initialRows: AuditRow[]; total: number; users: User[]; isAdmin: boolean; currentUserId: string }

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditsClient({ initialRows, total, users, isAdmin, currentUserId }: Props) {
  const [rows, setRows]       = useState(initialRows)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFindings, setEditFindings] = useState('')
  const [editScope, setEditScope] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<AuditRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    auditorId: currentUserId, auditDate: '', processAudited: '', scope: '', findings: '', status: 'scheduled',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  async function loadAudits() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/audits?${params}`)
    if (res.ok) setRows((await res.json() as { rows: AuditRow[] }).rows)
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.auditDate) { setFormError('La date est obligatoire'); return }
    if (!form.auditorId) { setFormError("L'auditeur est obligatoire"); return }
    if (!form.processAudited) { setFormError('Le processus est obligatoire'); return }
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/audits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, auditDate: new Date(form.auditDate).toISOString(), scope: form.scope || undefined, findings: form.findings || undefined }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ auditorId: currentUserId, auditDate: '', processAudited: '', scope: '', findings: '', status: 'scheduled' })
    await loadAudits()
    setSubmitting(false)
  }

  async function handleDelete(audit: AuditRow) {
    setDeletingId(audit.id)
    const res = await fetch(`/api/audits/${audit.id}`, { method: 'DELETE' })
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== audit.id))
    setDeletingId(null); setConfirmDelete(null)
  }

  function startEdit(audit: AuditRow) {
    setEditingId(audit.id); setEditFindings(audit.findings ?? '')
    setEditScope(audit.scope ?? ''); setEditStatus(audit.status); setEditError('')
  }

  async function saveEdit(auditId: string) {
    setEditLoading(true); setEditError('')
    if (editStatus === 'completed' && !editFindings.trim()) {
      setEditError('Les constats sont obligatoires pour clôturer un audit')
      setEditLoading(false); return
    }
    const res = await fetch(`/api/audits/${auditId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findings: editFindings || undefined, scope: editScope || undefined, status: editStatus }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setEditError(data.error ?? 'Erreur'); setEditLoading(false); return }
    setEditingId(null); await loadAudits(); setEditLoading(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Audits Internes</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 9.2 · {total} audit{total !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="text-white hover:opacity-90" style={{ background: 'var(--admin-emerald)' }}>
            + Planifier un audit
          </Button>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border items-center"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <p className="text-xs font-medium mr-1" style={{ color: 'var(--admin-text-muted)' }}>Filtrer</p>
        {[
          { value: '', label: 'Tous statuts' },
          { value: 'scheduled', label: 'Planifiés' },
          { value: 'in_progress', label: 'En cours' },
          { value: 'completed', label: 'Clôturés' },
        ].map((opt) => (
          <button key={opt.value}
            onClick={() => { setFilterStatus(opt.value); setTimeout(() => void loadAudits(), 0) }}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
            style={{
              borderColor: filterStatus === opt.value ? 'var(--admin-accent)' : 'var(--admin-border)',
              background: filterStatus === opt.value ? 'var(--admin-accent)' : 'transparent',
              color: filterStatus === opt.value ? '#fff' : 'var(--admin-text-muted)',
            }}>
            {opt.label}
          </button>
        ))}
        <button onClick={() => void loadAudits()}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
          Actualiser
        </button>
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3" style={{ color: 'var(--admin-text-muted)' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--admin-emerald)' }} />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Aucun audit planifié" description="Créez votre premier audit interne ISO 9001:2015." />
        ) : rows.map((audit) => {
          const cfg = STATUS_CONFIG[audit.status] ?? STATUS_CONFIG.scheduled
          const StatusIcon = cfg.icon
          const isExpanded = expandedId === audit.id
          const isEditing  = editingId  === audit.id

          return (
            <div key={audit.id} className="rounded-2xl border overflow-hidden transition-shadow"
              style={{
                borderColor: 'var(--admin-border)',
                background: 'var(--admin-surface)',
                boxShadow: isExpanded ? 'var(--admin-shadow-md)' : 'var(--admin-shadow-sm)',
              }}>

              {/* Card header — always visible */}
              <div className={cn('flex items-center gap-4 px-5 py-4 bg-gradient-to-r', cfg.gradient)}>
                {/* Status icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'white', boxShadow: '0 1px 4px rgba(15,36,25,0.10)' }}>
                  <StatusIcon className="w-4.5 h-4.5" style={{ color: cfg.dot, width: '18px', height: '18px' }} />
                </div>

                {/* Core info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{audit.reference}</span>
                    {audit.dmsDocumentCode && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                        {audit.dmsDocumentCode}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'white', color: cfg.dot, boxShadow: '0 1px 3px rgba(15,36,25,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--admin-text)' }}>
                    {PROCESS_MAP[audit.processAudited] ?? audit.processAudited}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--admin-text-muted)' }}>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{audit.auditorName ?? '—'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtShort(audit.auditDate)}</span>
                    {audit.completedAt && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" style={{ color: 'var(--admin-emerald)' }} />Clôturé le {fmtShort(audit.completedAt)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {audit.status !== 'completed' && isAdmin && !isEditing && (
                    <button onClick={() => { startEdit(audit); setExpandedId(audit.id) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                      style={{ color: 'var(--admin-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-bg)'; e.currentTarget.style.color = 'var(--admin-accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--admin-text-muted)' }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && <DeleteButton variant="icon" onClick={() => setConfirmDelete(audit)} />}
                  <button onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                    style={{ color: 'var(--admin-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-bg)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t" style={{ borderColor: 'var(--admin-border)' }}>
                  {isEditing ? (
                    <div className="px-5 py-5 space-y-4" style={{ background: 'var(--admin-bg)' }}>
                      {/* Edit form */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldGroup label="Périmètre">
                          <textarea value={editScope} onChange={(e) => setEditScope(e.target.value)}
                            rows={3} placeholder="Activités et départements couverts…"
                            className="w-full px-3 py-2 rounded-xl border text-sm resize-none transition-colors focus-visible:outline-none"
                            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                        </FieldGroup>
                        <FieldGroup label="Statut">
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="rounded-xl" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                              <SelectItem value="scheduled">Planifié</SelectItem>
                              <SelectItem value="in_progress">En cours</SelectItem>
                              <SelectItem value="completed">Clôturé</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Constats *">
                        <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)}
                          rows={4} placeholder="Observations, points positifs, axes d'amélioration…"
                          className="w-full px-3 py-2 rounded-xl border text-sm resize-none focus-visible:outline-none"
                          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                      </FieldGroup>
                      {editError && (
                        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
                          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                          <AlertCircle className="w-4 h-4 shrink-0" />{editError}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditingId(null)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
                          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                          <X className="w-3.5 h-3.5" /> Annuler
                        </button>
                        <button onClick={() => void saveEdit(audit.id)} disabled={editLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #1C7A48, #2D5A42)' }}>
                          {editLoading
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde…</>
                            : <><Check className="w-3.5 h-3.5" /> Sauvegarder</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-4 space-y-4">
                      {audit.scope && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>Périmètre</p>
                          <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{audit.scope}</p>
                        </div>
                      )}
                      {audit.findings ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>Constats</p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--admin-text)' }}>{audit.findings}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-3 px-4 rounded-xl"
                          style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
                          <ClipboardCheck className="w-4 h-4 shrink-0" />
                          <span className="text-sm">Aucun constat enregistré. Cliquez sur Modifier pour ajouter les résultats.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <DeleteModal
        open={!!confirmDelete}
        title="Supprimer l'audit ?"
        description={confirmDelete ? <><strong>{confirmDelete.reference}</strong> — {PROCESS_MAP[confirmDelete.processAudited] ?? confirmDelete.processAudited} sera archivé.</> : null}
        loading={!!deletingId}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />

      {/* ── Create Sheet ─────────────────────────────────────────────────────── */}
      {isAdmin && (
        <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setFormError('') }}>
          <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0 border-l"
            style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }}>

            {/* Sheet header — green gradient */}
            <div className="relative overflow-hidden px-6 py-5 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1C3D2E 0%, #2D5A42 100%)' }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
              <SheetHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <ClipboardCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-white text-base font-semibold text-left">Planifier un audit interne</SheetTitle>
                    <p className="text-xs mt-0.5 text-left" style={{ color: 'rgba(255,255,255,0.6)' }}>ISO 9001:2015 · clause 9.2</p>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

              {/* Step 1 — Qui & Quand */}
              <StepSection number="1" title="Qui & Quand">
                <FieldGroup label="Auditeur *">
                  <Select value={form.auditorId} onValueChange={(v) => setForm((f) => ({ ...f, auditorId: v }))}>
                    <SelectTrigger className="rounded-xl h-10" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="Date de l'audit *">
                    <input type="date" value={form.auditDate} onChange={(e) => setForm((f) => ({ ...f, auditDate: e.target.value }))}
                      className="w-full px-3 h-10 rounded-xl border text-sm focus-visible:outline-none"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                  </FieldGroup>
                  <FieldGroup label="Statut initial">
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger className="rounded-xl h-10" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                        <SelectItem value="scheduled">Planifié</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="completed">Clôturé</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
              </StepSection>

              {/* Step 2 — Processus audité */}
              <StepSection number="2" title="Processus audité *">
                <div className="grid grid-cols-1 gap-2">
                  {PROCESS_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => setForm((f) => ({ ...f, processAudited: opt.value }))}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: form.processAudited === opt.value ? 'var(--admin-accent)' : 'var(--admin-border)',
                        background: form.processAudited === opt.value ? 'var(--admin-accent-dim)' : 'var(--admin-surface)',
                      }}>
                      <div className="w-2 h-2 rounded-full shrink-0 mt-0.5 transition-colors"
                        style={{ background: form.processAudited === opt.value ? 'var(--admin-accent)' : 'var(--admin-border)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: form.processAudited === opt.value ? 'var(--admin-accent)' : 'var(--admin-text)' }}>
                          {opt.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{opt.desc}</p>
                      </div>
                      {form.processAudited === opt.value && (
                        <Check className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--admin-accent)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </StepSection>

              {/* Step 3 — Détails */}
              <StepSection number="3" title="Détails de l'audit">
                <FieldGroup label="Périmètre / Scope">
                  <textarea value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                    rows={2} placeholder="Départements, activités ou processus couverts…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </FieldGroup>
                <FieldGroup label="Constats initiaux">
                  <textarea value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))}
                    rows={3} placeholder="À compléter lors ou après l'audit…"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus-visible:outline-none"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }} />
                </FieldGroup>
              </StepSection>

              {formError && (
                <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                  style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Annuler</Button>
              <button onClick={() => void handleCreate()} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1C7A48 0%, #2D5A42 100%)' }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Planification…</> : "Planifier l'audit"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #2F6F4F, #1C3D2E)' }}>
          {number}
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</p>
        <div className="flex-1 h-px" style={{ background: 'var(--admin-border)' }} />
      </div>
      <div className="space-y-3 pl-8">
        {children}
      </div>
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
