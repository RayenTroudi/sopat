'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRegulatoryEntry } from '@/lib/actions/regulatory-watch'
import Link from 'next/link'

export default function NewRegulatoryEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createRegulatoryEntry({
      reference: fd.get('reference') as string || undefined,
      title: fd.get('title') as string,
      domain: fd.get('domain') as string || undefined,
      issuingBody: fd.get('issuingBody') as string || undefined,
      publicationDate: fd.get('publicationDate') as string || undefined,
      effectiveDate: fd.get('effectiveDate') as string || undefined,
      status: fd.get('status') as string,
      complianceNotes: fd.get('complianceNotes') as string || undefined,
      nextReviewDate: fd.get('nextReviewDate') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/regulatory-watch')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/regulatory-watch" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nouveau texte réglementaire</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
            <input name="reference" type="text" placeholder="ex: Loi 2024-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
            <select name="status" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="applicable">Applicable</option>
              <option value="en_veille">En veille</option>
              <option value="non_applicable">Non applicable</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
          <input name="title" type="text" required
            placeholder="Intitulé complet du texte réglementaire"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domaine</label>
            <input name="domain" type="text" placeholder="ex: Environnement, Sécurité"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisme émetteur</label>
            <input name="issuingBody" type="text" placeholder="ex: Ministère de l'Environnement"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de publication</label>
            <input name="publicationDate" type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée en vigueur</label>
            <input name="effectiveDate" type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes de conformité</label>
          <textarea name="complianceNotes" rows={3}
            placeholder="Comment SOPAT se conforme à ce texte…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine date de révision</label>
          <input name="nextReviewDate" type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/admin/regulatory-watch"
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
