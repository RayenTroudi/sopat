'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientAccountEntry } from '@/lib/actions/client-accounts'
import type { ClientEntryType } from '@/lib/db/client-accounts'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewEntryForm({
  clients,
  projects,
}: {
  clients: { id: string; name: string }[]
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

    const result = await createClientAccountEntry({
      clientId: fd.get('clientId') as string,
      projectId: (fd.get('projectId') as string) || undefined,
      entryType: fd.get('entryType') as ClientEntryType,
      amount: fd.get('amount') as string,
      currency: (fd.get('currency') as string) || 'TND',
      entryDate: fd.get('entryDate') as string,
      reference: (fd.get('reference') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
    })

    if (result.success) {
      router.push('/admin/commercial/client-balances')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/commercial/client-balances" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle écriture client
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-CO-03 — Facture, encaissement ou avoir
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
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Client *</label>
              <select name="clientId" required className={inputClass} style={inputStyle} defaultValue="">
                <option value="" disabled>Sélectionner…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Projet</label>
              <select name="projectId" className={inputClass} style={inputStyle} defaultValue="">
                <option value="">— Aucun —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Type *</label>
              <select name="entryType" required className={inputClass} style={inputStyle} defaultValue="facture">
                <option value="facture">Facture</option>
                <option value="encaissement">Encaissement</option>
                <option value="avoir">Avoir</option>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date *</label>
              <input type="date" name="entryDate" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Réf. pièce (facture, reçu…)</label>
              <input type="text" name="reference" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Notes</label>
            <textarea name="notes" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/commercial/client-balances"
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
            {loading ? 'Enregistrement…' : "Enregistrer l'écriture"}
          </button>
        </div>
      </form>
    </div>
  )
}
