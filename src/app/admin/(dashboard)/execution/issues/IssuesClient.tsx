'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Issue = {
  id: string
  title: string
  description: string
  severity: string
  status: string
  reportedBy: string | null
  assignedTo: string | null
  resolvedAt: string | null
  createdAt: string
  project: { id: string; name: string }
}

type Project = { id: string; name: string }

const severityStyle: Record<string, { color: string; bg: string }> = {
  Low:      { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
  Medium:   { color: 'var(--admin-amber)',       bg: 'var(--admin-amber-dim)' },
  High:     { color: '#f97316',                  bg: 'rgba(249,115,22,0.1)' },
  Critical: { color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
}

const statusStyle: Record<string, string> = {
  Open:       'var(--admin-red)',
  InProgress: 'var(--admin-amber)',
  Resolved:   'var(--admin-emerald)',
  Closed:     'var(--admin-text-dim)',
}

export default function IssuesClient({ issues: initial, projects }: { issues: Issue[]; projects: Project[] }) {
  const [issues, setIssues] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Open')

  const filtered = statusFilter === 'All' ? issues : issues.filter(i => i.status === statusFilter)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        title: fd.get('title'),
        description: fd.get('description'),
        severity: fd.get('severity'),
        assignedTo: fd.get('assignedTo'),
        reportedBy: fd.get('reportedBy'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setIssues(prev => [{ ...data.data, project: { id: data.data.projectId, name: proj?.name ?? '' } }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  const criticalOpen = issues.filter(i => i.severity === 'Critical' && i.status === 'Open').length

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Exécution
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Problèmes
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Signaler un problème
        </button>
      </div>

      {criticalOpen > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'var(--admin-red-dim)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--admin-red)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs font-medium" style={{ color: 'var(--admin-red)', fontFamily: 'var(--font-sans)' }}>
            {criticalOpen} problème{criticalOpen > 1 ? 's' : ''} critique{criticalOpen > 1 ? 's' : ''} en attente de résolution
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['Open', 'InProgress', 'Resolved', 'All'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              fontFamily: 'var(--font-sans)',
              background: statusFilter === s ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: statusFilter === s ? '#0B1012' : 'var(--admin-text-muted)',
              border: `1px solid ${statusFilter === s ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}>
            {s === 'Open' ? 'Ouverts' : s === 'InProgress' ? 'En cours' : s === 'Resolved' ? 'Résolus' : 'Tous'}
            {' '}({issues.filter(i => s === 'All' ? true : i.status === s).length})
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? <Empty message="Aucun problème trouvé" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Problème', 'Projet', 'Assigné à', 'Sévérité', 'Statut'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 4 ? '1.25rem' : '1rem',
                        textAlign: i >= 3 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(issue => {
                  const sev = severityStyle[issue.severity]
                  return (
                    <tr key={issue.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{issue.title}</p>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--admin-text-dim)' }}>{issue.description}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{issue.project.name}</td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{issue.assignedTo ?? '—'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: sev?.bg, color: sev?.color }}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="text-xs font-medium" style={{ color: statusStyle[issue.status] ?? 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                          {issue.status === 'InProgress' ? 'En cours' : issue.status === 'Resolved' ? 'Résolu' : issue.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAdd && (
        <Modal title="Signaler un problème" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Projet *">
              <select name="projectId" className={inputCls} required>
                <option value="">Sélectionner…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Titre *">
              <input name="title" className={inputCls} required />
            </Field>
            <Field label="Description *">
              <textarea name="description" className={inputCls} rows={4} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sévérité">
                <select name="severity" className={inputCls}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </Field>
              <Field label="Assigné à">
                <input name="assignedTo" className={inputCls} />
              </Field>
            </div>
            <Field label="Signalé par">
              <input name="reportedBy" className={inputCls} />
            </Field>
            <SubmitBtn loading={loading} label="Signaler le problème" />
          </form>
        </Modal>
      )}
    </div>
  )
}
