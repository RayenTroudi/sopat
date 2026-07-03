'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPlantSpeciesAction } from '@/lib/actions/etude'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

const CATEGORIES = [
  { value: 'palm', label: 'Palmiers' },
  { value: 'tree', label: 'Arbres' },
  { value: 'shrub', label: 'Arbustes' },
  { value: 'grass', label: 'Graminées' },
  { value: 'ground_cover', label: 'Couvre-sol / Plantes basses' },
  { value: 'climber', label: 'Plantes grimpantes' },
  { value: 'aquatic', label: 'Aquatiques' },
  { value: 'other', label: 'Autre' },
]

const UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'kg', label: 'kg' },
]

export default function NewPlantSpeciesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createPlantSpeciesAction({
      botanicalName: fd.get('botanicalName') as string,
      commonNameFr: fd.get('commonNameFr') as string || undefined,
      category: fd.get('category') as string,
      defaultUnit: fd.get('defaultUnit') as string || 'unit',
      lisCode: fd.get('lisCode') as string || undefined,
      isCaducous: fd.get('isCaducous') === 'true',
      isToxic: fd.get('isToxic') === 'true',
      hasSpines: fd.get('hasSpines') === 'true',
      hasFlowers: fd.get('hasFlowers') === 'true',
      flowerColor: fd.get('flowerColor') as string || undefined,
      floweringPeriod: fd.get('floweringPeriod') as string || undefined,
      hasFruit: fd.get('hasFruit') === 'true',
      fruitingPeriod: fd.get('fruitingPeriod') as string || undefined,
      adaptedEnvironment: fd.get('adaptedEnvironment') as string || undefined,
      diseases: fd.get('diseases') as string || undefined,
      heightAdultMin: fd.get('heightAdultMin') as string || undefined,
      heightAdultMax: fd.get('heightAdultMax') as string || undefined,
      diameterAdultMin: fd.get('diameterAdultMin') as string || undefined,
      diameterAdultMax: fd.get('diameterAdultMax') as string || undefined,
      storageExposure: fd.get('storageExposure') as string || undefined,
      storagePlace: fd.get('storagePlace') as string || undefined,
      plantingPeriod: fd.get('plantingPeriod') as string || undefined,
      soilType: fd.get('soilType') as string || undefined,
      plantingExposure: fd.get('plantingExposure') as string || undefined,
      wateringCold: fd.get('wateringCold') as string || undefined,
      wateringHot: fd.get('wateringHot') as string || undefined,
      pruning: fd.get('pruning') as string || undefined,
      phytosanitaryTreatment: fd.get('phytosanitaryTreatment') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push(`/admin/etude/plant-species/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/etude/plant-species" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle espèce végétale
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Identification</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Code LIS-ET-03</label>
              <input name="lisCode" type="text" placeholder="Ex: P001" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Catégorie *</label>
              <select name="category" required className={inputClass} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Nom latin (botanique) *</label>
              <input name="botanicalName" required type="text" placeholder="Ex: Phoenix canariensis" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Nom commun (FR)</label>
              <input name="commonNameFr" type="text" placeholder="Ex: Palmier des Canaries" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Unité par défaut</label>
            <select name="defaultUnit" className={inputClass} style={inputStyle}>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {/* Characteristics */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Caractéristiques (LIS-ET-03)</h2>

          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'isCaducous', label: 'Caduque' },
              { name: 'isToxic', label: 'Toxique' },
              { name: 'hasSpines', label: 'Épines' },
              { name: 'hasFlowers', label: 'Fleurs' },
              { name: 'hasFruit', label: 'Fruits' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
                <select name={name} className={inputClass} style={inputStyle}>
                  <option value="">Non renseigné</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Couleur de fleur</label>
              <input name="flowerColor" type="text" placeholder="Ex: Jaune, Rose…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Période de floraison</label>
              <input name="floweringPeriod" type="text" placeholder="Ex: Avr–Juin" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Période de fructification</label>
              <input name="fruitingPeriod" type="text" placeholder="Ex: Aoû–Oct" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Hauteur adulte min (m)</label>
              <input name="heightAdultMin" type="number" step="0.1" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Hauteur adulte max (m)</label>
              <input name="heightAdultMax" type="number" step="0.1" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Diamètre adulte min (m)</label>
              <input name="diameterAdultMin" type="number" step="0.1" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Diamètre adulte max (m)</label>
              <input name="diameterAdultMax" type="number" step="0.1" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Environnement adapté</label>
            <textarea name="adaptedEnvironment" rows={2} placeholder="Ex: Zones arides, côtières, résistant à la sécheresse…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Maladies & insectes</label>
            <textarea name="diseases" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* Planting & care */}
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Plantation & Entretien</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Période de plantation</label>
              <input name="plantingPeriod" type="text" placeholder="Ex: Oct–Mar" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type de sol</label>
              <input name="soilType" type="text" placeholder="Ex: Drainant, argileux…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Exposition plantation</label>
              <input name="plantingExposure" type="text" placeholder="Ex: Plein soleil, mi-ombre…" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Exposition stockage</label>
              <input name="storageExposure" type="text" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Lieu de stockage</label>
              <input name="storagePlace" type="text" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Arrosage (période froide)</label>
              <input name="wateringCold" type="text" placeholder="Ex: 1×/semaine" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Arrosage (période sèche)</label>
              <input name="wateringHot" type="text" placeholder="Ex: 3×/semaine" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Taille</label>
            <textarea name="pruning" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Traitement phytosanitaire</label>
            <textarea name="phytosanitaryTreatment" rows={2} className={inputClass} style={inputStyle} />
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
          <Link href="/admin/etude/plant-species"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer l\'espèce'}
          </button>
        </div>
      </form>
    </div>
  )
}
