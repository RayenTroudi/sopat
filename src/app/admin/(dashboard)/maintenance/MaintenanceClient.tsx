'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Visit = {
  id: string
  visitDate: string
  visitedBy: string | null
  type: string
  status: string
  notes: string | null
  nextVisitDate: string | null
  project: { id: string; name: string; client: { name: string } }
}

type Project = { id: string; name: string }

const statusStyle: Record<string, { color: string; bg: string }> = {
  Planned:   { color: 'var(--admin-blue)',    bg: 'var(--admin-blue-dim)' },
  Completed: { color: 'var(--admin-emerald)', bg: 'var(--admin-emerald-dim)' },
  Cancelled: { color: 'var(--admin-red)',     bg: 'var(--admin-red-dim)' },
}

const typeLabel: Record<string, string> = {
  Scheduled: 'Planifiée',
  Emergency: 'Urgence',
  Warranty:  'Garantie',
}

export default function MaintenanceClient({ visits: initial, projects }: { visits: Visit[]; projects: Project[] }) {
  const [visits, setVisits] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)

  const upcoming = visits.filter(v => v.status === 'Planned' && new Date(v.visitDate) >= new Date())
  const next7days = upcoming.filter(v => new Date(v.visitDate) <= new Date(Date.now() + 7 * 86400000))

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        visitDate: fd.get('visitDate'),
        visitedBy: fd.get('visitedBy'),
        type: fd.get('type'),
        notes: fd.get('notes'),
        nextVisitDate: fd.get('nextVisitDate'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setVisits(prev => [{ ...data.data, project: { id: data.data.projectId, name: proj?.name ?? '', client: { name: '' } } }, ...prev])
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
            Étape 10
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Maintenance & Garantie
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Planifier une visite
        </button>
      </div>

      {next7days.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: '#84cc1615', border: '1px solid #84cc1630' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#84cc16' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs" style={{ color: '#84cc16', fontFamily: 'var(--font-sans)' }}>
            <strong>{next7days.length} visite{next7days.length > 1 ? 's' : ''}</strong> planifiée{next7days.length > 1 ? 's' : ''} dans les 7 prochains jours
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Visites planifiées', value: upcoming.length, color: 'var(--admin-blue)' },
          { label: 'Visites complétées', value: visits.filter(v => v.status === 'Completed').length, color: 'var(--admin-emerald)' },
          { label: 'Projets en maintenance', value: new Set(visits.map(v => v.project.id)).size, color: '#84cc16' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <Card>
        {visits.length === 0 ? <Empty message="Aucune visite de maintenance enregistrée" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Projet', 'Date visite', 'Type', 'Technicien', 'Prochaine visite', 'Statut'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 5 ? '1.25rem' : '1rem',
                        textAlign: i >= 4 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visits.map(v => {
                  const s = statusStyle[v.status]
                  return (
                    <tr key={v.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{v.project.name}</p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>{v.project.client.name}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(v.visitDate).toLocaleDateString('fr-TN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                          {typeLabel[v.type] ?? v.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{v.visitedBy ?? '—'}</td>
                      <td className="py-3.5 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {v.nextVisitDate ? new Date(v.nextVisitDate).toLocaleDateString('fr-TN') : '—'}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: s?.bg, color: s?.color }}>
                          {v.status === 'Planned' ? 'Planifiée' : v.status === 'Completed' ? 'Complétée' : 'Annulée'}
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
        <Modal title="Planifier une visite de maintenance" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Projet *">
              <select name="projectId" className={inputCls} required>
                <option value="">Sélectionner…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date de visite *">
                <input name="visitDate" type="date" className={inputCls} required />
              </Field>
              <Field label="Type">
                <select name="type" className={inputCls}>
                  <option value="Scheduled">Planifiée</option>
                  <option value="Emergency">Urgence</option>
                  <option value="Warranty">Garantie</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Technicien">
                <input name="visitedBy" className={inputCls} />
              </Field>
              <Field label="Prochaine visite">
                <input name="nextVisitDate" type="date" className={inputCls} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea name="notes" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Planifier la visite" />
          </form>
        </Modal>
      )}
    </div>
  )
}
