'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWasteRecord } from '@/lib/actions/waste'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewWasteRecordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createWasteRecord({
      month: parseInt(fd.get('month') as string),
      year: parseInt(fd.get('year') as string),
      wasteType: fd.get('wasteType') as string,
      quantityKg: fd.get('quantityKg') ? parseFloat(fd.get('quantityKg') as string) : undefined,
      disposal: fd.get('disposal') as string,
      contractor: fd.get('contractor') as string || undefined,
      cost: fd.get('cost') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })
    if (result.success) {
      router.push('/admin/environment/waste')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/environment/waste" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouveau enregistrement déchet
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Mois *</label>
            <select name="month" required defaultValue={currentMonth} className={inputClass} style={inputStyle}>
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
                .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Année *</label>
            <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type de déchet *</label>
            <select name="wasteType" required className={inputClass} style={inputStyle}>
              <option value="">Sélectionner…</option>
              <option value="papier_carton">Papier / Carton</option>
              <option value="plastique">Plastique</option>
              <option value="verre">Verre</option>
              <option value="metal">Métal</option>
              <option value="dechets_verts">Déchets verts</option>
              <option value="dechets_chimiques">Déchets chimiques</option>
              <option value="electronique">Électronique</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Quantité (kg)</label>
            <input name="quantityKg" type="number" step="0.1" min="0" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>{"Mode d'élimination *"}</label>
            <select name="disposal" required className={inputClass} style={inputStyle}>
              <option value="">Sélectionner…</option>
              <option value="tri_selectif">Tri sélectif</option>
              <option value="collecte_municipale">Collecte municipale</option>
              <option value="prestataire_agree">Prestataire agréé</option>
              <option value="incineration">Incinération</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Prestataire</label>
            <input name="contractor" type="text" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Coût (TND)</label>
            <input name="cost" type="number" step="0.001" min="0" className={inputClass} style={inputStyle} />
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
            href="/admin/environment/waste"
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
