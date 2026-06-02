'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Deliverable = {
  id: string
  title: string
  type: string
  description: string | null
  status: string
  dueDate: string | null
  submittedAt: string | null
  approvedAt: string | null
  stageNumber: number | null
  project: { id: string; name: string; client: { name: string } }
}

type Project = { id: string; name: string }

const TYPES = ['drawing', 'report', 'model', 'specification', 'permit', 'photo', 'other']
const STATUSES = ['Pending', 'InProgress', 'Review', 'Approved', 'Rejected']

const statusStyle: Record<string, { color: string; bg: string }> = {
  Pending:    { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
  InProgress: { color: 'var(--admin-blue)',        bg: 'var(--admin-blue-dim)' },
  Review:     { color: 'var(--admin-amber)',       bg: 'var(--admin-amber-dim)' },
  Approved:   { color: 'var(--admin-emerald)',     bg: 'var(--admin-emerald-dim)' },
  Rejected:   { color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
}

export default function DeliverablesClient({ deliverables: initial, projects }: { deliverables: Deliverable[]; projects: Project[] }) {
  const [deliverables, setDeliverables] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('All')

  const filtered = filter === 'All' ? deliverables : deliverables.filter(d => d.status === filter)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        title: fd.get('title'),
        type: fd.get('type'),
        description: fd.get('description'),
        dueDate: fd.get('dueDate'),
        stageNumber: fd.get('stageNumber'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setDeliverables(prev => [{
        ...data.data,
        project: { id: data.data.projectId, name: proj?.name ?? '', client: { name: '' } },
      }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Projets
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Livrables
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau livrable
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', ...STATUSES].map(s => {
          const st = statusStyle[s]
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                fontFamily: 'var(--font-sans)',
                background: filter === s ? (st?.bg ?? 'var(--admin-accent)') : 'var(--admin-card)',
                color: filter === s ? (st?.color ?? '#0B1012') : 'var(--admin-text-muted)',
                border: `1px solid var(--admin-border)`,
              }}>
              {s === 'All' ? 'Tous' : s}
            </button>
          )
        })}
      </div>

      <Card>
        {filtered.length === 0 ? <Empty message="Aucun livrable trouvé" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Livrable', 'Type', 'Projet', 'Échéance', 'Statut'].map((h, i) => (
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
                {filtered.map(d => {
                  const s = statusStyle[d.status]
                  return (
                    <tr key={d.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{d.title}</p>
                        {d.stageNumber && <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>Étape {d.stageNumber}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                          style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                          {d.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{d.project.name}</td>
                      <td className="py-3.5 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {d.dueDate ? new Date(d.dueDate).toLocaleDateString('fr-TN') : '—'}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: s?.bg ?? 'var(--admin-border)', color: s?.color ?? 'var(--admin-text-muted)' }}>
                          {d.status}
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
        <Modal title="Nouveau livrable" onClose={() => setShowAdd(false)}>
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
              <Field label="Type *">
                <select name="type" className={inputCls} required>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Étape (1-10)">
                <input name="stageNumber" type="number" min="1" max="10" className={inputCls} />
              </Field>
            </div>
            <Field label="Date limite">
              <input name="dueDate" type="date" className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea name="description" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Créer le livrable" />
          </form>
        </Modal>
      )}
    </div>
  )
}
