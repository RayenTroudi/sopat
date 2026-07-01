'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCommunicationEntry } from '@/lib/actions/management-plan'
import Link from 'next/link'

export default function NewCommunicationEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createCommunicationEntry({
      year: parseInt(fd.get('year') as string),
      direction: fd.get('direction') as string,
      subject: fd.get('subject') as string,
      target: fd.get('target') as string || undefined,
      channel: fd.get('channel') as string || undefined,
      frequency: fd.get('frequency') as string || undefined,
      responsible: fd.get('responsible') as string || undefined,
      plannedDate: fd.get('plannedDate') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/management-plan')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/management-plan" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle entrée — Plan de communication</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
            <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction *</label>
            <select name="direction" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="interne">Interne</option>
              <option value="externe">Externe</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
          <input name="subject" type="text" required placeholder="Ex: Réunion de revue de direction"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cible / Destinataire</label>
            <input name="target" type="text" placeholder="Ex: Équipe, Direction, Clients..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
            <input name="channel" type="text" placeholder="Ex: Réunion, Email, Affichage..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
            <input name="frequency" type="text" placeholder="Ex: Mensuel, Trimestriel..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
            <input name="responsible" type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date prévue</label>
          <input name="plannedDate" type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
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
