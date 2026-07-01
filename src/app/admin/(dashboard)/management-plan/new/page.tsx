'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createManagementActivity } from '@/lib/actions/management-plan'
import Link from 'next/link'

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH']

export default function NewManagementActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])

  function toggleWeek(w: number) {
    setSelectedWeeks((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createManagementActivity({
      year: parseInt(fd.get('year') as string),
      dept: fd.get('dept') as string,
      objective: fd.get('objective') as string,
      action: fd.get('action') as string,
      responsible: fd.get('responsible') as string || undefined,
      plannedWeeks: selectedWeeks,
    })

    if (result.success) {
      router.push('/admin/management-plan')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/management-plan" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle activité</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
              <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectif *</label>
            <input name="objective" type="text" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
            <textarea name="action" required rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
            <input name="responsible" type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Week picker */}
        <div className="bg-white border rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Semaines planifiées ({selectedWeeks.length} sélectionnées)
          </label>
          <div className="grid grid-cols-13 gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {weeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleWeek(w)}
                className={`h-8 rounded text-xs font-medium transition-colors ${
                  selectedWeeks.includes(w)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Cliquer sur les semaines pour les sélectionner</p>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3">
          <Link href="/admin/management-plan"
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
