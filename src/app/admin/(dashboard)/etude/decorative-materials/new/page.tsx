'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDecorativeMaterialAction } from '@/lib/actions/etude'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewDecorativeMaterialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interior, setInterior] = useState(false)
  const [exterior, setExterior] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createDecorativeMaterialAction({
      name: fd.get('name') as string,
      code: fd.get('code') as string || undefined,
      mainMaterial: fd.get('mainMaterial') as string || undefined,
      aspect: fd.get('aspect') as string || undefined,
      color: fd.get('color') as string || undefined,
      caliber: fd.get('caliber') as string || undefined,
      waterAbsorption: fd.get('waterAbsorption') as string || undefined,
      packaging: fd.get('packaging') as string || undefined,
      usedInterior: interior,
      usedExterior: exterior,
      handling: fd.get('handling') as string || undefined,
      packagingDetails: fd.get('packagingDetails') as string || undefined,
      storageConditions: fd.get('storageConditions') as string || undefined,
      maintenance: fd.get('maintenance') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push(`/admin/etude/decorative-materials/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const btnActive = { background: 'var(--green)', color: 'var(--ivory)', borderColor: 'transparent' }
  const btnInactive = { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/etude/decorative-materials" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle fiche matière décorative
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Description */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>1. Description</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Référence (FOR-ET-03)</label>
              <input name="code" type="text" placeholder="Ex: MD-001" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Nom de l'article *</label>
              <input name="name" required type="text" placeholder="Ex: Gravier calcaire blanc" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Matière principale</label>
              <input name="mainMaterial" type="text" placeholder="Ex: Calcaire, Ardoise…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Aspect</label>
              <input name="aspect" type="text" placeholder="Ex: Roulé, concassé…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Couleur</label>
              <input name="color" type="text" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* 2. Technical characteristics */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>2. Caractéristiques techniques</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Calibre</label>
              <input name="caliber" type="text" placeholder="Ex: 10–20 mm" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Absorption d'eau</label>
              <input name="waterAbsorption" type="text" placeholder="Ex: < 0,5%" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Conditionnement</label>
              <input name="packaging" type="text" placeholder="Ex: Sacs de 25 kg, vrac…" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* 3. Usage */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>3. Utilisation</h2>
          <div className="flex gap-3">
            <button type="button" onClick={() => setInterior((p) => !p)}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition-opacity hover:opacity-80"
              style={interior ? btnActive : btnInactive}>
              Intérieur {interior ? '✓' : ''}
            </button>
            <button type="button" onClick={() => setExterior((p) => !p)}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition-opacity hover:opacity-80"
              style={exterior ? btnActive : btnInactive}>
              Extérieur {exterior ? '✓' : ''}
            </button>
          </div>
        </div>

        {/* 4–7 */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>4–7. Manutention, stockage & entretien</h2>
          {[
            { name: 'handling', label: '4. Manutention' },
            { name: 'packagingDetails', label: '5. Conditionnement (détail)' },
            { name: 'storageConditions', label: '6. Conditions de stockage' },
            { name: 'maintenance', label: '7. Entretien' },
            { name: 'notes', label: 'Remarques' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
              <textarea name={name} rows={2} className={inputClass} style={inputStyle} />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/admin/etude/decorative-materials"
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
