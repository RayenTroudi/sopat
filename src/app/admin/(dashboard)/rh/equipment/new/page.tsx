'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createEquipmentReceiptAction } from '@/lib/actions/rh'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }

type Item = { description: string; quantity: number; serialNumber: string }

export default function NewEquipmentReceiptPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, serialNumber: '' }])

  function addItem() { setItems([...items, { description: '', quantity: 1, serialNumber: '' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof Item, val: string | number) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = { items }
    fd.forEach((v, k) => { if (v) data[k] = v })
    const result = await createEquipmentReceiptAction(data)
    if (result.success) {
      router.push('/admin/rh/equipment')
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/equipment" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Nouveau reçu de matériel</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-28</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de remise *</label>
            <input name="issuedDate" type="date" required className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Articles remis</span>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
              <Plus size={12} /> Ajouter un article
            </button>
          </div>
          <div className="p-4 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input type="text" placeholder="Description de l'article *" value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    className={inputClass} style={inputStyle} required />
                </div>
                <div className="w-20">
                  <input type="number" min={1} value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                    className={inputClass} style={inputStyle} title="Quantité" />
                </div>
                <div className="w-36">
                  <input type="text" placeholder="N° série" value={item.serialNumber}
                    onChange={e => updateItem(i, 'serialNumber', e.target.value)}
                    className={inputClass} style={inputStyle} />
                </div>
                <button type="button" onClick={() => removeItem(i)} className="mt-2">
                  <Trash2 size={16} style={{ color: '#ef4444' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Enregistrer le reçu'}
          </button>
          <Link href="/admin/rh/equipment" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
