'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createStakeholder } from '@/lib/actions/stakeholders'
import Link from 'next/link'

const TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'partenaire', label: 'Partenaire' },
  { value: 'employe', label: 'Employé' },
  { value: 'actionnaire', label: 'Actionnaire' },
  { value: 'autorite_reglementaire', label: 'Autorité réglementaire' },
  { value: 'communaute', label: 'Communauté' },
  { value: 'autre', label: 'Autre' },
]

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewStakeholderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [influence, setInfluence] = useState(1)
  const [interaction, setInteraction] = useState(1)
  const isPip = influence >= 2 && interaction >= 2

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createStakeholder({
      name: fd.get('name') as string,
      type: fd.get('type') as string,
      needs: fd.get('needs') as string || undefined,
      influence,
      interaction,
      contactName: fd.get('contactName') as string || undefined,
      contactEmail: fd.get('contactEmail') as string || undefined,
      contactPhone: fd.get('contactPhone') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/stakeholders')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/stakeholders" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle Partie Intéressée
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Nom *</label>
            <input name="name" required type="text" className={inputClass} style={inputStyle} />
          </div>

          <div className="col-span-2">
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type *</label>
            <select name="type" required className={inputClass} style={inputStyle}>
              <option value="">Sélectionner…</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Besoins &amp; Attentes</label>
            <textarea name="needs" rows={3} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>Évaluation influence / interaction</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--admin-text-muted)' }}>Influence (1–4)</label>
              <select
                value={influence}
                onChange={(e) => setInfluence(Number(e.target.value))}
                className={inputClass} style={inputStyle}
              >
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--admin-text-muted)' }}>Interaction (1–4)</label>
              <select
                value={interaction}
                onChange={(e) => setInteraction(Number(e.target.value))}
                className={inputClass} style={inputStyle}
              >
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isPip ? 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]' : 'bg-[var(--admin-surface)] text-[var(--admin-text-muted)]'
            }`}>
              {isPip ? 'PIP — Partie à Influence Particulière' : 'Non PIP'}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>(influence ≥ 2 ET interaction ≥ 2)</span>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>Contact (optionnel)</p>
          <div className="grid grid-cols-3 gap-3">
            <input name="contactName" type="text" placeholder="Nom" className={inputClass} style={inputStyle} />
            <input name="contactEmail" type="email" placeholder="Email" className={inputClass} style={inputStyle} />
            <input name="contactPhone" type="text" placeholder="Tél." className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
          <textarea name="notes" rows={2} className={inputClass} style={inputStyle} />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/stakeholders"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >
            Annuler
          </Link>
          <button
            type="submit" disabled={loading}
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
