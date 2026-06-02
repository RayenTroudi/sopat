'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Task = {
  id: string
  title: string
  description: string | null
  assignedTo: string | null
  priority: string
  status: string
  dueDate: string | null
  completedAt: string | null
  stageNumber: number | null
  project: { id: string; name: string }
}

type Project = { id: string; name: string }

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Todo', 'InProgress', 'Review', 'Done', 'Cancelled']

const priorityColor: Record<string, string> = {
  Low: 'var(--admin-text-dim)',
  Medium: 'var(--admin-blue)',
  High: 'var(--admin-amber)',
  Critical: 'var(--admin-red)',
}

const statusLabel: Record<string, string> = {
  Todo: 'À faire',
  InProgress: 'En cours',
  Review: 'En révision',
  Done: 'Terminé',
  Cancelled: 'Annulé',
}

export default function TasksClient({ tasks: initial, projects }: { tasks: Task[]; projects: Project[] }) {
  const [tasks, setTasks] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false
    return true
  })

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        title: fd.get('title'),
        description: fd.get('description'),
        assignedTo: fd.get('assignedTo'),
        priority: fd.get('priority'),
        dueDate: fd.get('dueDate'),
        stageNumber: fd.get('stageNumber'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setTasks(prev => [{ ...data.data, project: { id: data.data.projectId, name: proj?.name ?? '' } }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  const pending = tasks.filter(t => t.status === 'Todo').length
  const inProgress = tasks.filter(t => t.status === 'InProgress').length
  const critical = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Done').length

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Projets
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Tâches
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle tâche
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'À faire', value: pending, color: 'var(--admin-text-muted)' },
          { label: 'En cours', value: inProgress, color: 'var(--admin-blue)' },
          { label: 'Critiques', value: critical, color: 'var(--admin-red)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                fontFamily: 'var(--font-sans)',
                background: statusFilter === s ? 'var(--admin-accent)' : 'var(--admin-card)',
                color: statusFilter === s ? '#0B1012' : 'var(--admin-text-muted)',
                border: `1px solid ${statusFilter === s ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}>
              {statusLabel[s] ?? 'Tous'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...PRIORITIES].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                fontFamily: 'var(--font-sans)',
                background: priorityFilter === p ? 'var(--admin-border)' : 'transparent',
                color: priorityColor[p] ?? 'var(--admin-text-muted)',
                border: `1px solid var(--admin-border)`,
              }}>
              {p === 'All' ? 'Toutes priorités' : p}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? <Empty message="Aucune tâche trouvée" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Tâche', 'Projet', 'Assigné à', 'Priorité', 'Échéance', 'Statut'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 5 ? '1.25rem' : '1rem',
                        textAlign: i >= 3 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="py-3.5 pl-5 pr-4">
                      <p className="font-medium text-sm" style={{ color: task.status === 'Done' ? 'var(--admin-text-dim)' : 'var(--admin-text)', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</p>
                      {task.stageNumber && <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>Étape {task.stageNumber}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{task.project.name}</td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{task.assignedTo ?? '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-xs font-medium" style={{ color: priorityColor[task.priority], fontFamily: 'var(--font-sans)' }}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-TN') : '—'}
                    </td>
                    <td className="py-3.5 pl-4 pr-5 text-right">
                      <span className="text-xs" style={{ color: statusLabel[task.status] ? 'var(--admin-text-muted)' : 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                        {statusLabel[task.status] ?? task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAdd && (
        <Modal title="Nouvelle tâche" onClose={() => setShowAdd(false)}>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priorité">
                <select name="priority" className={inputCls}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Étape (1-10)">
                <input name="stageNumber" type="number" min="1" max="10" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigné à">
                <input name="assignedTo" className={inputCls} />
              </Field>
              <Field label="Date limite">
                <input name="dueDate" type="date" className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea name="description" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Créer la tâche" />
          </form>
        </Modal>
      )}
    </div>
  )
}
