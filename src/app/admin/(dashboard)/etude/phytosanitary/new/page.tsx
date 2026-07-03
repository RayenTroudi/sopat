'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPhytosanitaryAction } from '@/lib/actions/etude'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

const TYPES = [
  { value: 'insecticide', label: 'Insecticide' },
  { value: 'acaricide', label: 'Acaricide' },
  { value: 'fongicide', label: 'Fongicide' },
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'engrais', label: 'Engrais' },
  { value: 'autre', label: 'Autre' },
]

export default function NewPhytosanitaryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createPhytosanitaryAction({
      productType: fd.get('productType') as string,
      commercialName: fd.get('commercialName') as string,
      code: fd.get('code') as string || undefined,
      approvalNumber: fd.get('approvalNumber') as string || undefined,
      activeIngredient: fd.get('activeIngredient') as string || undefined,
      formulation: fd.get('formulation') as string || undefined,
      concentration: fd.get('concentration') as string || undefined,
      usageDose: fd.get('usageDose') as string || undefined,
      targetPests: fd.get('targetPests') as string || undefined,
      targetCrop: fd.get('targetCrop') as string || undefined,
      reEntryDelay: fd.get('reEntryDelay') as string || undefined,
      packaging: fd.get('packaging') as string || undefined,
      toxicologicalClass: fd.get('toxicologicalClass') as string || undefined,
      ppe: fd.get('ppe') as string || undefined,
      storageConditions: fd.get('storageConditions') as string || undefined,
      preUseInstructions: fd.get('preUseInstructions') as string || undefined,
      duringUseInstructions: fd.get('duringUseInstructions') as string || undefined,
      wasteDisposal: fd.get('wasteDisposal') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push(`/admin/etude/phytosanitary/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/etude/phytosanitary" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle fiche produit phytosanitaire
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Caractéristiques générales */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Caractéristiques générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type *</label>
              <select name="productType" required className={inputClass} style={inputStyle}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Code référence</label>
              <input name="code" type="text" placeholder="Ex: PP-001" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Nom commercial *</label>
              <input name="commercialName" required type="text" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>N° d'homologation</label>
              <input name="approvalNumber" type="text" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Matière active</label>
              <input name="activeIngredient" type="text" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Formulation</label>
              <input name="formulation" type="text" placeholder="Ex: Suspension concentrée (SC)" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Concentration</label>
              <input name="concentration" type="text" placeholder="Ex: 50 g/L" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Dose d'utilisation</label>
              <input name="usageDose" type="text" placeholder="Ex: 0.5 L/ha" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Dépredateurs / Cibles</label>
              <input name="targetPests" type="text" placeholder="Ex: Cochenilles, pucerons…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Culture</label>
              <input name="targetCrop" type="text" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Délai de rentrée</label>
              <input name="reEntryDelay" type="text" placeholder="Ex: 24h" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Conditionnement</label>
              <input name="packaging" type="text" placeholder="Ex: Bidon 5L" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Classement & Sécurité</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Classement toxicologique</label>
            <input name="toxicologicalClass" type="text" placeholder="Ex: Nocif, Dangereux pour l'environnement" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>EPI requis</label>
            <textarea name="ppe" rows={2} placeholder="Ex: Gants, masque P3, combinaison…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Conditions de stockage</label>
            <textarea name="storageConditions" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Avant l'utilisation</label>
            <textarea name="preUseInstructions" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Lors de l'utilisation</label>
            <textarea name="duringUseInstructions" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Déchets</label>
            <textarea name="wasteDisposal" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Remarques</label>
            <textarea name="notes" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/admin/etude/phytosanitary"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >Annuler</Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}
