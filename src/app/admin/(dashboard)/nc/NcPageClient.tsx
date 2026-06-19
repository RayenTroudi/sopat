'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NcListItem } from '@/lib/db/iso'

const STATUS_LABELS: Record<string, string> = {
  open:        'Ouvert',
  in_progress: 'En cours',
  closed:      'Clôturé',
  verified:    'Vérifié',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  closed:      'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
  verified:    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
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

type Props = {
  initialRows:     NcListItem[]
  total:           number
  users:           User[]
  currentUserId:   string
  currentUserName: string
}

export function NcPageClient({ initialRows, total, users, currentUserId, currentUserName }: Props) {
  const [rows, setRows]           = useState(initialRows)
  const [showForm, setShowForm]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)

  // Create form state
  const [form, setForm] = useState({
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
    setForm({ ncType: '', ownerType: '', auditorName: '', description: '', rootCause: '', assignedTo: '', deadline: '' })
    await loadNcs()
    setSubmitting(false)
  }

  const openCount  = rows.filter((r) => r.status === 'open' || r.status === 'in_progress').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Non-Conformités</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · clause 10.2 · {openCount} ouverte{openCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--admin-red)' }}
        >
          <span className="text-base leading-none">+</span> Créer une NC
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadNcs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={filterProcess}
          onChange={(e) => { setFilterProcess(e.target.value); setTimeout(() => void loadNcs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        >
          <option value="">Tous processus</option>
          {Object.entries(PROCESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadNcs()}
          placeholder="Rechercher…"
          className="text-sm px-3 py-1.5 rounded-lg border flex-1 min-w-[160px]"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => void loadNcs()}
          className="text-sm px-3 py-1.5 rounded-lg border"
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
          <p className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune non-conformité trouvée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Référence', 'Statut', 'Type', 'Description', 'Projet', 'Assigné à', 'Délai', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((nc) => (
                  <tr key={nc.id} className="transition-colors hover:bg-[var(--admin-bg)]" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{nc.reference}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[nc.status] ?? STATUS_COLORS.open)}>
                        {STATUS_LABELS[nc.status] ?? nc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {NC_TYPE_LABELS[(nc as any).ncType] ?? PROCESS_LABELS[(nc as any).processAffected] ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="truncate text-sm" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {nc.projectName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {nc.assignedToName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: nc.deadline && new Date(nc.deadline) < new Date() ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                      {nc.deadline ? fmt(nc.deadline) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/nc/${nc.id}`} className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create NC drawer */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Créer une Non-Conformité</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · clause 10.2</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color: 'var(--admin-text-muted)' }}>✕</button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField label="Type de NC">
                <select
                  value={form.ncType}
                  onChange={(e) => setForm((f) => ({ ...f, ncType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                >
                  <option value="">-- Sélectionner --</option>
                  {Object.entries(NC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </FormField>

              <FormField label="Propriétaire">
                <select
                  value={form.ownerType}
                  onChange={(e) => setForm((f) => ({ ...f, ownerType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="interne">Interne</option>
                  <option value="externe">Externe</option>
                </select>
              </FormField>

              {form.ncType === 'audit' && (
                <FormField label="Nom de l'auditeur">
                  <input
                    value={form.auditorName}
                    onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                    placeholder="Nom de l'auditeur"
                  />
                </FormField>
              )}

              <FormField label="Description de la non-conformité *">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Décrivez précisément la non-conformité observée…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                />
              </FormField>

              <FormField label="Analyse des causes (optionnel)">
                <textarea
                  value={form.rootCause}
                  onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))}
                  rows={2}
                  placeholder="Cause(s) racine identifiée(s)…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                />
              </FormField>

              <FormField label="Assigné à">
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                >
                  <option value="">— Non assigné —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FormField>

              <FormField label="Délai de traitement">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                />
              </FormField>

              {formError && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  Annuler
                </button>
                <button
                  onClick={() => void handleCreate()}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--admin-red)' }}
                >
                  {submitting ? 'Création…' : 'Créer la NC'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
