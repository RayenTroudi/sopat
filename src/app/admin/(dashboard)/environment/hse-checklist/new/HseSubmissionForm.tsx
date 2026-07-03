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

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

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
        <Link href="/admin/environment/hse-checklist" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle soumission HSE
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Date *</label>
              <input name="submittedDate" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
                className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Département *</label>
              <select name="dept" required className={inputClass} style={inputStyle}>
                {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Notes générales</label>
              <textarea name="notes" rows={2} className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-full h-2" style={{ background: 'var(--admin-border)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${(conformeCount / total) * 100}%`, background: 'var(--green)' }}
              />
            </div>
            <span className="text-[13px] flex-shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
              {conformeCount}/{total} conformes
            </span>
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-2" style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-[12px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>{cat}</h3>
            </div>
            <div>
              {items.filter((i) => i.category === cat).map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3"
                  style={{
                    borderTop: '1px solid var(--admin-border)',
                    background: answers[item.id] === false ? 'var(--admin-red-dim)' : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex gap-2 flex-shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [item.id]: true }))}
                        className="w-8 h-8 rounded-lg text-xs font-bold border transition-opacity hover:opacity-80"
                        style={answers[item.id] === true
                          ? { background: 'var(--green)', color: 'var(--ivory)', borderColor: 'transparent' }
                          : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
                        }
                      >✓</button>
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [item.id]: false }))}
                        className="w-8 h-8 rounded-lg text-xs font-bold border transition-opacity hover:opacity-80"
                        style={answers[item.id] === false
                          ? { background: 'var(--admin-red)', color: '#fff', borderColor: 'transparent' }
                          : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
                        }
                      >✗</button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
                        <span className="font-mono text-[10px] mr-1" style={{ color: 'var(--admin-text-muted)' }}>{item.code}</span>
                        {item.description}
                      </p>
                      {answers[item.id] === false && (
                        <input
                          type="text"
                          placeholder="Commentaire (optionnel)"
                          value={comments[item.id] ?? ''}
                          onChange={(e) => setComments((c) => ({ ...c, [item.id]: e.target.value }))}
                          className="mt-1 w-full rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--admin-red)]"
                          style={{ border: '1px solid var(--admin-red)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
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
          <div className="rounded-xl px-4 py-4 text-sm" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
            Aucun point de contrôle HSE configuré. Contactez l&apos;administrateur pour initialiser les items.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/environment/hse-checklist"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)' }}
          >
            Annuler
          </Link>
          <button type="submit" disabled={loading || total === 0}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Enregistrement…' : 'Soumettre la checklist'}
          </button>
        </div>
      </form>
    </div>
  )
}
