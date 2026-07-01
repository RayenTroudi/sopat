'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRiskOpportunity } from '@/lib/actions/risks-opportunities'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'contexte_interne', label: 'Contexte interne' },
  { value: 'contexte_externe', label: 'Contexte externe' },
  { value: 'partie_interessee', label: 'Partie intéressée' },
  { value: 'processus', label: 'Processus' },
  { value: 'environnement', label: 'Environnement' },
  { value: 'autre', label: 'Autre' },
]

export default function NewRiskOpportunityPage() {
  const router = useRouter()
  const [type, setType] = useState<'risk' | 'opportunity'>('risk')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createRiskOpportunity({
      type,
      category: fd.get('category') as string,
      description: fd.get('description') as string,
      context: fd.get('context') as string || undefined,
      gravity: type === 'risk' && fd.get('gravity') ? Number(fd.get('gravity')) : undefined,
      probability: type === 'risk' && fd.get('probability') ? Number(fd.get('probability')) : undefined,
      priority: type === 'opportunity' && fd.get('priority') ? Number(fd.get('priority')) : undefined,
      importance: type === 'opportunity' && fd.get('importance') ? Number(fd.get('importance')) : undefined,
      owner: fd.get('owner') as string || undefined,
      targetDate: fd.get('targetDate') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/risks-opportunities')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/risks-opportunities" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nouveau Risque / Opportunité</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        {/* Type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('risk')}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                type === 'risk'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              Risque
            </button>
            <button
              type="button"
              onClick={() => setType('opportunity')}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                type === 'opportunity'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              Opportunité
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie *
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionner…</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Décrire le risque ou l'opportunité…"
          />
        </div>

        {/* Context */}
        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
            Source / Contexte
          </label>
          <input
            id="context"
            name="context"
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Origine du risque ou de l'opportunité"
          />
        </div>

        {/* Scoring — risk */}
        {type === 'risk' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gravity" className="block text-sm font-medium text-gray-700 mb-1">
                Gravité (1–4)
              </label>
              <select
                id="gravity"
                name="gravity"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="probability" className="block text-sm font-medium text-gray-700 mb-1">
                Probabilité (1–4)
              </label>
              <select
                id="probability"
                name="probability"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Scoring — opportunity */}
        {type === 'opportunity' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priorité (1–4)
              </label>
              <select
                id="priority"
                name="priority"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="importance" className="block text-sm font-medium text-gray-700 mb-1">
                Importance (1–4)
              </label>
              <select
                id="importance"
                name="importance"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Owner + date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <input
              id="owner"
              name="owner"
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom ou fonction"
            />
          </div>
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date cible
            </label>
            <input
              id="targetDate"
              name="targetDate"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/risks-opportunities"
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-center text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
