'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'materiel_environnement', label: 'Matériel environnement' },
  { value: 'materiel_evenementiel', label: 'Matériel événementiel' },
  { value: 'confort', label: 'Confort' },
]

type LogItem = {
  id: string
  category: string
  itemName: string
  quantityPlanned: number | null
  quantityActual: number | null
  unit: string | null
  supplier: string | null
  cost: string | null
  notes: string | null
}

export function LogistiqueTab({
  eventId,
  logistics,
  canEdit,
}: {
  eventId: string
  logistics: LogItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [localItems, setLocalItems] = useState(logistics)
  const [saving, setSaving] = useState(false)

  function updateItem(idx: number, patch: Partial<LogItem>) {
    setLocalItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function addItem(category: string) {
    setLocalItems((prev) => [
      ...prev,
      { id: '', category, itemName: '', quantityPlanned: null, quantityActual: null, unit: null, supplier: null, cost: null, notes: null },
    ])
  }

  function removeItem(idx: number) {
    setLocalItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/rse/events/${eventId}/logistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: localItems.map((it) => ({
          category: it.category,
          itemName: it.itemName,
          quantityPlanned: it.quantityPlanned,
          quantityActual: it.quantityActual,
          unit: it.unit,
          supplier: it.supplier,
          cost: it.cost ? String(it.cost) : null,
          notes: it.notes,
        })),
      }),
    })
    setSaving(false)
    if (res.ok) { setEditMode(false); router.refresh() }
  }

  const grandTotal = localItems.reduce((sum, it) => sum + (parseFloat(String(it.cost ?? '0')) || 0), 0)

  const fieldStyle = { background: 'var(--admin-bg)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
          Total estimé : <span style={{ color: 'var(--admin-emerald)' }}>{grandTotal.toFixed(3)} DT</span>
        </p>
        {canEdit && (
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-sm"
            style={{ color: 'var(--admin-emerald)' }}
          >
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        const catIndices = localItems
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it.category === cat.value)
          .map(({ i }) => i)

        const catTotal = catIndices.reduce(
          (sum, i) => sum + (parseFloat(String(localItems[i].cost ?? '0')) || 0),
          0
        )

        return (
          <div key={cat.value} className="rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--admin-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{cat.label}</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{catTotal.toFixed(3)} DT</span>
                {editMode && (
                  <button onClick={() => addItem(cat.value)} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                    + Ajouter
                  </button>
                )}
              </div>
            </div>

            {catIndices.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun article</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                {catIndices.map((absIdx) => {
                  const item = localItems[absIdx]
                  if (editMode) {
                    return (
                      <div key={absIdx} className="p-3 grid gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto' }}>
                        <input value={item.itemName} onChange={(e) => updateItem(absIdx, { itemName: e.target.value })} className="px-2 py-1 rounded border text-xs" style={fieldStyle} placeholder="Article" />
                        <input type="number" value={item.quantityPlanned ?? ''} onChange={(e) => updateItem(absIdx, { quantityPlanned: e.target.value ? Number(e.target.value) : null })} className="px-2 py-1 rounded border text-xs" style={fieldStyle} placeholder="Qté" />
                        <input type="number" value={item.quantityActual ?? ''} onChange={(e) => updateItem(absIdx, { quantityActual: e.target.value ? Number(e.target.value) : null })} className="px-2 py-1 rounded border text-xs" style={fieldStyle} placeholder="Qté réelle" />
                        <input value={item.unit ?? ''} onChange={(e) => updateItem(absIdx, { unit: e.target.value })} className="px-2 py-1 rounded border text-xs" style={fieldStyle} placeholder="Unité" />
                        <input type="number" value={item.cost ?? ''} onChange={(e) => updateItem(absIdx, { cost: e.target.value || null })} className="px-2 py-1 rounded border text-xs" style={fieldStyle} placeholder="Coût DT" />
                        <button onClick={() => removeItem(absIdx)} className="text-xs px-1" style={{ color: 'var(--admin-red)' }}>×</button>
                      </div>
                    )
                  }
                  return (
                    <div key={absIdx} className="px-4 py-3 flex items-center gap-4 text-sm">
                      <span className="flex-1 font-medium" style={{ color: 'var(--admin-text)' }}>{item.itemName}</span>
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {item.quantityActual != null ? `${item.quantityActual}` : item.quantityPlanned != null ? `${item.quantityPlanned}` : '—'}
                        {item.unit ? ` ${item.unit}` : ''}
                      </span>
                      {item.supplier && <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.supplier}</span>}
                      <span className="text-xs font-medium" style={{ color: item.cost ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
                        {item.cost ? `${parseFloat(String(item.cost)).toFixed(3)} DT` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {editMode && (
        <div className="flex justify-end gap-2">
          <button onClick={() => { setLocalItems(logistics); setEditMode(false) }} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--admin-emerald)', color: '#fff' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}
