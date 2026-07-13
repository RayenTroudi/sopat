'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOffer } from '@/lib/actions/commercial'
import Link from 'next/link'

const PROJECT_TYPES = ['Étude', 'Réalisation', 'Entretien', 'Étude + Réalisation', 'Autre']

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewOfferPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createOffer({
      clientName: (fd.get('clientName') as string) || undefined,
      projectTitle: fd.get('projectTitle') as string,
      projectType: (fd.get('projectType') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      amount: (fd.get('amount') as string) || undefined,
      currency: (fd.get('currency') as string) || 'TND',
      sentDate: (fd.get('sentDate') as string) || undefined,
      validityDate: (fd.get('validityDate') as string) || undefined,
      responsible: (fd.get('responsible') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
    })

    if (result.success && 'id' in result) {
      router.push(`/admin/commercial/offers/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/commercial/offers" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle offre commerciale
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-CO-01 — Tableau de suivi des offres
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
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Client</label>
              <input type="text" name="clientName" placeholder="Nom du client / prospect" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Type de projet</label>
              <select name="projectType" className={inputClass} style={inputStyle}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Intitulé du projet *</label>
            <input type="text" name="projectTitle" required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Description</label>
            <textarea name="description" rows={3} className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Montant</label>
              <input type="number" step="0.001" min="0" name="amount" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Devise</label>
              <select name="currency" defaultValue="TND" className={inputClass} style={inputStyle}>
                {['TND', 'EUR', 'USD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Responsable</label>
              <input type="text" name="responsible" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date d&apos;envoi</label>
              <input type="date" name="sentDate" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Validité jusqu&apos;au</label>
              <input type="date" name="validityDate" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Notes</label>
            <textarea name="notes" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/commercial/offers"
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
            {loading ? 'Création…' : "Créer l'offre"}
          </button>
        </div>
      </form>
    </div>
  )
}
