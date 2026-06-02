'use client'

import { useState } from 'react'
import { Card, Modal, Field, SubmitBtn, Empty, inputCls } from '@/components/admin/ui'

type Supplier = {
  id: string
  name: string
  category: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  rating: number | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

const CATEGORIES = ['plants', 'materials', 'equipment', 'labor', 'irrigation', 'lighting', 'other']

export default function SuppliersClient({ suppliers: initial }: { suppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [catFilter, setCatFilter] = useState('All')

  const filtered = catFilter === 'All' ? suppliers : suppliers.filter(s => s.category === catFilter)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        category: fd.get('category'),
        contactName: fd.get('contactName'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        notes: fd.get('notes'),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setSuppliers(prev => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
    }
    setLoading(false)
  }

  function RatingStars({ rating }: { rating: number | null }) {
    return (
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <svg key={i} className="w-3 h-3" fill={rating && i <= rating ? 'var(--admin-accent)' : 'none'} stroke="var(--admin-accent)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Achats
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Fournisseurs
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--admin-accent)', color: '#0B1012', fontFamily: 'var(--font-sans)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau fournisseur
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className="px-3 py-1 rounded-full text-xs font-medium capitalize"
            style={{
              fontFamily: 'var(--font-sans)',
              background: catFilter === c ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: catFilter === c ? '#0B1012' : 'var(--admin-text-muted)',
              border: `1px solid ${catFilter === c ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
            }}>
            {c === 'All' ? 'Tous' : c}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? <Empty message="Aucun fournisseur trouvé" /> : (
          <div className="overflow-x-auto admin-scroll -mx-5 -my-5">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Fournisseur', 'Catégorie', 'Contact', 'Email / Tél', 'Note'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{
                        color: 'var(--admin-text-dim)',
                        paddingLeft: i === 0 ? '1.25rem' : '1rem',
                        paddingRight: i === 4 ? '1.25rem' : '1rem',
                        textAlign: i >= 4 ? 'right' : 'left',
                        letterSpacing: '0.08em',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="py-3.5 pl-5 pr-4">
                      <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{s.name}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                        style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{s.contactName ?? '—'}</td>
                    <td className="py-3.5 px-4 text-sm">
                      <p style={{ color: 'var(--admin-text-muted)' }}>{s.email ?? '—'}</p>
                      {s.phone && <p className="text-xs" style={{ color: 'var(--admin-text-dim)' }}>{s.phone}</p>}
                    </td>
                    <td className="py-3.5 pl-4 pr-5 text-right">
                      <RatingStars rating={s.rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAdd && (
        <Modal title="Nouveau fournisseur" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Nom *">
              <input name="name" className={inputCls} required />
            </Field>
            <Field label="Catégorie *">
              <select name="category" className={inputCls} required>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Personne de contact">
                <input name="contactName" className={inputCls} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" className={inputCls} />
              </Field>
            </div>
            <Field label="Téléphone">
              <input name="phone" className={inputCls} />
            </Field>
            <Field label="Adresse">
              <input name="address" className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" className={inputCls} rows={3} />
            </Field>
            <SubmitBtn loading={loading} label="Ajouter le fournisseur" />
          </form>
        </Modal>
      )}
    </div>
  )
}
