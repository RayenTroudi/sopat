'use client'

import { useState } from 'react'
import { Badge, Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Lead = {
  id: string
  contactName: string
  email: string | null
  phone: string | null
  company: string | null
  source: string
  status: string
  notes: string | null
  estimatedValue: number | null
  followUpDate: string | null
  createdAt: string
  client: { name: string } | null
}

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']
const SOURCE_OPTIONS = ['Website', 'Referral', 'Cold Call', 'Exhibition', 'Social Media', 'Other']

const statusColor: Record<string, { bg: string; color: string; dot: string }> = {
  New:       { bg: 'var(--admin-blue-dim)',   color: 'var(--admin-blue)',   dot: 'var(--admin-blue)' },
  Contacted: { bg: 'var(--admin-amber-dim)',  color: 'var(--admin-amber)',  dot: 'var(--admin-amber)' },
  Qualified: { bg: 'var(--admin-accent-dim)', color: 'var(--admin-accent)', dot: 'var(--admin-accent)' },
  Proposal:  { bg: 'rgba(139,92,246,0.12)',   color: '#8b5cf6',             dot: '#8b5cf6' },
  Won:       { bg: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)', dot: 'var(--admin-emerald)' },
  Lost:      { bg: 'var(--admin-red-dim)',    color: 'var(--admin-red)',    dot: 'var(--admin-red)' },
}

function StatusBadge({ status }: { status: string }) {
  const c = statusColor[status] ?? statusColor.New
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.color, fontFamily: 'var(--font-sans)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  )
}

export default function LeadsClient({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('All')

  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      contactName: fd.get('contactName'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      company: fd.get('company'),
      source: fd.get('source'),
      status: fd.get('status'),
      estimatedValue: fd.get('estimatedValue'),
      notes: fd.get('notes'),
      followUpDate: fd.get('followUpDate'),
    }
    const res = await fetch('/api/admin/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      setLeads(prev => [{ ...data.data, client: null }, ...prev])
      setShowAdd(false)
    }
    setLoading(false)
  }

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            CRM
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Prospects
          </h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau prospect
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {['All', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
            style={{
              fontFamily: 'var(--font-sans)',
              background: filter === s ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: filter === s ? '#0B1012' : 'var(--admin-text-muted)',
              border: `1px solid ${filter === s ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}
          >
            {s} {s !== 'All' && counts[s] > 0 && <span className="opacity-60">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <Empty message="Aucun prospect trouvé" />
        ) : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Contact', 'Entreprise', 'Source', 'Valeur estimée', 'Suivi', 'Statut'].map((h, i) => (
                    <th key={h}
                      className="py-3 text-xs uppercase tracking-widest font-medium"
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
                {filtered.map(lead => (
                  <tr key={lead.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="py-3.5 pl-5 pr-4">
                      <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{lead.contactName}</p>
                      {lead.email && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)' }}>{lead.email}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {lead.company ?? '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm tabular-nums"
                      style={{ color: lead.estimatedValue ? 'var(--admin-text)' : 'var(--admin-text-dim)' }}>
                      {lead.estimatedValue ? `${lead.estimatedValue.toLocaleString('fr-TN')} TND` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('fr-TN') : '—'}
                    </td>
                    <td className="py-3.5 pl-4 pr-5 text-right">
                      <StatusBadge status={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Nouveau prospect" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Nom du contact *">
              <input name="contactName" className={inputCls} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input name="email" type="email" className={inputCls} />
              </Field>
              <Field label="Téléphone">
                <input name="phone" className={inputCls} />
              </Field>
            </div>
            <Field label="Entreprise">
              <input name="company" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source *">
                <select name="source" className={inputCls} required>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select name="status" className={inputCls}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valeur estimée (TND)">
                <input name="estimatedValue" type="number" step="0.001" className={inputCls} />
              </Field>
              <Field label="Date de suivi">
                <input name="followUpDate" type="date" className={inputCls} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea name="notes" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Créer le prospect" />
          </form>
        </Modal>
      )}
    </div>
  )
}
