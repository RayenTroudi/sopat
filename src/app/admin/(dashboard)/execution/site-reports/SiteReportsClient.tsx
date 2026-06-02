'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Report = {
  id: string
  type: string
  reportDate: string
  reportedBy: string | null
  weather: string | null
  workersOnSite: number | null
  workDone: string
  issues: string | null
  nextDayPlan: string | null
  project: { id: string; name: string }
}

type Project = { id: string; name: string }

export default function SiteReportsClient({ reports: initial, projects }: { reports: Report[]; projects: Project[] }) {
  const [reports, setReports] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All')

  const filtered = typeFilter === 'All' ? reports : reports.filter(r => r.type === typeFilter)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/site-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: fd.get('projectId'),
        type: fd.get('type'),
        reportDate: fd.get('reportDate'),
        reportedBy: fd.get('reportedBy'),
        weather: fd.get('weather'),
        workersOnSite: fd.get('workersOnSite'),
        workDone: fd.get('workDone'),
        issues: fd.get('issues'),
        nextDayPlan: fd.get('nextDayPlan'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      const proj = projects.find(p => p.id === data.data.projectId)
      setReports(prev => [{ ...data.data, project: { id: data.data.projectId, name: proj?.name ?? '' } }, ...prev])
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
            Exécution
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Rapports de chantier
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rapport
        </button>
      </div>

      <div className="flex gap-2">
        {['All', 'daily', 'weekly'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className="px-3 py-1 rounded-full text-xs font-medium capitalize"
            style={{
              fontFamily: 'var(--font-sans)',
              background: typeFilter === t ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: typeFilter === t ? '#0B1012' : 'var(--admin-text-muted)',
              border: `1px solid ${typeFilter === t ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}>
            {t === 'All' ? 'Tous' : t === 'daily' ? 'Quotidiens' : 'Hebdomadaires'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card><Empty message="Aucun rapport de chantier" /></Card>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded capitalize"
                      style={{ background: r.type === 'daily' ? 'var(--admin-blue-dim)' : 'var(--admin-accent-dim)', color: r.type === 'daily' ? 'var(--admin-blue)' : 'var(--admin-accent)', fontFamily: 'var(--font-sans)' }}>
                      {r.type === 'daily' ? 'Quotidien' : 'Hebdomadaire'}
                    </span>
                    <span className="font-medium text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
                      {new Date(r.reportDate).toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                    {r.project.name}
                    {r.reportedBy && ` · Par ${r.reportedBy}`}
                    {r.weather && ` · ${r.weather}`}
                    {r.workersOnSite !== null && ` · ${r.workersOnSite} ouvriers`}
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1"
                    style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                    Travaux effectués
                  </p>
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{r.workDone}</p>
                </div>
                {r.issues && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1"
                      style={{ color: 'var(--admin-red)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                      Problèmes
                    </p>
                    <p className="text-sm" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{r.issues}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <Modal title="Nouveau rapport de chantier" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Projet *">
              <select name="projectId" className={inputCls} required>
                <option value="">Sélectionner…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type *">
                <select name="type" className={inputCls} required>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </Field>
              <Field label="Date *">
                <input name="reportDate" type="date" className={inputCls} required
                  defaultValue={new Date().toISOString().split('T')[0]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rapporteur">
                <input name="reportedBy" className={inputCls} />
              </Field>
              <Field label="Météo">
                <input name="weather" className={inputCls} placeholder="Ensoleillé, nuageux…" />
              </Field>
            </div>
            <Field label="Ouvriers sur site">
              <input name="workersOnSite" type="number" className={inputCls} />
            </Field>
            <Field label="Travaux effectués *">
              <textarea name="workDone" className={inputCls} rows={4} required />
            </Field>
            <Field label="Problèmes rencontrés">
              <textarea name="issues" className={inputCls} rows={3} />
            </Field>
            <Field label="Plan pour le lendemain">
              <textarea name="nextDayPlan" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Enregistrer le rapport" />
          </form>
        </Modal>
      )}
    </div>
  )
}
