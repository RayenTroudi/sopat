'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRegulatoryEntry } from '@/lib/actions/regulatory-watch'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewRegulatoryEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createRegulatoryEntry({
      reference: fd.get('reference') as string || undefined,
      title: fd.get('title') as string,
      domain: fd.get('domain') as string || undefined,
      issuingBody: fd.get('issuingBody') as string || undefined,
      publicationDate: fd.get('publicationDate') as string || undefined,
      effectiveDate: fd.get('effectiveDate') as string || undefined,
      status: fd.get('status') as string,
      complianceNotes: fd.get('complianceNotes') as string || undefined,
      nextReviewDate: fd.get('nextReviewDate') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/regulatory-watch')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/regulatory-watch" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouveau texte réglementaire
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Référence</label>
            <input name="reference" type="text" placeholder="ex: Loi 2024-001" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Statut *</label>
            <select name="status" required className={inputClass} style={inputStyle}>
              <option value="applicable">Applicable</option>
              <option value="en_veille">En veille</option>
              <option value="non_applicable">Non applicable</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Titre *</label>
          <input name="title" type="text" required
            placeholder="Intitulé complet du texte réglementaire"
            className={inputClass} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Domaine</label>
            <input name="domain" type="text" placeholder="ex: Environnement, Sécurité" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Organisme émetteur</label>
            <input name="issuingBody" type="text" placeholder="ex: Ministère de l'Environnement" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date de publication</label>
            <input name="publicationDate" type="date" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date d'entrée en vigueur</label>
            <input name="effectiveDate" type="date" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Notes de conformité</label>
          <textarea name="complianceNotes" rows={3}
            placeholder="Comment SOPAT se conforme à ce texte…"
            className={inputClass} style={inputStyle} />
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Prochaine date de révision</label>
          <input name="nextReviewDate" type="date" className={inputClass} style={inputStyle} />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/regulatory-watch"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
