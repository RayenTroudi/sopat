'use client'

import { useState } from 'react'
import type { WizardDraft } from '../EventWizard'

const CATEGORIES = [
  { value: 'materiel_environnement', label: 'Matériel environnement' },
  { value: 'materiel_evenementiel', label: 'Matériel événementiel' },
  { value: 'confort', label: 'Confort' },
]

type LogisticItem = {
  category: string
  itemName: string
  quantityPlanned: string
  unit: string
  supplier: string
  cost: string
  notes: string
}

const emptyItem = (category: string): LogisticItem => ({
  category,
  itemName: '',
  quantityPlanned: '',
  unit: '',
  supplier: '',
  cost: '',
  notes: '',
})

export function Step3Logistics({
  draft,
  onBack,
  onNext,
}: {
  draft: WizardDraft
  onBack: () => void
  onNext: (data: Partial<WizardDraft>) => void
}) {
  const [items, setItems] = useState<LogisticItem[]>(
    (draft.logistics ?? []) as LogisticItem[]
  )

  function addItem(category: string) {
    setItems((prev) => [...prev, emptyItem(category)])
  }

  function updateItem(idx: number, patch: Partial<LogisticItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const fieldStyle = {
    background: 'var(--admin-surface)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Étape 3 — Logistique
      </h2>

      {CATEGORIES.map((cat) => {
        const catItems = items.filter((it) => it.category === cat.value)
        const catIndices = items
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it.category === cat.value)
          .map(({ i }) => i)

        return (
          <div key={cat.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                {cat.label}
              </h3>
              <button
                onClick={() => addItem(cat.value)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
              >
                + Ajouter
              </button>
            </div>

            {catIndices.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucun élément</p>
            ) : (
              <div className="space-y-2">
                {catIndices.map((absIdx) => {
                  const item = items[absIdx]
                  return (
                    <div
                      key={absIdx}
                      className="grid gap-2 p-3 rounded-lg border"
                      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto' }}
                    >
                      <input
                        value={item.itemName}
                        onChange={(e) => updateItem(absIdx, { itemName: e.target.value })}
                        className="px-2 py-1 rounded border text-xs"
                        style={fieldStyle}
                        placeholder="Article"
                      />
                      <input
                        type="number"
                        value={item.quantityPlanned}
                        onChange={(e) => updateItem(absIdx, { quantityPlanned: e.target.value })}
                        className="px-2 py-1 rounded border text-xs"
                        style={fieldStyle}
                        placeholder="Qté"
                        min={0}
                      />
                      <input
                        value={item.unit}
                        onChange={(e) => updateItem(absIdx, { unit: e.target.value })}
                        className="px-2 py-1 rounded border text-xs"
                        style={fieldStyle}
                        placeholder="Unité"
                      />
                      <input
                        value={item.supplier}
                        onChange={(e) => updateItem(absIdx, { supplier: e.target.value })}
                        className="px-2 py-1 rounded border text-xs"
                        style={fieldStyle}
                        placeholder="Fournisseur"
                      />
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => updateItem(absIdx, { cost: e.target.value })}
                        className="px-2 py-1 rounded border text-xs"
                        style={fieldStyle}
                        placeholder="Coût (DT)"
                        min={0}
                        step="0.001"
                      />
                      <button
                        onClick={() => removeItem(absIdx)}
                        className="px-1.5 rounded text-xs"
                        style={{ color: 'var(--admin-red)' }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext({ logistics: items })}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
