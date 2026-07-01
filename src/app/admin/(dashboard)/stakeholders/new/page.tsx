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
        <Link href="/admin/stakeholders" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle Partie Intéressée</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              name="name"
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="type"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner…</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Besoins &amp; Attentes</label>
            <textarea
              name="needs"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* PIP scoring */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Évaluation influence / interaction</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Influence (1–4)</label>
              <select
                value={influence}
                onChange={(e) => setInfluence(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Interaction (1–4)</label>
              <select
                value={interaction}
                onChange={(e) => setInteraction(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isPip ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isPip ? 'PIP — Partie à Influence Particulière' : 'Non PIP'}
            </span>
            <span className="text-xs text-gray-400">(influence ≥ 2 ET interaction ≥ 2)</span>
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Contact (optionnel)</p>
          <div className="grid grid-cols-3 gap-3">
            <input name="contactName" type="text" placeholder="Nom" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input name="contactEmail" type="email" placeholder="Email" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input name="contactPhone" type="text" placeholder="Tél." className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/admin/stakeholders" className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-center text-gray-600 hover:bg-gray-50">
            Annuler
          </Link>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
