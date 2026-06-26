'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ClipboardCheck, Loader2, AlertCircle } from 'lucide-react'
import type { AuditRow } from '@/lib/db/iso'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { DeleteButton } from '@/components/ui/DeleteButton'

const STATUS_LABELS: Record<string, string> = {
  scheduled:   'Planifié',
  in_progress: 'En cours',
  completed:   'Clôturé',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  completed:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
}

const PROCESS_OPTIONS = [
  { value: 'etudes',      label: 'Études & Conception' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'entretien',   label: 'Entretien & Suivi' },
  { value: 'systeme',     label: 'Système qualité' },
  { value: 'direction',   label: 'Revue de direction' },
]
const PROCESS_MAP = Object.fromEntries(PROCESS_OPTIONS.map((p) => [p.value, p.label]))

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string }
type Props = {
  initialRows:   AuditRow[]
  total:         number
  users:         User[]
  isAdmin:       boolean
  currentUserId: string
}

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const selectClass = 'text-sm border rounded-lg pl-3 pr-8 py-1.5 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const filterSelectStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

export function AuditsClient({ initialRows, total, users, isAdmin, currentUserId }: Props) {
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus]     = useState('')
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editFindings, setEditFindings]     = useState('')
  const [editScope, setEditScope]           = useState('')
  const [editStatus, setEditStatus]         = useState('')
  const [editLoading, setEditLoading]       = useState(false)
  const [editError, setEditError]           = useState('')
  const [confirmDelete, setConfirmDelete]   = useState<AuditRow | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  async function handleDelete(audit: AuditRow) {
    setDeletingId(audit.id)
    const res = await fetch(`/api/audits/${audit.id}`, { method: 'DELETE' })
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== audit.id))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  const [form, setForm] = useState({
    auditorId: currentUserId, auditDate: '', processAudited: 'etudes', scope: '', findings: '', status: 'scheduled',
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
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/audits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, auditDate: new Date(form.auditDate).toISOString(), scope: form.scope || undefined, findings: form.findings || undefined }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ auditorId: currentUserId, auditDate: '', processAudited: 'etudes', scope: '', findings: '', status: 'scheduled' })
    await loadAudits()
    setSubmitting(false)
  }

  function startEdit(audit: AuditRow) {
    setEditingId(audit.id)
    setEditFindings(audit.findings ?? '')
    setEditScope(audit.scope ?? '')
    setEditStatus(audit.status)
    setEditError('')
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
    setEditingId(null)
    await loadAudits()
    setEditLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Audits Internes</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 9.2 · {total} audit{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
            + Planifier un audit
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <Select
          value={filterStatus === '' ? '__all__' : filterStatus}
          onValueChange={(v) => { const next = v === '__all__' ? '' : v; setFilterStatus(next); setTimeout(() => void loadAudits(), 0) }}
        >
          <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full sm:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectItem value="__all__">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void loadAudits()}>Actualiser</Button>
      </div>

      {/* Audit cards list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--admin-emerald)' }} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Aucun audit planifié" description="Créez votre premier audit interne ISO 9001:2015." />
        ) : rows.map((audit) => (
          <div key={audit.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            {/* Audit header */}
            <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-3" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{audit.reference}</span>
                {audit.dmsDocumentCode && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
                    {audit.dmsDocumentCode}
                  </span>
                )}
                <Badge className={cn('text-xs font-medium rounded-full', STATUS_COLORS[audit.status] ?? STATUS_COLORS.scheduled)}>
                  {STATUS_LABELS[audit.status] ?? audit.status}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {PROCESS_MAP[audit.processAudited] ?? audit.processAudited}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                <span>Auditeur : <strong>{audit.auditorName ?? '—'}</strong></span>
                <span>Date : {fmt(audit.auditDate)}</span>
                {audit.status !== 'completed' && isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => startEdit(audit)} className="text-xs h-7 px-2" style={{ color: 'var(--admin-emerald)' }}>
                    {editingId === audit.id ? 'Annuler' : 'Modifier'}
                  </Button>
                )}
                {isAdmin && (
                  <DeleteButton variant="icon" onClick={() => setConfirmDelete(audit)} />
                )}
              </div>
            </div>

            {/* Content */}
            {editingId !== audit.id ? (
              <div className="px-5 py-4 space-y-3">
                {audit.scope && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>PÉRIMÈTRE</p>
                    <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{audit.scope}</p>
                  </div>
                )}
                {audit.findings ? (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>CONSTATS</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{audit.findings}</p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun constat enregistré.</p>
                )}
                {audit.completedAt && (
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Clôturé le {fmt(audit.completedAt)}</p>
                )}
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <FF label="Périmètre">
                  <textarea value={editScope} onChange={(e) => setEditScope(e.target.value)} rows={2} className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FF>
                <FF label="Constats *">
                  <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)} rows={4} placeholder="Constats d'audit, observations, points positifs et axes d'amélioration…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
                </FF>
                <FF label="Statut">
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v)}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="scheduled">Planifié</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Clôturé</SelectItem>
                    </SelectContent>
                  </Select>
                </FF>
                {editError && (
                  <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />{editError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                  <Button size="sm" onClick={() => void saveEdit(audit.id)} disabled={editLoading} style={{ background: 'var(--admin-emerald)' }} className="text-white hover:opacity-90">
                    {editLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sauvegarde…</> : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create audit Sheet */}
      <DeleteModal
        open={!!confirmDelete}
        title="Supprimer l'audit ?"
        description={confirmDelete ? <><strong>{confirmDelete.reference}</strong> — {PROCESS_MAP[confirmDelete.processAudited] ?? confirmDelete.processAudited} sera archivé.</> : null}
        loading={!!deletingId}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />

      {isAdmin && (
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent side="right" className="w-full max-w-lg flex flex-col p-0" style={{ background: 'var(--admin-surface)' }}>
            <SheetHeader className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <SheetTitle style={{ color: 'var(--admin-text)' }}>Planifier un audit interne</SheetTitle>
              <SheetDescription style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 9.2</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FF label="Auditeur *">
                <Select value={form.auditorId} onValueChange={(v) => setForm(f => ({ ...f, auditorId: v }))}>
                  <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Date *">
                  <input type="date" value={form.auditDate} onChange={(e) => setForm(f => ({ ...f, auditDate: e.target.value }))} className={inputClass} style={inputStyle} />
                </FF>
                <FF label="Statut">
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="scheduled">Planifié</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Clôturé</SelectItem>
                    </SelectContent>
                  </Select>
                </FF>
              </div>
              <FF label="Processus audité *">
                <Select value={form.processAudited} onValueChange={(v) => setForm(f => ({ ...f, processAudited: v }))}>
                  <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    {PROCESS_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FF>
              <FF label="Périmètre / Scope">
                <textarea value={form.scope} onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))} rows={2} placeholder="Départements, activités ou processus couverts…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
              </FF>
              <FF label="Constats initiaux">
                <textarea value={form.findings} onChange={(e) => setForm(f => ({ ...f, findings: e.target.value }))} rows={3} placeholder="À compléter lors de l'audit ou après clôture…" className={cn(inputClass, 'resize-none')} style={inputStyle} />
              </FF>
              {formError && (
                <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="flex-1 text-white" onClick={() => void handleCreate()} disabled={submitting} style={{ background: 'var(--admin-emerald)' }}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement…</> : "Planifier l'audit"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{label}</label>
      {children}
    </div>
  )
}
