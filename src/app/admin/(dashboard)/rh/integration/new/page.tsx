'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createIntegrationPlanAction } from '@/lib/actions/rh'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }

type PlanItem = { theme: string; responsible: string; plannedDate: string; status: string }

const DEFAULT_ITEMS: PlanItem[] = [
  { theme: 'Accueil et présentation de l\'entreprise', responsible: '', plannedDate: '', status: 'pending' },
  { theme: 'Présentation du SMQ et des procédures qualité', responsible: '', plannedDate: '', status: 'pending' },
  { theme: 'Présentation du poste et des missions', responsible: '', plannedDate: '', status: 'pending' },
  { theme: 'Formation aux outils et logiciels', responsible: '', plannedDate: '', status: 'pending' },
  { theme: 'Visite des sites / chantiers', responsible: '', plannedDate: '', status: 'pending' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Réalisé' },
]

export default function NewIntegrationPlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<PlanItem[]>(DEFAULT_ITEMS)

  function addItem() { setItems([...items, { theme: '', responsible: '', plannedDate: '', status: 'pending' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof PlanItem, val: string) {
    setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = { items }
    fd.forEach((v, k) => { if (v) data[k] = v })
    const result = await createIntegrationPlanAction(data)
    if (result.success) {
      router.push('/admin/rh/integration')
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/integration" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Nouveau plan d'intégration</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>PLA-RH-01</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de début prévue</label>
              <input name="plannedStartDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de fin prévue</label>
              <input name="plannedEndDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Étapes du plan</span>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
              <Plus size={12} /> Ajouter une étape
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Thème / Activité', 'Responsable', 'Date prévue', 'Statut', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2">
                      <input type="text" value={item.theme} onChange={e => updateItem(i, 'theme', e.target.value)}
                        className="w-full rounded border px-2 py-1 text-xs" style={inputStyle} placeholder="Thème..." />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.responsible} onChange={e => updateItem(i, 'responsible', e.target.value)}
                        className="w-32 rounded border px-2 py-1 text-xs" style={inputStyle} placeholder="Responsable" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" value={item.plannedDate} onChange={e => updateItem(i, 'plannedDate', e.target.value)}
                        className="rounded border px-2 py-1 text-xs" style={inputStyle} />
                    </td>
                    <td className="px-3 py-2">
                      <select value={item.status} onChange={e => updateItem(i, 'status', e.target.value)}
                        className="rounded border px-2 py-1 text-xs" style={inputStyle}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItem(i)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Créer le plan'}
          </button>
          <Link href="/admin/rh/integration" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
