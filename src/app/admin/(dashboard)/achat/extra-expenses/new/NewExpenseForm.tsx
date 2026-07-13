'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createExtraExpense } from '@/lib/actions/achat'
import { EXPENSE_CATEGORIES } from '@/lib/db/achat'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewExpenseForm({
  projects,
}: {
  projects: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createExtraExpense({
      projectId: (fd.get('projectId') as string) || undefined,
      expenseDate: fd.get('expenseDate') as string,
      category: (fd.get('category') as string) || undefined,
      description: fd.get('description') as string,
      amount: fd.get('amount') as string,
      currency: (fd.get('currency') as string) || 'TND',
      justification: (fd.get('justification') as string) || undefined,
    })

    if (result.success) {
      router.push('/admin/achat/extra-expenses')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/achat/extra-expenses" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle extra dépense
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-AC-01 — Sera soumise à la validation de la direction
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date *</label>
              <input type="date" name="expenseDate" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Projet</label>
              <select name="projectId" defaultValue="" className={inputClass} style={inputStyle}>
                <option value="">— Aucun —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Catégorie</label>
              <select name="category" defaultValue="" className={inputClass} style={inputStyle}>
                <option value="">— Choisir —</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Montant *</label>
              <input type="number" step="0.001" min="0.001" name="amount" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Devise</label>
              <select name="currency" defaultValue="TND" className={inputClass} style={inputStyle}>
                {['TND', 'EUR', 'USD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Description *</label>
            <input type="text" name="description" required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Justification</label>
            <textarea name="justification" rows={2} placeholder="Pourquoi cette dépense hors bon de commande ?" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/achat/extra-expenses"
            className="px-4 py-2 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Enregistrement…' : 'Soumettre la dépense'}
          </button>
        </div>
      </form>
    </div>
  )
}
