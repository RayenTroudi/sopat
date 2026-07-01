'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitHseChecklist } from '@/lib/actions/hse'
import Link from 'next/link'

type HseItem = {
  id: string
  code: string
  description: string
  category: string | null
  sortOrder: number
}

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH']

export function HseSubmissionForm({ items }: { items: HseItem[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    items.forEach((item) => { initial[item.id] = true })
    return initial
  })
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await submitHseChecklist({
      submittedDate: fd.get('submittedDate') as string,
      dept: fd.get('dept') as string,
      notes: fd.get('notes') as string || undefined,
      answers: items.map((item) => ({
        itemId: item.id,
        isCompliant: answers[item.id] ?? true,
        comment: comments[item.id] || undefined,
      })),
    })

    if (result.success) {
      router.push('/admin/environment/hse-checklist')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[]
  const conformeCount = Object.values(answers).filter(Boolean).length
  const total = items.length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/environment/hse-checklist" className="text-gray-400 hover:text-gray-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle soumission HSE</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input name="submittedDate" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département *</label>
              <select name="dept" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes générales</label>
              <textarea name="notes" rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(conformeCount / total) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 flex-shrink-0">
              {conformeCount}/{total} conformes
            </span>
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat} className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700">{cat}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {items.filter((i) => i.category === cat).map((item) => (
                <div key={item.id} className={`px-4 py-3 ${answers[item.id] === false ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex gap-2 flex-shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [item.id]: true }))}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                          answers[item.id] === true
                            ? 'bg-green-500 text-white border-green-500'
                            : 'border-gray-300 text-gray-400 hover:border-green-400'
                        }`}
                      >✓</button>
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [item.id]: false }))}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                          answers[item.id] === false
                            ? 'bg-red-500 text-white border-red-500'
                            : 'border-gray-300 text-gray-400 hover:border-red-400'
                        }`}
                      >✗</button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-mono text-xs text-gray-400 mr-1">{item.code}</span>
                        {item.description}
                      </p>
                      {answers[item.id] === false && (
                        <input
                          type="text"
                          placeholder="Commentaire (optionnel)"
                          value={comments[item.id] ?? ''}
                          onChange={(e) => setComments((c) => ({ ...c, [item.id]: e.target.value }))}
                          className="mt-1 w-full border border-red-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            Aucun point de contrôle HSE configuré. Contactez l&apos;administrateur pour initialiser les items.
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">{error}</p>}

        <div className="flex gap-3">
          <Link href="/admin/environment/hse-checklist"
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-center text-gray-600 hover:bg-gray-50">
            Annuler
          </Link>
          <button type="submit" disabled={loading || total === 0}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Soumettre la checklist'}
          </button>
        </div>
      </form>
    </div>
  )
}
