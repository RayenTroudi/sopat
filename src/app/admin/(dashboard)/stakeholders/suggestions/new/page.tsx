'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStaffSuggestion } from '@/lib/actions/stakeholders'
import Link from 'next/link'

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH'] as const

export default function NewStaffSuggestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await addStaffSuggestion({
      date: fd.get('date') as string,
      dept: fd.get('dept') as string,
      suggestionText: fd.get('suggestionText') as string,
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
        <Link href="/admin/stakeholders" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle suggestion / remontée terrain</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Département *</label>
            <select name="dept" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suggestion / Remontée *</label>
          <textarea name="suggestionText" required rows={5}
            placeholder="Décrire la suggestion, observation ou remontée terrain..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/admin/stakeholders"
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
