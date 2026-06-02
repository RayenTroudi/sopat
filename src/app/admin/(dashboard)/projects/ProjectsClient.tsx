'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'
import { STAGES, SHORT_STAGE_NAMES } from '@/lib/stages'
import AddProjectModal from '@/components/admin/AddProjectModal'

interface Row {
  id: string
  name: string
  client: { id: string; name: string }
  status: string
  currency: string
  stage: number
  totalBudget: number
  totalCosts: number
  revenue: number
  netProfit: number
  margin: number
}

const marginStyle = (pct: number) => ({
  color: pct > 20 ? 'var(--admin-emerald)' : pct >= 5 ? 'var(--admin-amber)' : 'var(--admin-red)',
  fontFamily: 'var(--font-sans)',
})

function StageBadge({ stage }: { stage: number }) {
  const color = STAGES[stage]?.color ?? '#6b7280'
  const name = SHORT_STAGE_NAMES[stage] ?? `Étape ${stage}`
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: color + '20', color, fontFamily: 'var(--font-sans)' }}>
      {name}
    </span>
  )
}

const STAGE_TABS = [
  { key: 'all', label: 'Tous', stage: 0 },
  { key: '1', label: 'Consultation', stage: 1 },
  { key: '2', label: 'Études', stage: 2 },
  { key: '3', label: 'Réalisation', stage: 3 },
  { key: '4', label: 'Entretien', stage: 4 },
]

export default function ProjectsClient({
  rows,
  clients,
}: {
  rows: Row[]
  clients: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length }
    for (const r of rows) {
      counts[String(r.stage)] = (counts[String(r.stage)] ?? 0) + 1
    }
    return counts
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.client.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      const matchStage = stageFilter === 'all' || String(r.stage) === stageFilter
      return matchSearch && matchStatus && matchStage
    })
  }, [rows, search, statusFilter, stageFilter])

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
    setDeleting(null)
    setConfirmId(null)
    router.refresh()
  }

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            SOPAT Finance
          </p>
          <h1 className="text-3xl font-semibold"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Projets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {rows.length} projet{rows.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-all duration-150"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau projet
        </button>
      </div>

      {/* Stage filter tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 0 }}>
        {STAGE_TABS.map(t => {
          const count = stageCounts[t.key] ?? 0
          const stageColor = t.stage > 0 ? STAGES[t.stage]?.color : undefined
          const isActive = stageFilter === t.key
          return (
            <button key={t.key}
              onClick={() => setStageFilter(t.key)}
              className="px-3 py-2.5 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5"
              style={{
                borderBottomColor: isActive ? (stageColor ?? 'var(--admin-accent)') : 'transparent',
                color: isActive ? (stageColor ?? 'var(--admin-accent)') : 'var(--admin-text-muted)',
                fontFamily: 'var(--font-sans)',
                fontWeight: isActive ? 600 : 400,
              }}>
              {t.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? (stageColor ?? 'var(--admin-accent)') + '20' : 'var(--admin-border)',
                  color: isActive ? (stageColor ?? 'var(--admin-accent)') : 'var(--admin-text-dim)',
                  fontFamily: 'var(--font-sans)',
                }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Status + Search filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: 'var(--admin-text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="admin-input pl-9" style={{ width: 260 }}
            placeholder="Rechercher par nom ou client…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { key: 'All', label: 'Tous' },
            { key: 'Active', label: 'Actif' },
            { key: 'Pending', label: 'En attente' },
            { key: 'Closed', label: 'Clôturé' },
          ].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                fontFamily: 'var(--font-sans)',
                background: statusFilter === s.key ? 'var(--admin-accent-dim)' : 'var(--admin-card)',
                color: statusFilter === s.key ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                border: `1px solid ${statusFilter === s.key ? 'rgba(201,168,76,0.2)' : 'var(--admin-border)'}`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <div className="overflow-x-auto admin-scroll">
          <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {[
                  { label: 'Projet', align: 'left' },
                  { label: 'Client', align: 'left' },
                  { label: 'Étape', align: 'left' },
                  { label: 'Statut', align: 'left' },
                  { label: 'Budget', align: 'right' },
                  { label: 'Coûts réels', align: 'right' },
                  { label: 'Revenu', align: 'right' },
                  { label: 'Profit net', align: 'right' },
                  { label: 'Marge', align: 'right' },
                  { label: '', align: 'right' },
                ].map((h, i) => (
                  <th key={i} className="py-3 text-xs uppercase tracking-widest font-medium"
                    style={{
                      color: 'var(--admin-text-dim)',
                      paddingLeft: i === 0 ? '1.25rem' : '1rem',
                      paddingRight: i === 9 ? '1.25rem' : '1rem',
                      textAlign: h.align as 'left' | 'right',
                      letterSpacing: '0.08em',
                    }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-dim)' }}>
                    Aucun projet trouvé
                  </td>
                </tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="transition-colors duration-100"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--admin-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-3.5 pl-5 pr-4">
                    <Link href={`/admin/projects/${r.id}`}
                      className="font-medium text-sm transition-colors"
                      style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-sans)' }}>
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {r.client.name}
                  </td>
                  <td className="py-3.5 px-4">
                    <StageBadge stage={r.stage} />
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={r.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(r.totalBudget)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums">
                    <span style={{ color: r.totalBudget > 0 && r.totalCosts / r.totalBudget > 1 ? 'var(--admin-red)' : 'var(--admin-text)' }}>
                      {tnd(r.totalCosts)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(r.revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums font-medium"
                    style={{ color: r.netProfit < 0 ? 'var(--admin-red)' : 'var(--admin-text)' }}>
                    {tnd(r.netProfit)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-sm font-bold" style={marginStyle(r.margin)}>
                      {r.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <button onClick={() => setConfirmId(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                      style={{ color: 'var(--admin-text-dim)', background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--admin-red)'; (e.currentTarget as HTMLElement).style.background = 'var(--admin-red-dim)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-dim)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      title="Supprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddProjectModal clients={clients} onClose={() => setShowModal(false)} onSuccess={() => router.refresh()} />
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setConfirmId(null)} />
          <div className="relative rounded-xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--admin-red-dim)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--admin-red)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
              Supprimer le projet ?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Cette action est irréversible. Toutes les données associées seront supprimées.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmId)} disabled={deleting === confirmId}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: 'var(--admin-red)', color: '#fff', fontFamily: 'var(--font-sans)' }}>
                {deleting === confirmId ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
