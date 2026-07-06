'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DailyLogRow } from '@/lib/db/realisation'

type Props = {
  projectId: string
  canEdit: boolean
}

type LogForm = {
  logDate: string
  dayNumber: string
  totalProgress: string
  worksDoneToday: string
  supplies: string
  anomalies: string
  otherIntervenants: string
  remarks: string
  nextDayAgenda: string
  chefProjet: string
}

const EMPTY_FORM: LogForm = {
  logDate: '',
  dayNumber: '',
  totalProgress: '',
  worksDoneToday: '',
  supplies: '',
  anomalies: '',
  otherIntervenants: '',
  remarks: '',
  nextDayAgenda: '',
  chefProjet: '',
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function JournalChantierSection({ projectId, canEdit }: Props) {
  const [logs, setLogs] = useState<DailyLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LogForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/daily-logs`)
      if (res.ok) setLogs(await res.json() as DailyLogRow[])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadLogs() }, [loadLogs])

  function openNew() {
    setForm({ ...EMPTY_FORM, logDate: new Date().toISOString().slice(0, 10), dayNumber: String(logs.length + 1) })
    setEditingId(null)
    setDrawerOpen(true)
    setError('')
  }

  function openEdit(log: DailyLogRow) {
    setForm({
      logDate: log.logDate,
      dayNumber: log.dayNumber ? String(log.dayNumber) : '',
      totalProgress: log.totalProgress ? String(log.totalProgress) : '',
      worksDoneToday: log.worksDoneToday ?? '',
      supplies: log.supplies ?? '',
      anomalies: log.anomalies ?? '',
      otherIntervenants: log.otherIntervenants ?? '',
      remarks: log.remarks ?? '',
      nextDayAgenda: log.nextDayAgenda ?? '',
      chefProjet: log.chefProjet ?? '',
    })
    setEditingId(log.id)
    setDrawerOpen(true)
    setError('')
  }

  async function handleSave() {
    if (!form.logDate) { setError('La date est obligatoire'); return }
    setSaving(true)
    setError('')
    const body = {
      logDate: form.logDate,
      dayNumber: form.dayNumber ? parseInt(form.dayNumber) : undefined,
      totalProgress: form.totalProgress ? parseFloat(form.totalProgress) : undefined,
      worksDoneToday: form.worksDoneToday || undefined,
      supplies: form.supplies || undefined,
      anomalies: form.anomalies || undefined,
      otherIntervenants: form.otherIntervenants || undefined,
      remarks: form.remarks || undefined,
      nextDayAgenda: form.nextDayAgenda || undefined,
      chefProjet: form.chefProjet || undefined,
    }
    try {
      const url = editingId
        ? `/api/projects/${projectId}/daily-logs/${editingId}`
        : `/api/projects/${projectId}/daily-logs`
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur serveur'); return }
      await loadLogs()
      setDrawerOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(logId: string) {
    if (!confirm('Supprimer ce journal ?')) return
    setDeletingId(logId)
    try {
      const res = await fetch(`/api/projects/${projectId}/daily-logs/${logId}`, { method: 'DELETE' })
      if (res.ok) setLogs((prev) => prev.filter((l) => l.id !== logId))
    } finally {
      setDeletingId(null)
    }
  }

  const avgProgress = logs.length > 0
    ? logs.filter((l) => l.totalProgress).reduce((s, l) => s + parseFloat(l.totalProgress!), 0) / logs.filter((l) => l.totalProgress).length
    : 0
  const latestProgress = logs.find((l) => l.totalProgress)?.totalProgress

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Journal de Chantier</h3>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              FOR-RE-04 — {logs.length} entrée{logs.length !== 1 ? 's' : ''}
              {latestProgress && ` · Avancement : ${parseFloat(latestProgress).toFixed(0)}%`}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau journal
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Progress bar */}
          {logs.some((l) => l.totalProgress) && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                <span>Avancement chantier</span>
                <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{parseFloat(latestProgress ?? '0').toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--admin-border)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(parseFloat(latestProgress ?? '0'), 100)}%`, background: 'var(--admin-emerald)' }}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-6 flex justify-center">
              <span className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun journal de chantier.{canEdit && <> <button type="button" onClick={openNew} className="underline" style={{ color: 'var(--admin-accent)' }}>Créer le premier</button></>}
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--admin-bg)] transition-colors"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}>
                        J{log.dayNumber ?? '?'}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{fmtDate(log.logDate)}</span>
                      {log.totalProgress && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                          {parseFloat(log.totalProgress).toFixed(0)}%
                        </span>
                      )}
                      {log.anomalies && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                          Anomalie
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{log.createdByName ?? '—'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-text-muted)', transform: expandedId === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {expandedId === log.id && (
                    <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
                      <div className="grid grid-cols-1 gap-3 text-xs">
                        {log.worksDoneToday && (
                          <Field label="Travaux du jour" value={log.worksDoneToday} />
                        )}
                        {log.supplies && (
                          <Field label="Approvisionnement" value={log.supplies} />
                        )}
                        {log.anomalies && (
                          <Field label="Anomalie / Réclamation" value={log.anomalies} highlight />
                        )}
                        {log.remarks && (
                          <Field label="Remarques (RMQ)" value={log.remarks} />
                        )}
                        {log.nextDayAgenda && (
                          <Field label="Ordre du jour (lendemain)" value={log.nextDayAgenda} />
                        )}
                        {log.otherIntervenants && (
                          <Field label="Autres intervenants" value={log.otherIntervenants} />
                        )}
                        {log.chefProjet && (
                          <Field label="Chef de projet" value={log.chefProjet} />
                        )}
                        {log.participants && Array.isArray(log.participants) && log.participants.length > 0 && (
                          <div>
                            <p className="font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Participants</p>
                            <div className="flex flex-wrap gap-1">
                              {(log.participants as { name: string; role: string }[]).map((p, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                                  {p.name} · {p.role}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => openEdit(log)} className="text-xs underline" style={{ color: 'var(--admin-text-muted)' }}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(log.id)}
                            disabled={deletingId === log.id}
                            className="text-xs underline disabled:opacity-50"
                            style={{ color: 'var(--admin-red)' }}
                          >
                            {deletingId === log.id ? 'Suppression…' : 'Supprimer'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-in drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-lg flex flex-col shadow-2xl" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                {editingId ? 'Modifier le journal' : 'Nouveau journal de chantier'}
              </h2>
              <button type="button" onClick={() => setDrawerOpen(false)} style={{ color: 'var(--admin-text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Date *</label>
                  <input type="date" value={form.logDate} onChange={(e) => setForm((f) => ({ ...f, logDate: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Jour N°</label>
                  <input type="number" min="1" value={form.dayNumber} onChange={(e) => setForm((f) => ({ ...f, dayNumber: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Avancement (%)</label>
                  <input type="number" min="0" max="100" value={form.totalProgress} onChange={(e) => setForm((f) => ({ ...f, totalProgress: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Chef de projet</label>
                <input value={form.chefProjet} onChange={(e) => setForm((f) => ({ ...f, chefProjet: e.target.value }))}
                  placeholder="Mr …"
                  className="w-full px-2 py-1.5 rounded border text-xs" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }} />
              </div>

              <TextArea label="Travaux du jour / Retard" value={form.worksDoneToday} onChange={(v) => setForm((f) => ({ ...f, worksDoneToday: v }))} rows={3} />
              <TextArea label="Approvisionnement" value={form.supplies} onChange={(v) => setForm((f) => ({ ...f, supplies: v }))} rows={2} />
              <TextArea label="Anomalie / Réclamation" value={form.anomalies} onChange={(v) => setForm((f) => ({ ...f, anomalies: v }))} rows={2} />
              <TextArea label="Autres intervenants" value={form.otherIntervenants} onChange={(v) => setForm((f) => ({ ...f, otherIntervenants: v }))} rows={2} />
              <TextArea label="Remarques (RMQ)" value={form.remarks} onChange={(v) => setForm((f) => ({ ...f, remarks: v }))} rows={2} />
              <TextArea label="Ordre du jour (lendemain)" value={form.nextDayAgenda} onChange={(v) => setForm((f) => ({ ...f, nextDayAgenda: v }))} rows={2} />

              {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}
            </div>

            <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--admin-border)' }}>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--admin-emerald)' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="font-medium mb-0.5" style={{ color: highlight ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>{label}</p>
      <p className="whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-2 py-1.5 rounded border text-xs resize-none"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
      />
    </div>
  )
}
