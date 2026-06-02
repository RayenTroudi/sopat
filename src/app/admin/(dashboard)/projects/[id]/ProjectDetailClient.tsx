'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge, ProgressBar, marginColor } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'
import { STAGES, SHORT_STAGE_NAMES } from '@/lib/stages'
import AddBudgetItemModal from '@/components/admin/AddBudgetItemModal'
import AddCostModal from '@/components/admin/AddCostModal'
import LogTimeModal from '@/components/admin/LogTimeModal'
import CreateInvoiceModal from '@/components/admin/CreateInvoiceModal'
import AddPaymentModal from '@/components/admin/AddPaymentModal'

type Project = {
  id: string
  name: string
  status: string
  stage: number
  stageUpdatedAt: Date | null
  stageNotes: string | null
  priority: string
  description: string | null
  location: string | null
  currency: string
  startDate: Date
  endDate: Date | null
  estimatedEndDate: Date | null
  createdAt: Date
  client: { id: string; name: string; type: string }
  contracts: Array<{ id: string; contractType: string; totalValue: number; startDate: Date; endDate: Date | null }>
  budgetItems: Array<{ id: string; category: string; plannedAmount: number }>
  costItems: Array<{ id: string; date: Date; description: string; amount: number; category: string; currency: string; glAccount: string | null }>
  timeEntries: Array<{ id: string; date: Date; employeeId: string; hours: number; hourlyRate: number; amount: number; description: string | null }>
  invoices: Array<{ id: string; date: Date; amount: number; vatRate: number; vatAmount: number; totalAmount: number; status: string; dueDate: Date | null; currency: string; payments: Array<{ id: string; date: Date; amount: number; method: string }> }>
  overheadAllocs: Array<{ id: string; allocationMethod: string; rate: number; amount: number }>
  milestones: Array<{ id: string; title: string; dueDate: Date; status: string; stageNumber: number | null }>
  tasks: Array<{ id: string; title: string; assignedTo: string | null; priority: string; status: string; dueDate: Date | null }>
  deliverables: Array<{ id: string; title: string; type: string; status: string; dueDate: Date | null }>
  documents: Array<{ id: string; title: string; category: string; version: string; createdAt: Date }>
  activityLogs: Array<{ id: string; entityType: string; action: string; description: string; performedBy: string | null; createdAt: Date }>
}

type Pnl = {
  totalBudget: number
  totalDirectCosts: number
  overheadAllocated: number
  totalRevenue: number
  grossProfit: number
  netProfit: number
  budgetVariance: number
  marginPercent: number
} | null

const TABS = ['Aperçu', 'Jalons', 'Tâches', 'Documents', 'Budget', 'Coûts', 'Factures', 'P&L', 'Activité']

export default function ProjectDetailClient({ project: p, pnl }: { project: Project; pnl: Pnl }) {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [modal, setModal] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; totalAmount: number } | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [advanceNotes, setAdvanceNotes] = useState('')
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)

  const budgetTotal = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
  const costsTotal = p.costItems.reduce((s, c) => s + c.amount, 0) +
    p.timeEntries.reduce((s, t) => s + t.amount, 0)
  const budgetPct = budgetTotal > 0 ? (costsTotal / budgetTotal) * 100 : 0

  const categories = ['Labor', 'Materials', 'Equipment', 'Subcontractors', 'Overhead']
  const categoryLabels: Record<string, string> = {
    Labor: "Main-d'œuvre",
    Materials: 'Matériaux',
    Equipment: 'Équipement',
    Subcontractors: 'Sous-traitants',
    Overhead: 'Charges indirectes',
  }

  function refresh() { router.refresh() }
  function closeModal() { setModal(null); setSelectedInvoice(null) }

  async function handleAdvance() {
    setAdvancing(true)
    await fetch(`/api/admin/projects/${p.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: advanceNotes || undefined }),
    })
    setAdvancing(false)
    setShowAdvanceModal(false)
    setAdvanceNotes('')
    refresh()
  }

  const stageEnteredAt = p.stageUpdatedAt ?? p.createdAt

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-sans mb-1.5">
            <Link href="/admin/projects" className="transition" style={{ color: 'var(--admin-text-muted)' }}>
              Projets
            </Link>
            <span style={{ color: 'var(--admin-text-dim)' }}>/</span>
            <span style={{ color: 'var(--admin-text)' }}>{p.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-3xl" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
              {p.name}
            </h1>
            <Badge status={p.status} />
          </div>
          <p className="text-sm mt-0.5 font-sans" style={{ color: 'var(--admin-text-muted)' }}>
            {p.client.name} · {p.client.type}
          </p>
        </div>
      </div>

      {/* 4-Stage Progress Bar */}
      <div className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-0 relative">
          {[1, 2, 3, 4].map((n, idx) => {
            const isCompleted = n < p.stage
            const isCurrent = n === p.stage
            const isFuture = n > p.stage
            const color = STAGES[n].color

            return (
              <div key={n} className="flex items-center flex-1">
                {/* Step circle + label */}
                <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
                  {/* Circle */}
                  <div className="relative flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isCompleted ? color : isCurrent ? color : 'var(--admin-border)',
                      border: isCurrent ? `2px solid ${color}` : isCompleted ? 'none' : '2px solid var(--admin-border)',
                      boxShadow: isCurrent ? `0 0 0 4px ${color}30` : 'none',
                      flexShrink: 0,
                    }}>
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="#fff" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold"
                        style={{ color: isCurrent ? '#fff' : 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                        {n}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <p className="text-xs mt-1.5 text-center font-medium"
                    style={{
                      color: isCurrent ? color : isCompleted ? 'var(--admin-text-muted)' : 'var(--admin-text-dim)',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: isCurrent ? 700 : 400,
                      maxWidth: 80,
                    }}>
                    {SHORT_STAGE_NAMES[n]}
                  </p>

                  {/* Status below label */}
                  {isCurrent && (
                    <span className="text-xs mt-0.5 px-1.5 py-0.5 rounded-full"
                      style={{ background: color + '20', color, fontFamily: 'var(--font-sans)', fontSize: '0.6rem' }}>
                      En cours
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', fontSize: '0.6rem' }}>
                      ✓ Terminé
                    </span>
                  )}
                  {isCurrent && p.stageNotes && (
                    <p className="text-xs mt-0.5 italic text-center" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', fontSize: '0.6rem', maxWidth: 80 }}>
                      {p.stageNotes}
                    </p>
                  )}
                </div>

                {/* Connector line */}
                {idx < 3 && (
                  <div className="flex-1 h-0.5 mx-1 rounded-full"
                    style={{ background: n < p.stage ? STAGES[n].color : 'var(--admin-border)', minWidth: 16 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Advance button */}
        {p.stage < 4 && (
          <div className="mt-5 flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid var(--admin-border)' }}>
            <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              En cours depuis le {new Date(stageEnteredAt).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => setShowAdvanceModal(true)}
              className="text-xs px-4 py-2 rounded-lg font-semibold"
              style={{ background: STAGES[p.stage + 1]?.color ?? 'var(--admin-accent)', color: '#fff', fontFamily: 'var(--font-sans)' }}>
              Avancer à {STAGES[p.stage + 1]?.name} →
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="px-4 py-2.5 text-sm font-sans transition border-b-2 -mb-px"
            style={{
              borderBottomColor: tab === i ? 'var(--admin-accent)' : 'transparent',
              color: tab === i ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
              fontWeight: tab === i ? 600 : 400,
              fontFamily: 'var(--font-sans)',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <InfoCard label="Client" value={p.client.name} />
            <InfoCard label="Statut" value={<Badge status={p.status} />} />
            <InfoCard label="Étape actuelle" value={`${STAGES[p.stage]?.name ?? p.stage}`} />
            <InfoCard label="Date début" value={new Date(p.startDate).toLocaleDateString('fr-FR')} />
            <InfoCard label="Date fin" value={p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—'} />
          </div>

          {/* P&L summary */}
          {pnl && (
            <div className="admin-card-shine rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-accent-dim)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                  Résumé P&amp;L
                </h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderColor: 'var(--admin-border)' }}>
                <PnlCell label="Revenus" value={tnd(pnl.totalRevenue)} />
                <PnlCell label="Coûts directs" value={tnd(pnl.totalDirectCosts)} neg={pnl.totalDirectCosts > 0} />
                <PnlCell label="Profit net" value={tnd(pnl.netProfit)} neg={pnl.netProfit < 0} />
                <PnlCell label="Marge" value={`${pnl.marginPercent.toFixed(1)}%`} colorStyle={{ color: marginColor(pnl.marginPercent) }} />
              </div>
            </div>
          )}

          {/* Budget progress */}
          <div className="admin-card-shine rounded-xl p-5 space-y-3"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <div className="flex justify-between text-sm font-sans">
              <span style={{ color: 'var(--admin-text-muted)' }}>Utilisation du budget</span>
              <span className="font-semibold"
                style={{
                  color: budgetPct > 100 ? 'var(--admin-red)' : budgetPct > 80 ? 'var(--admin-amber)' : 'var(--admin-emerald)',
                  fontFamily: 'var(--font-sans)',
                }}>
                {budgetPct.toFixed(1)}%
              </span>
            </div>
            <ProgressBar pct={budgetPct} />
            <div className="flex justify-between text-xs font-sans" style={{ color: 'var(--admin-text-dim)' }}>
              <span>Coûts: {tnd(costsTotal)}</span>
              <span>Budget: {tnd(budgetTotal)}</span>
            </div>
          </div>

          {/* Contracts */}
          {p.contracts.length > 0 && (
            <div className="admin-card-shine rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                  Contrats
                </h3>
              </div>
              <table className="w-full text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Type', 'Valeur', 'Début', 'Fin'].map((h, i) => (
                      <th key={h} className="py-2.5 text-xs uppercase tracking-widest font-medium"
                        style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 3 ? '1.25rem' : '1rem', textAlign: i === 1 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.contracts.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="pl-5 pr-4 py-2.5" style={{ color: 'var(--admin-text)' }}>{c.contractType}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                        {tnd(c.totalValue)}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(c.startDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="pl-4 pr-5 py-2.5" style={{ color: 'var(--admin-text-muted)' }}>
                        {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Milestones */}
      {tab === 1 && (
        <div className="space-y-4">
          {p.milestones.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-sm"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              Aucun jalon. <a href="/admin/projects/milestones" style={{ color: 'var(--admin-accent)' }}>Ajouter un jalon →</a>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Jalon', 'Échéance', 'Statut'].map((h, i) => (
                      <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                        style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 2 ? '1.25rem' : '1rem', textAlign: i >= 1 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.milestones.map(m => {
                    const overdue = m.status !== 'Completed' && new Date(m.dueDate) < new Date()
                    const stColor = m.status === 'Completed' ? 'var(--admin-emerald)' : overdue ? 'var(--admin-red)' : 'var(--admin-text-muted)'
                    return (
                      <tr key={m.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="py-3 pl-5 pr-4">
                          <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{m.title}</p>
                          {m.stageNumber && <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>Étape {m.stageNumber}</p>}
                        </td>
                        <td className="py-3 px-4 text-right text-sm tabular-nums"
                          style={{ color: overdue ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                          {new Date(m.dueDate).toLocaleDateString('fr-TN')}
                        </td>
                        <td className="py-3 pl-4 pr-5 text-right">
                          <span className="text-xs font-medium" style={{ color: stColor }}>
                            {m.status === 'Completed' ? 'Terminé' : overdue ? 'En retard' : m.status === 'InProgress' ? 'En cours' : 'À venir'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tasks */}
      {tab === 2 && (
        <div className="space-y-4">
          {p.tasks.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-sm"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              Aucune tâche. <a href="/admin/projects/tasks" style={{ color: 'var(--admin-accent)' }}>Ajouter une tâche →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {p.tasks.map(t => {
                const pColor = { Low: 'var(--admin-text-dim)', Medium: 'var(--admin-blue)', High: 'var(--admin-amber)', Critical: 'var(--admin-red)' }[t.priority] ?? 'var(--admin-text-dim)'
                return (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-3 rounded-lg admin-tr"
                    style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pColor }} />
                    <p className={`flex-1 text-sm ${t.status === 'Done' ? 'line-through opacity-50' : ''}`}
                      style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
                      {t.title}
                    </p>
                    {t.assignedTo && <span className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{t.assignedTo}</span>}
                    {t.dueDate && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                        {new Date(t.dueDate).toLocaleDateString('fr-TN')}
                      </span>
                    )}
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: pColor, fontFamily: 'var(--font-sans)' }}>{t.priority}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Documents */}
      {tab === 3 && (
        <div className="space-y-4">
          {p.documents.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-sm"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              Aucun document enregistré
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Document', 'Catégorie', 'Version', 'Date'].map((h, i) => (
                      <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                        style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 3 ? '1.25rem' : '1rem', textAlign: i >= 2 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.documents.map(d => (
                    <tr key={d.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="py-3 pl-5 pr-4 font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{d.title}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                          style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>{d.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>v{d.version}</td>
                      <td className="py-3 pl-4 pr-5 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(d.createdAt).toLocaleDateString('fr-TN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Budget */}
      {tab === 4 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModal('budget')} className="btn-admin">+ Ajouter un poste</button>
          </div>
          <div className="admin-card-shine rounded-xl overflow-hidden"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <table className="w-full text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Catégorie', 'Budget prévu', 'Coûts réels', 'Écart'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 3 ? '1.25rem' : '1rem', textAlign: i > 0 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const budgeted = p.budgetItems.filter(b => b.category === cat).reduce((s, b) => s + b.plannedAmount, 0)
                  const actual = p.costItems.filter(c => c.category === cat).reduce((s, c) => s + c.amount, 0) +
                    (cat === 'Labor' ? p.timeEntries.reduce((s, t) => s + t.amount, 0) : 0)
                  const variance = budgeted - actual
                  if (budgeted === 0 && actual === 0) return null
                  return (
                    <tr key={cat} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="pl-5 pr-4 py-3" style={{ color: 'var(--admin-text)' }}>{categoryLabels[cat] ?? cat}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm" style={{ color: 'var(--admin-text)' }}>{tnd(budgeted)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm" style={{ color: 'var(--admin-text)' }}>{tnd(actual)}</td>
                      <td className="pl-4 pr-5 py-3 text-right tabular-nums text-sm font-semibold"
                        style={{ color: variance >= 0 ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>
                        {variance >= 0 ? '+' : ''}{tnd(variance)}
                      </td>
                    </tr>
                  )
                })}
                {p.budgetItems.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-sm" style={{ color: 'var(--admin-text-dim)' }}>Aucun poste budget</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {modal === 'budget' && <AddBudgetItemModal projectId={p.id} onClose={closeModal} onSuccess={refresh} />}
        </div>
      )}

      {/* Tab 5: Costs */}
      {tab === 5 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModal('cost')} className="btn-admin">+ Ajouter un coût</button>
          </div>
          <div className="admin-card-shine rounded-xl overflow-hidden"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <table className="w-full text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Date', 'Description', 'Catégorie', 'GL', 'Montant'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 4 ? '1.25rem' : '1rem', textAlign: i === 4 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.costItems.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm" style={{ color: 'var(--admin-text-dim)' }}>Aucun coût enregistré</td></tr>}
                {p.costItems.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="pl-5 pr-4 py-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--admin-text)' }}>{c.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                        {categoryLabels[c.category] ?? c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-dim)' }}>{c.glAccount ?? '—'}</td>
                    <td className="pl-4 pr-5 py-3 text-right tabular-nums text-sm" style={{ color: 'var(--admin-text)' }}>{tnd(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {modal === 'cost' && <AddCostModal projectId={p.id} onClose={closeModal} onSuccess={refresh} />}
        </div>
      )}

      {/* Tab 6: Invoices */}
      {tab === 6 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModal('invoice')} className="btn-admin">+ Créer une facture</button>
          </div>
          <div className="space-y-3">
            {p.invoices.length === 0 && (
              <div className="rounded-xl p-12 text-center text-sm"
                style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                Aucune facture
              </div>
            )}
            {p.invoices.map(inv => {
              const isOverdue = inv.status === 'Issued' && inv.dueDate && new Date(inv.dueDate) < new Date()
              const displayStatus = isOverdue ? 'Overdue' : inv.status
              const totalPaid = inv.payments.reduce((s, pay) => s + pay.amount, 0)
              return (
                <div key={inv.id} className="admin-card-shine rounded-xl overflow-hidden"
                  style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
                  <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: inv.payments.length > 0 ? '1px solid var(--admin-border)' : 'none' }}>
                    <div className="flex items-center gap-4">
                      <Badge status={displayStatus} />
                      <span className="text-sm" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {new Date(inv.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>HT: {tnd(inv.amount)}</span>
                      <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>TTC: {tnd(inv.totalAmount)}</span>
                      {inv.status !== 'Paid' && (
                        <button onClick={() => { setSelectedInvoice({ id: inv.id, totalAmount: inv.totalAmount - totalPaid }); setModal('payment') }}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ color: 'var(--admin-accent)', border: '1px solid rgba(201,168,76,0.2)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                          Paiement
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {modal === 'invoice' && <CreateInvoiceModal projectId={p.id} onClose={closeModal} onSuccess={refresh} />}
          {modal === 'payment' && selectedInvoice && (
            <AddPaymentModal invoiceId={selectedInvoice.id} totalAmount={selectedInvoice.totalAmount} onClose={closeModal} onSuccess={refresh} />
          )}
        </div>
      )}

      {/* Tab 7: P&L */}
      {tab === 7 && pnl && (
        <div className="space-y-4">
          <div className="admin-card-shine rounded-xl overflow-hidden"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-accent-dim)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                Compte de résultat — {p.name}
              </h3>
              <button onClick={() => window.print()} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--admin-accent)', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.08)', fontFamily: 'var(--font-sans)' }}>
                Imprimer / PDF
              </button>
            </div>
            <div>
              <PnlRow label="Chiffre d'affaires (factures payées)" value={tnd(pnl.totalRevenue)} bold />
              <PnlRow label="− Coûts directs (main-d'œuvre + matériaux)" value={`(${tnd(pnl.totalDirectCosts)})`} />
              <PnlRow label="= Marge brute" value={tnd(pnl.grossProfit)} bold accent />
              <PnlRow label="− Charges indirectes allouées" value={`(${tnd(pnl.overheadAllocated)})`} />
              <PnlRow label="= Résultat net" value={tnd(pnl.netProfit)} bold accent={pnl.netProfit >= 0} negative={pnl.netProfit < 0} />
              <PnlRow label="Budget total prévu" value={tnd(pnl.totalBudget)} />
              <PnlRow label="Écart budget" value={`${pnl.budgetVariance >= 0 ? '+' : ''}${tnd(pnl.budgetVariance)}`} accent={pnl.budgetVariance >= 0} negative={pnl.budgetVariance < 0} />
              <PnlRow label="Taux de marge nette" value={`${pnl.marginPercent.toFixed(1)}%`} bold accent={pnl.marginPercent > 0} negative={pnl.marginPercent < 0} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Activity */}
      {tab === 8 && (
        <div className="space-y-2">
          {p.activityLogs.length === 0 ? (
            <div className="rounded-xl p-12 text-center text-sm"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              Aucune activité enregistrée
            </div>
          ) : p.activityLogs.map(log => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-lg"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{log.description}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                  {new Date(log.createdAt).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {log.performedBy && ` · ${log.performedBy}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advance stage modal */}
      {showAdvanceModal && p.stage < 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowAdvanceModal(false)} />
          <div className="relative rounded-xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <h3 className="text-base font-semibold mb-4"
              style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
              Passer à l&apos;étape suivante ?
            </h3>
            <div className="flex flex-col items-center gap-2 mb-5 py-4 rounded-lg"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
                {STAGES[p.stage]?.name}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: 'var(--admin-text-dim)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="text-sm font-semibold"
                style={{ color: STAGES[p.stage + 1]?.color, fontFamily: 'var(--font-sans)' }}>
                {STAGES[p.stage + 1]?.name}
              </span>
            </div>
            <label className="block mb-1 text-xs font-medium" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Note (optionnel)
            </label>
            <input className="admin-input w-full mb-5" placeholder="Ajouter une note…"
              value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setShowAdvanceModal(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                Annuler
              </button>
              <button onClick={handleAdvance} disabled={advancing}
                className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: STAGES[p.stage + 1]?.color, color: '#fff', fontFamily: 'var(--font-sans)' }}>
                {advancing ? 'En cours…' : 'Confirmer →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-card-shine rounded-xl p-4"
      style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
      <p className="text-xs uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
        {label}
      </p>
      <div className="text-sm font-medium" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
        {value}
      </div>
    </div>
  )
}

function PnlCell({ label, value, neg, colorStyle }: { label: string; value: string; neg?: boolean; colorStyle?: React.CSSProperties }) {
  return (
    <div className="p-5" style={{ borderRight: '1px solid var(--admin-border)' }}>
      <p className="text-xs uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
        {label}
      </p>
      <p className="font-semibold text-lg"
        style={{ fontFamily: 'var(--font-playfair)', color: colorStyle ? undefined : neg ? 'var(--admin-red)' : 'var(--admin-text)', ...colorStyle }}>
        {value}
      </p>
    </div>
  )
}

function PnlRow({ label, value, bold, accent, negative }: { label: string; value: string; bold?: boolean; accent?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center px-6 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <span className="text-sm" style={{ fontFamily: 'var(--font-sans)', fontWeight: bold ? 600 : 400, color: bold ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm tabular-nums"
        style={{ fontFamily: 'var(--font-sans)', fontWeight: bold ? 700 : 400, color: negative ? 'var(--admin-red)' : accent ? 'var(--admin-emerald)' : 'var(--admin-text)' }}>
        {value}
      </span>
    </div>
  )
}
