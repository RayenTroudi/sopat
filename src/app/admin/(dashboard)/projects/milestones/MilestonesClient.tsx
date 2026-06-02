'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Milestone = {
  id: string
  title: string
  description: string | null
  dueDate: string
  completedAt: string | null
  status: string
  stageNumber: number | null
  project: { id: string; name: string; client: { name: string } }
}

type Project = { id: string; name: string }

const statusColor: Record<string, string> = {
  Pending: 'var(--admin-text-dim)',
  InProgress: 'var(--admin-blue)',
  Completed: 'var(--admin-emerald)',
  Delayed: 'var(--admin-red)',
}

export default function MilestonesClient({ milestones: initial, projects }: { milestones: Milestone[]; projects: Project[] }) {
  const [milestones, setMilestones] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'All' | 'Pending' | 'InProgress' | 'Completed' | 'Delayed'>('All')

  const now = new Date()
  const filtered = milestones.filter(m => {
    if (filter === 'All') return true
    if (filter === 'Delayed') return m.status === 'Pending' && new Date(m.dueDate) < now
    return m.status === filter
  })

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        title: fd.get('title'),
        dueDate: fd.get('dueDate'),
        description: fd.get('description'),
        stageNumber: fd.get('stageNumber'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setMilestones(prev => [{
        ...data.data,
        project: { id: data.data.projectId, name: proj?.name ?? '', client: { name: '' } },
      }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  const upcoming = milestones.filter(m => m.status !== 'Completed' && new Date(m.dueDate) > now &&
    new Date(m.dueDate) < new Date(now.getTime() + 7 * 86400000))

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Projets
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Jalons
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau jalon
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'var(--admin-amber-dim)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--admin-amber)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs" style={{ color: 'var(--admin-amber)', fontFamily: 'var(--font-sans)' }}>
            <strong>{upcoming.length} jalon{upcoming.length > 1 ? 's' : ''}</strong> dans les 7 prochains jours :
            {upcoming.map(m => ` "${m.title}"`).join(',')}
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Pending', 'InProgress', 'Completed', 'Delayed'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              fontFamily: 'var(--font-sans)',
              background: filter === s ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: filter === s ? '#0B1012' : 'var(--admin-text-muted)',
              border: `1px solid ${filter === s ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}>
            {s === 'InProgress' ? 'En cours' : s === 'Pending' ? 'À venir' : s === 'Completed' ? 'Terminés' : s === 'Delayed' ? 'En retard' : 'Tous'}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? <Empty message="Aucun jalon trouvé" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Jalon', 'Projet', 'Client', 'Échéance', 'Statut'].map((h, i) => (
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
                {filtered.map(m => {
                  const overdue = m.status !== 'Completed' && new Date(m.dueDate) < now
                  return (
                    <tr key={m.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{m.title}</p>
                        {m.stageNumber && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)' }}>Étape {m.stageNumber}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{m.project.name}</td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{m.project.client.name}</td>
                      <td className="py-3.5 px-4 text-right text-sm tabular-nums"
                        style={{ color: overdue ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                        {new Date(m.dueDate).toLocaleDateString('fr-TN')}
                        {overdue && ' ⚠'}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="text-xs font-medium" style={{ color: statusColor[m.status] ?? 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                          {m.status === 'InProgress' ? 'En cours' : m.status === 'Pending' ? 'À venir' : m.status === 'Completed' ? 'Terminé' : m.status}
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
        <Modal title="Nouveau jalon" onClose={() => setShowAdd(false)}>
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
              <Field label="Date limite *">
                <input name="dueDate" type="date" className={inputCls} required />
              </Field>
              <Field label="Étape (1-10)">
                <input name="stageNumber" type="number" min="1" max="10" className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea name="description" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Créer le jalon" />
          </form>
        </Modal>
      )}
    </div>
  )
}
