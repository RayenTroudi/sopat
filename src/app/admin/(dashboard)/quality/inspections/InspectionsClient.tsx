'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Inspection = {
  id: string
  title: string
  inspectionDate: string
  inspectorName: string | null
  type: string
  result: string
  notes: string | null
  project: { id: string; name: string }
  punchListItems: { id: string; status: string }[]
}

type Project = { id: string; name: string }

const resultStyle: Record<string, { color: string; bg: string }> = {
  Pending:         { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
  Passed:          { color: 'var(--admin-emerald)',     bg: 'var(--admin-emerald-dim)' },
  Failed:          { color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
  ConditionalPass: { color: 'var(--admin-amber)',       bg: 'var(--admin-amber-dim)' },
}

export default function InspectionsClient({ inspections: initial, projects }: { inspections: Inspection[]; projects: Project[] }) {
  const [inspections, setInspections] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        title: fd.get('title'),
        inspectionDate: fd.get('inspectionDate'),
        inspectorName: fd.get('inspectorName'),
        type: fd.get('type'),
        notes: fd.get('notes'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setInspections(prev => [{ ...data.data, project: { id: data.data.projectId, name: proj?.name ?? '' }, punchListItems: [] }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  const failed = inspections.filter(i => i.result === 'Failed').length
  const openPunch = inspections.reduce((s, i) => s + i.punchListItems.filter(p => p.status === 'Open').length, 0)

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Contrôle Qualité
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Inspections
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle inspection
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total inspections', value: inspections.length, color: 'var(--admin-text)' },
          { label: 'Échecs', value: failed, color: 'var(--admin-red)' },
          { label: 'Défauts ouverts', value: openPunch, color: 'var(--admin-amber)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <Card>
        {inspections.length === 0 ? <Empty message="Aucune inspection enregistrée" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Inspection', 'Projet', 'Type', 'Inspecteur', 'Date', 'Défauts', 'Résultat'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 6 ? '1.25rem' : '1rem',
                        textAlign: i >= 5 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspections.map(insp => {
                  const rs = resultStyle[insp.result]
                  const openItems = insp.punchListItems.filter(p => p.status === 'Open').length
                  return (
                    <tr key={insp.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{insp.title}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{insp.project.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                          style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                          {insp.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{insp.inspectorName ?? '—'}</td>
                      <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(insp.inspectionDate).toLocaleDateString('fr-TN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {openItems > 0 ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--admin-amber)' }}>{openItems}</span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>—</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: rs?.bg, color: rs?.color }}>
                          {insp.result === 'ConditionalPass' ? 'Pass conditionnel' : insp.result === 'Pending' ? 'En attente' : insp.result === 'Passed' ? 'Réussi' : 'Échoué'}
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
        <Modal title="Nouvelle inspection" onClose={() => setShowAdd(false)}>
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
                  <option value="routine">Routine</option>
                  <option value="final">Finale</option>
                  <option value="client">Client</option>
                  <option value="regulatory">Réglementaire</option>
                </select>
              </Field>
              <Field label="Date *">
                <input name="inspectionDate" type="date" className={inputCls} required
                  defaultValue={new Date().toISOString().split('T')[0]} />
              </Field>
            </div>
            <Field label="Inspecteur">
              <input name="inspectorName" className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Créer l'inspection" />
          </form>
        </Modal>
      )}
    </div>
  )
}
