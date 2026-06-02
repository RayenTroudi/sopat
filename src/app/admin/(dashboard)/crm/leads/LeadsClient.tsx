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
  New:       { bg: 'var(--admin-blue-dim)',    color: 'var(--admin-blue)',    dot: 'var(--admin-blue)' },
  Contacted: { bg: 'var(--admin-amber-dim)',   color: 'var(--admin-amber)',   dot: 'var(--admin-amber)' },
  Qualified: { bg: 'var(--admin-accent-dim)',  color: 'var(--admin-accent)',  dot: 'var(--admin-accent)' },
  Proposal:  { bg: 'rgba(139,92,246,0.12)',    color: '#8b5cf6',              dot: '#8b5cf6' },
  Won:       { bg: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)', dot: 'var(--admin-emerald)' },
  Lost:      { bg: 'var(--admin-red-dim)',     color: 'var(--admin-red)',     dot: 'var(--admin-red)' },
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

function toDateInput(val: string | null) {
  if (!val) return ''
  return new Date(val).toISOString().split('T')[0]
}

export default function LeadsClient({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial)
  const [showAdd, setShowAdd]       = useState(false)
  const [editing, setEditing]       = useState<Lead | null>(null)
  const [deleting, setDeleting]     = useState<Lead | null>(null)
  const [loading, setLoading]       = useState(false)
  const [filter, setFilter]         = useState('All')

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

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
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
    const res = await fetch(`/api/admin/crm/leads/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      setLeads(prev => prev.map(l => l.id === editing.id ? data.data : l))
      setEditing(null)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!deleting) return
    setLoading(true)
    const res = await fetch(`/api/admin/crm/leads/${deleting.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setLeads(prev => prev.filter(l => l.id !== deleting.id))
      setDeleting(null)
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
                  {['Contact', 'Entreprise', 'Source', 'Valeur estimée', 'Suivi', 'Statut', ''].map((h, i) => (
                    <th key={i}
                      className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 6 ? '1.25rem' : '1rem',
                        textAlign: i >= 3 && i < 6 ? 'right' : 'left',
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
                    <td className="py-3.5 pl-4 pr-3 text-right">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3.5 pl-2 pr-5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditing(lead)}
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: 'var(--admin-text-dim)' }}
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleting(lead)}
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: 'var(--admin-red)' }}
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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

      {/* Edit modal */}
      {editing && (
        <Modal title="Modifier le prospect" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Nom du contact *">
              <input name="contactName" className={inputCls} required defaultValue={editing.contactName} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input name="email" type="email" className={inputCls} defaultValue={editing.email ?? ''} />
              </Field>
              <Field label="Téléphone">
                <input name="phone" className={inputCls} defaultValue={editing.phone ?? ''} />
              </Field>
            </div>
            <Field label="Entreprise">
              <input name="company" className={inputCls} defaultValue={editing.company ?? ''} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source *">
                <select name="source" className={inputCls} required defaultValue={editing.source}>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select name="status" className={inputCls} defaultValue={editing.status}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valeur estimée (TND)">
                <input name="estimatedValue" type="number" step="0.001" className={inputCls}
                  defaultValue={editing.estimatedValue ?? ''} />
              </Field>
              <Field label="Date de suivi">
                <input name="followUpDate" type="date" className={inputCls}
                  defaultValue={toDateInput(editing.followUpDate)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea name="notes" className={inputCls} rows={3} defaultValue={editing.notes ?? ''} />
            </Field>
            <SubmitBtn loading={loading} label="Enregistrer les modifications" />
          </form>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <Modal title="Supprimer le prospect" onClose={() => setDeleting(null)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
              Êtes-vous sûr de vouloir supprimer{' '}
              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{deleting.contactName}</span>
              {' '}? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--admin-card)',
                  color: 'var(--admin-text-muted)',
                  border: '1px solid var(--admin-border)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: 'var(--admin-red)', color: '#fff', fontFamily: 'var(--font-sans)' }}
              >
                {loading ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
