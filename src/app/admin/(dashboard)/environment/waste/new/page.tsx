'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWasteRecord } from '@/lib/actions/waste'
import Link from 'next/link'

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
        <Link href="/admin/environment/waste" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">Nouveau enregistrement déchet</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois *</label>
            <select name="month" required defaultValue={currentMonth}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
                .map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
            <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de déchet *</label>
            <select name="wasteType" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité (kg)</label>
            <input name="quantityKg" type="number" step="0.1" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode d'élimination *</label>
            <select name="disposal" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner…</option>
              <option value="tri_selectif">Tri sélectif</option>
              <option value="collecte_municipale">Collecte municipale</option>
              <option value="prestataire_agree">Prestataire agréé</option>
              <option value="incineration">Incinération</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prestataire</label>
            <input name="contractor" type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coût (TND)</label>
            <input name="cost" type="number" step="0.001" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/admin/environment/waste"
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-center text-gray-600 hover:bg-gray-50">
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
