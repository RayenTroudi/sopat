'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AuditRow } from '@/lib/db/iso'

const STATUS_LABELS: Record<string, string> = {
  scheduled:   'Planifié',
  in_progress: 'En cours',
  completed:   'Clôturé',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  completed:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
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

export function AuditsClient({ initialRows, total, users, isAdmin, currentUserId }: Props) {
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editFindings, setEditFindings] = useState('')
  const [editScope, setEditScope]       = useState('')
  const [editStatus, setEditStatus]     = useState('')
  const [editLoading, setEditLoading]   = useState(false)
  const [editError, setEditError]       = useState('')

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
    if (!form.auditorId) { setFormError('L\'auditeur est obligatoire'); return }
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Audits Internes</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 9.2 · {total} audit{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--admin-emerald)' }}>
            <span>+</span> Planifier un audit
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadAudits(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', color:'var(--admin-text)' }}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => void loadAudits()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Actualiser</button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center"><span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor:'var(--admin-border)', borderTopColor:'var(--admin-emerald)' }} /></div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color:'var(--admin-text-muted)' }}>Aucun audit planifié.</p>
        ) : rows.map((audit) => (
          <div key={audit.id} className="rounded-xl border overflow-hidden" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)' }}>
            {/* Audit header */}
            <div className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-3" style={{ borderColor:'var(--admin-border)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold" style={{ color:'var(--admin-text)' }}>{audit.reference}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[audit.status] ?? STATUS_COLORS.scheduled)}>
                  {STATUS_LABELS[audit.status] ?? audit.status}
                </span>
                <span className="text-xs" style={{ color:'var(--admin-text-muted)' }}>
                  {PROCESS_MAP[audit.processAudited] ?? audit.processAudited}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color:'var(--admin-text-muted)' }}>
                <span>Auditeur : <strong>{audit.auditorName ?? '—'}</strong></span>
                <span>Date : {fmt(audit.auditDate)}</span>
                {audit.status !== 'completed' && isAdmin && (
                  <button onClick={() => startEdit(audit)} className="text-xs underline" style={{ color:'var(--admin-blue)' }}>
                    {editingId === audit.id ? 'Annuler' : 'Modifier'}
                  </button>
                )}
              </div>
            </div>

            {/* Scope + findings (read) */}
            {editingId !== audit.id ? (
              <div className="px-5 py-4 space-y-3">
                {audit.scope && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color:'var(--admin-text-muted)' }}>PÉRIMÈTRE</p>
                    <p className="text-sm" style={{ color:'var(--admin-text)' }}>{audit.scope}</p>
                  </div>
                )}
                {audit.findings ? (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color:'var(--admin-text-muted)' }}>CONSTATS</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color:'var(--admin-text)' }}>{audit.findings}</p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color:'var(--admin-text-muted)' }}>Aucun constat enregistré.</p>
                )}
                {audit.completedAt && (
                  <p className="text-xs" style={{ color:'var(--admin-text-muted)' }}>Clôturé le {fmt(audit.completedAt)}</p>
                )}
              </div>
            ) : (
              /* Edit form */
              <div className="px-5 py-4 space-y-3">
                <FF label="Périmètre">
                  <textarea value={editScope} onChange={(e) => setEditScope(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                </FF>
                <FF label="Constats *">
                  <textarea value={editFindings} onChange={(e) => setEditFindings(e.target.value)} rows={4} placeholder="Constats d'audit, observations, points positifs et axes d'amélioration…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                </FF>
                <FF label="Statut">
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                    <option value="scheduled">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Clôturé</option>
                  </select>
                </FF>
                {editError && <p className="text-sm" style={{ color:'var(--admin-red)' }}>{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
                  <button onClick={() => void saveEdit(audit.id)} disabled={editLoading} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
                    {editLoading ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create audit drawer */}
      {showForm && isAdmin && (
        <>
          <div className="fixed inset-0 z-40" style={{ background:'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background:'var(--admin-surface)', borderLeft:'1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor:'var(--admin-border)' }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color:'var(--admin-text)' }}>Planifier un audit interne</h2>
                <p className="text-xs mt-0.5" style={{ color:'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 9.2</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color:'var(--admin-text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              <FF label="Auditeur *">
                <select value={form.auditorId} onChange={(e) => setForm(f => ({ ...f, auditorId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Date *">
                  <input type="date" value={form.auditDate} onChange={(e) => setForm(f => ({ ...f, auditDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                </FF>
                <FF label="Statut">
                  <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                    <option value="scheduled">Planifié</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Clôturé</option>
                  </select>
                </FF>
              </div>
              <FF label="Processus audité *">
                <select value={form.processAudited} onChange={(e) => setForm(f => ({ ...f, processAudited: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }}>
                  {PROCESS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </FF>
              <FF label="Périmètre / Scope">
                <textarea value={form.scope} onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))} rows={2} placeholder="Départements, activités ou processus couverts…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
              </FF>
              <FF label="Constats initiaux">
                <textarea value={form.findings} onChange={(e) => setForm(f => ({ ...f, findings: e.target.value }))} rows={3} placeholder="À compléter lors de l'audit ou après clôture…" className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
              </FF>
              {formError && <p className="text-sm px-3 py-2 rounded-lg" style={{ background:'var(--admin-red-dim)', color:'var(--admin-red)' }}>{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
                <button onClick={() => void handleCreate()} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
                  {submitting ? 'Enregistrement…' : 'Planifier l\'audit'}
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
